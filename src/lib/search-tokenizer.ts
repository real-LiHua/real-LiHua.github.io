import { createTokenizer } from "@orama/tokenizers/mandarin";
import { stopwords as mandarinStopwords } from "@orama/stopwords/mandarin";

const stopWordSet = new Set(mandarinStopwords);

export function createSearchTokenizer() {
  const tokenizer = createTokenizer();

  return {
    ...tokenizer,
    stopWords: mandarinStopwords,
    // Orama calls this with (raw, language, prop, withCache); the extra
    // argument is intentionally not declared here.
    tokenize(raw: string, language?: string, prop?: string): string[] {
      const tokens = tokenizer.tokenize(raw, language, prop);

      // Keep particles in the index so a query made only of stop words can
      // still match. Only strip them from queries that contain stronger terms.
      if (prop !== undefined) {
        return tokens;
      }

      const filtered = tokens.filter((token) => !stopWordSet.has(token));
      return filtered.length > 0 ? filtered : tokens;
    },
  };
}
