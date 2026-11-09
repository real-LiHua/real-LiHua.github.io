import * as orama from "@orama/orama-real";
import { createSearchTokenizer } from "./search-tokenizer";

/**
 * Client-side Orama entry used by the WebMCP client.
 *
 * `astro-webmcp` loads the serialized index with a default English tokenizer, which cannot segment
 * Mandarin queries. Inject the same tokenizer that built the index so agent searches match the
 * site's own search results.
 */
export * from "@orama/orama-real";

export function create(options: Parameters<typeof orama.create>[0]) {
  return orama.create({
    ...options,
    components: options?.components ?? { tokenizer: createSearchTokenizer() },
  });
}
