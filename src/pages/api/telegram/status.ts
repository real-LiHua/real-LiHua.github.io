import type { APIRoute } from "astro";
import { getSecret } from "astro:env/server";

export const prerender = false;

interface SessionData {
  token: string;
  userId: number;
  postId: string;
  expiresAt: number;
  groupVerified: boolean;
}

interface CloudflareEnv {
  TG_AUTH_KV?: KVNamespace;
}

interface KVNamespace {
  get(key: string, type: "json"): Promise<SessionData | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

export const GET: APIRoute = async ({ request, locals }) => {
  const postId = new URL(request.url).searchParams.get("postId");
  const authHeader = request.headers.get("Authorization");

  if (!postId) {
    return new Response(JSON.stringify({ error: "postId required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // In production, use Cloudflare KV to store/retrieve session data
  // For now, check if there's a valid session in KV
  const env = (locals as any).runtime?.env as CloudflareEnv | undefined;
  const kv = env?.TG_AUTH_KV;

  if (kv) {
    try {
      const sessionKey = `tg_auth:${postId}`;
      const stored = await kv.get(sessionKey, "json") as SessionData | null;

      if (stored && stored.expiresAt > Date.now()) {
        return new Response(JSON.stringify({
          authenticated: true,
          token: stored.token,
          userId: stored.userId,
          expiresIn: Math.ceil((stored.expiresAt - Date.now()) / 1000),
        }), {
          headers: { "Content-Type": "application/json" },
        });
      }
    } catch (e) {
      console.error("KV read error:", e);
    }
  }

  // Fallback: check for token in Authorization header
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    // Verify JWT token
    const isValid = await verifyToken(token, postId);
    if (isValid) {
      return new Response(JSON.stringify({
        authenticated: true,
        token,
        userId: isValid.userId,
        expiresIn: Math.ceil((isValid.expiresAt - Date.now()) / 1000),
      }), {
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  return new Response(JSON.stringify({ authenticated: false }), {
    headers: { "Content-Type": "application/json" },
  });
};

async function verifyToken(token: string, postId: string): Promise<{ userId: number; expiresAt: number } | null> {
  try {
    const secret = getSecret("JWT_SECRET") || "dev-secret-change-in-production";
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify", "sign"]
    );

    const [headerB64, payloadB64, signatureB64] = token.split(".");
    if (!headerB64 || !payloadB64 || !signatureB64) return null;

    const data = `${headerB64}.${payloadB64}`;
    const signature = base64UrlToUint8Array(signatureB64);
    const valid = await crypto.subtle.verify("HMAC", key, signature, new TextEncoder().encode(data).buffer);

    if (!valid) return null;

    const payload = JSON.parse(base64UrlDecode(payloadB64));
    if (payload.postId !== postId) return null;
    if (payload.exp < Date.now() / 1000) return null;

    return { userId: payload.userId, expiresAt: payload.exp * 1000 };
  } catch {
    return null;
  }
}

function base64UrlToUint8Array(str: string): Uint8Array {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = base64.length % 4;
  const padded = base64 + (pad ? "=".repeat(4 - pad) : "");
  const binary = atob(padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

function base64UrlDecode(str: string): string {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = base64.length % 4;
  const padded = base64 + (pad ? "=".repeat(4 - pad) : "");
  return decodeURIComponent(atob(padded).split("").map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)).join(""));
}