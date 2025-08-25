export const prerender = false;

import type { APIRoute } from "astro";
import { Api } from "grammy";
import { autoRetry } from "@grammyjs/auto-retry";
import { getSecret } from "astro:env/server";

const bot = new Api(getSecret("BOT_TOKEN") ?? "");
const pri_key = getSecret("PRI_KEY") ?? "";
const CHAT_ID = getSecret("CHAT_ID") ?? "";

bot.config.use(autoRetry({ maxRetryAttempts: 1, maxDelaySeconds: 5 }));

export const POST: APIRoute = async ({ request }) => {
  return new Response(
    await crypto.subtle.encrypt(
      { name: "RSA-OAEP" },
      await crypto.subtle.importKey(
        "jwk",
        (await request.json()) as JsonWebKey,
        { name: "RSA-OAEP", hash: "SHA-256" },
        false,
        ["encrypt"],
      ),
      new TextEncoder().encode("114514"),
    ),
    { headers: { "Access-Control-Allow-Origin": "*" } },
  );

  await bot.createChatInviteLink(CHAT_ID, {
    expire_date: Math.floor(Date.now() / 1000) + 3600,
    member_limit: 1,
  });
};
