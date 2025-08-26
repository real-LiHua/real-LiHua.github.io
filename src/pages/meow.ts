export const prerender = false;

import answer from "the-answer";
import type { APIRoute } from "astro";
import { Api } from "grammy";
import { autoRetry } from "@grammyjs/auto-retry";
import { Gaxios } from "gaxios";
import { getSecret } from "astro:env/server";
import { PinataSDK } from "pinata";

const bot = new Api(getSecret("BOT_TOKEN") ?? "");
const chat_id = getSecret("CHAT_ID") ?? "";
bot.config.use(autoRetry({ maxRetryAttempts: 1, maxDelaySeconds: 5 }));

const gaxios = new Gaxios();
gaxios.defaults = { retry: true };

const pinataJwt = getSecret("PINATA_JWT") ?? "";
const pinataGateway = getSecret("PINATA_GATEWAY") ?? "";
const pinata = new PinataSDK({ pinataJwt, pinataGateway });

export const POST: APIRoute = async ({ request }) => {
  const aesKey = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt", "wrapKey"],
  );

  const rsaKey = await crypto.subtle.importKey(
    "jwk",
    (await request.json()) as JsonWebKey,
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["wrapKey"],
  );

  const upload = await pinata.upload.public.base64(
    Buffer.from(
      await crypto.subtle.wrapKey("jwk", aesKey, rsaKey, {
        name: "RSA-OAEP",
      }),
    ).toString("base64"),
  );

  await gaxios.request({ url: `https://ipfs.io/ipfs/${upload.cid}` });

  await pinata.files.public.delete([upload.id]);

  return new Response(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: new Uint8Array([answer]) },
      aesKey,
      new TextEncoder().encode("114514"),
    ),
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "x-ipfs-path": `/ipfs/${upload.cid}`,
      },
    },
  );

  await bot.createChatInviteLink(chat_id, {
    expire_date: Math.floor(Date.now() / 1000) + 3600,
    member_limit: 1,
  });
};
