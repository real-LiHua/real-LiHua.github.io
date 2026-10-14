import type { APIRoute } from "astro";
import { telegramAuth } from "@/modules/telegram-auth";

export const prerender = false;

const readCookie = (header: string | null, name: string): string | undefined => {
  if (!header) {
    return undefined;
  }
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) {
      return rest.join("=");
    }
  }
  return undefined;
};

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const postId = url.searchParams.get("post") ?? "";
  const secret = process.env.TG_AUTH_SECRET ?? "";
  const token = readCookie(request.headers.get("cookie"), telegramAuth.cookieName(postId));
  const status = secret ? await telegramAuth.verify(token, secret) : null;

  return Response.json(
    { verified: Boolean(status?.verified) },
    { headers: { "cache-control": "no-store" } },
  );
};
