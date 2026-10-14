import type { APIRoute } from "astro";
import { telegramAuth } from "@/modules/telegram-auth";

export const prerender = false;

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;

const authorize = async (token: string | null, postId: string): Promise<Response> => {
  const secret = process.env.TG_AUTH_SECRET ?? "";
  if (!secret || !token || !postId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const status = await telegramAuth.verify(token, secret);
  if (!status?.verified) {
    return new Response("Unauthorized", { status: 401 });
  }

  const headers = new Headers({ location: `/posts/${postId}/` });
  headers.append(
    "set-cookie",
    `${telegramAuth.cookieName(postId)}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${TOKEN_TTL_SECONDS}`,
  );
  return new Response(null, { status: 302, headers });
};

// The bot redirects members here with the issued token in the query string.
export const GET: APIRoute = ({ request }) => {
  const url = new URL(request.url);
  return authorize(url.searchParams.get("token"), url.searchParams.get("post") ?? "");
};

// Optionally accept a JSON POST body from a Mini App.
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = (await request.json()) as { token?: string; postId?: string };
    return authorize(body.token ?? null, body.postId ?? "");
  } catch {
    return new Response("Bad Request", { status: 400 });
  }
};
