export const prerender = false;

import answer from "the-answer";
import type { APIRoute } from "astro";
import { Api } from "grammy";
import { autoRetry } from "@grammyjs/auto-retry";
import { Gaxios } from "gaxios";
import { getSecret } from "astro:env/server";
import { PinataSDK } from "pinata";

const bot = new Api(getSecret("BOT_TOKEN") ?? "");
bot.config.use(autoRetry({ maxDelaySeconds: 5, maxRetryAttempts: 1 }));

const gaxios = new Gaxios();
gaxios.defaults = { retry: true };

const pinataGateway = getSecret("PINATA_GATEWAY") ?? "";
const pinataJwt = getSecret("PINATA_JWT") ?? "";
const pinata = new PinataSDK({ pinataGateway, pinataJwt });

export const POST = (async ({ request }): Promise<Response> => {
  const aesKey = await crypto.subtle.generateKey({ length: 256, name: "AES-GCM" }, true, [
    "encrypt",
    "decrypt",
    "wrapKey",
  ]);

  const rsaKey = await crypto.subtle.importKey(
    "jwk",
    (await request.json()) as JsonWebKey,
    { hash: "SHA-256", name: "RSA-OAEP" },
    false,
    ["wrapKey"],
  );

  const wrappedKey = await crypto.subtle.wrapKey("jwk", aesKey, rsaKey, {
    name: "RSA-OAEP",
  });

  const upload = await pinata.upload.public.base64(Buffer.from(wrappedKey).toString("base64"));

  await gaxios.request({ url: `https://ipfs.io/ipfs/${upload.cid}` });

  await pinata.files.public.delete([upload.id]);

  const encrypted = await crypto.subtle.encrypt(
    { iv: new Uint8Array([answer]), name: "AES-GCM" },
    aesKey,
    new TextEncoder().encode("114514"),
  );

  return new Response(encrypted, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "x-ipfs-path": `/ipfs/${upload.cid}`,
    },
  });
}) satisfies APIRoute;
