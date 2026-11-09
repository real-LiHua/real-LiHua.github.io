import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { buildSearchIndex } from "../lib/search";

export const prerender = true;

export const GET: APIRoute = async () => {
  const posts = await getCollection("posts");
  const index = buildSearchIndex(posts);

  return new Response(JSON.stringify(index), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
};
