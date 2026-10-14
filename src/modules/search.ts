// Search Module — deep module.
//
// Owns the Pagefind configuration contract. The static index is produced by the
// build pipeline (see `src/modules/build-pipeline.ts`); this module only defines
// the defaults consumed by the search UI and the `pagefind.yaml` index config.
// (docs/adr/0006-pagefind-ui-approach.md, docs/SEARCH_TUNING.md)

import type { SearchConfig } from "./types";

export const SEARCH_DEFAULTS: Required<SearchConfig> = {
  bundlePath: "/pagefind/",
  placeholder: "搜索文章…",
  theme: "auto",
};

export interface SearchModule {
  /** Defaults applied when a caller omits fields. */
  defaults: Required<SearchConfig>;
  /** Merge caller options over the defaults. */
  resolve(config?: SearchConfig): Required<SearchConfig>;
}

export const searchModule: SearchModule = {
  defaults: SEARCH_DEFAULTS,

  resolve(config) {
    return { ...SEARCH_DEFAULTS, ...config };
  },
};
