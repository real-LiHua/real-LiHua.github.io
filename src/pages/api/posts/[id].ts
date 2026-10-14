import type { APIRoute } from "astro";
import { getCollection, render, type CollectionEntry } from "astro:content";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { telegramAuth } from "@/modules/telegram-auth";

export const prerender = false;

const json = (body: unknown, status = 200): Response =>
  Response.json(body, { status, headers: { "cache-control": "no-store" } });

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

// Returns the rendered article HTML. For protected posts the auth cookie must
// verify, so gated content is never baked into the static build or served to
// unverified visitors.
export const GET: APIRoute = async ({ params, request }) => {
  const id = params.id ?? "";
  const entry = (await getCollection("blog")).find(
    (item: CollectionEntry<"blog">) => item.id === id,
  );

  if (!entry) {
    return json({ error: "not_found" }, 404);
  }

  if (telegramAuth.requiresAuth(entry.data.telegramAuth)) {
    const secret = process.env.TG_AUTH_SECRET ?? "";
    const token = readCookie(request.headers.get("cookie"), telegramAuth.cookieName(id));
    const status = secret ? await telegramAuth.verify(token, secret) : null;
    if (!status?.verified) {
      return json({ error: "unauthorized" }, 401);
    }
  }

  const { Content, headings } = await render(entry);
  const container = await AstroContainer.create();
  const html = await container.renderToString(Content);

  return json({ id, html, headings });
};
