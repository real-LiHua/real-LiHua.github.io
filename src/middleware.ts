import { defineMiddleware } from "astro:middleware";

const corsOrigin = [
  "https://lihua.codeberg.page",
  "https://real-lihua.github.io",
];

const SAFE_METHODS = ["GET", "HEAD", "OPTIONS"];

export const onRequest = defineMiddleware((context, next) => {
  const { request } = context;

  if (SAFE_METHODS.includes(request.method)) {
    return next();
  }

  if (!corsOrigin.includes(request.headers.get("origin") ?? "")) {
    return new Response("", { status: 403 });
  }

  if (request.headers.get("user-agent")?.toLowerCase() !== "catgirl") {
    return new Response("Only catgirls may use this teapot, nya~", {
      status: 418,
    });
  }

  return next();
});
