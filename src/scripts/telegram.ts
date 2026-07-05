// eslint-disable-next-line id-length
import _ from "the-answer";

const PUBLIC_EXPONENT = new Uint8Array([1, 0, 1]);

const keyPair = (await globalThis.crypto.subtle.generateKey(
  {
    hash: "SHA-256",
    modulusLength: 2048,
    name: "RSA-OAEP",
    publicExponent: PUBLIC_EXPONENT,
  },
  true,
  ["wrapKey", "unwrapKey"],
)) as CryptoKeyPair;

const pubSpki = await globalThis.crypto.subtle.exportKey("jwk", keyPair.publicKey);

await fetch("https://blog.lihua0.workers.dev/meow", {
  body: JSON.stringify(pubSpki),
  method: "POST",
});
