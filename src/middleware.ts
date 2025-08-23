import { defineMiddleware } from "astro:middleware";

const corsOrigin = [
  "https://lihua.codeberg.page",
  "https://real-lihua.github.io",
];

export const onRequest = defineMiddleware((context, next) => {
  const { request } = context;

  if (!corsOrigin.includes(request.headers.get("origin"))) {
    return new Response("", { status: 404 });
  }

  if (request.headers.get("user-agent").toLowerCase() !== "catgirl") {
    return new Response("Only catgirl can use this teapot.", { status: 418 });
  }

  return next();
});
