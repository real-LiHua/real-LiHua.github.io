import { defineMiddleware } from "astro:middleware";

const corsOrigin = new Set([
  "https://lihua.codeberg.page",
  "https://real-lihua.github.io",
  "http://localhost:4321",
]);

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export const onRequest = defineMiddleware((context, next) => {
  const { request } = context;

  if (SAFE_METHODS.has(request.method)) {
    return next();
  }

  const origin = request.headers.get("origin") ?? "";
  if (!corsOrigin.has(origin)) {
    return new Response("", { status: 403 });
  }

  const userAgent = request.headers.get("user-agent");
  if (userAgent === null || userAgent.toLowerCase() !== "catgirl") {
    return new Response("Only catgirls may use this teapot, nya~", {
      status: 418,
    });
  }

  return next();
});
