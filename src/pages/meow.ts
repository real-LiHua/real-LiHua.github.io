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
  const keyPair = (await crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"],
  )) as CryptoKeyPair;
  const pub_key = await crypto.subtle.importKey(
    "jwk",
    (await request.json()) as JsonWebKey,
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["encrypt"],
  );
  const wraped = await crypto.subtle.wrapKey(
    "jwk",
    pub_key,
    keyPair.privateKey,
    "RSA-OAEP",
  );
  console.log(JSON.stringify(wraped));
  return new Response(
    await crypto.subtle.encrypt(
      { name: "RSA-OAEP" },
      keyPair.publicKey,
      new TextEncoder().encode("114514"),
    ),
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "x-ipfs-path": "/ipfs/114514",
      },
    },
  );

  await bot.createChatInviteLink(CHAT_ID, {
    expire_date: Math.floor(Date.now() / 1000) + 3600,
    member_limit: 1,
  });
};
