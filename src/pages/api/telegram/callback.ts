import type { APIRoute } from "astro";
import { getSecret } from "astro:env/server";

interface CloudflareEnv {
  TG_AUTH_KV?: KVNamespace;
}

interface KVNamespace {
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const startParam = url.searchParams.get("start");

  if (!startParam || !startParam.startsWith("auth_")) {
    return new Response("Invalid start parameter", { status: 400 });
  }

  const postId = startParam.slice(5); // Remove "auth_" prefix

  // This endpoint is called when user clicks the deep link
  // The actual verification happens via the bot
  // We redirect to the post page with a pending state

  const postUrl = `/posts/${postId}/?auth=pending`;
  return new Response(null, {
    status: 302,
    headers: { Location: postUrl },
  });
};

export const POST: APIRoute = async ({ request, locals }) => {
  // This endpoint receives verification result from the Telegram bot
  // Bot calls this after checking group membership

  const env = (locals as any).runtime?.env as CloudflareEnv | undefined;
  const kv = env?.TG_AUTH_KV;
  const botToken = getSecret("TELEGRAM_BOT_TOKEN");
  const jwtSecret = getSecret("JWT_SECRET") || "dev-secret-change-in-production";

  if (!botToken) {
    return new Response("Bot token not configured", { status: 500 });
  }

  try {
    const body = await request.json();
    const { userId, postId, verified } = body as {
      userId: number;
      postId: string;
      verified: boolean;
    };

    if (!userId || !postId || typeof verified !== "boolean") {
      return new Response("Invalid payload", { status: 400 });
    }

    if (!verified) {
      return new Response(JSON.stringify({ error: "User not in group" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Generate JWT token
    const token = await generateToken({ userId, postId }, jwtSecret);
    const expiresIn = 86400; // 24 hours
    const expiresAt = Date.now() + expiresIn * 1000;

    // Store in KV if available
    if (kv) {
      const sessionKey = `tg_auth:${postId}:${userId}`;
      await kv.put(sessionKey, JSON.stringify({
        token,
        userId,
        postId,
        expiresAt,
        groupVerified: true,
      }), { expirationTtl: expiresIn });
    }

    // Return token to bot (bot will send to user via Web App or message)
    return new Response(JSON.stringify({
      token,
      expiresIn,
      redirectUrl: `/posts/${postId}/?token=${token}&user_id=${userId}&expires_in=${expiresIn}`,
    }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Callback error:", error);
    return new Response("Internal server error", { status: 500 });
  }
};

async function generateToken(payload: { userId: number; postId: string }, secret: string): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    ...payload,
    iat: now,
    exp: now + 86400, // 24 hours
  };

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(claims));
  const data = `${headerB64}.${payloadB64}`;
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  const signatureB64 = base64UrlEncode(Array.from(new Uint8Array(signature)));

  return `${data}.${signatureB64}`;
}

function base64UrlEncode(input: string | number[]): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(input);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}