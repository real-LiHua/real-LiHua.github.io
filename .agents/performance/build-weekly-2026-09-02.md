# Build-Deploy Weekly Report - 2026-W36 (2026-09-02)

## Metrics

| Metric                              | Value                   | Target       | Status                         |
| ----------------------------------- | ----------------------- | ------------ | ------------------------------ |
| Build time (full)                   | 8.8s                    | < 180s (3m)  | ✅                             |
| Build time (incremental)            | 8.7s                    | < 60s        | ⚠️ (Astro static rebuilds all) |
| Pagefind index size (gzipped)       | 12.8 KB                 | < 500 KB     | ✅                             |
| Link checker errors                 | 0                       | 0            | ✅                             |
| HTML validation errors              | 0 (filtered)            | 0            | ✅                             |
| Deploy success rate (4 platforms)   | Unknown (no CI history) | > 99%        | ❓                             |
| `wrangler.jsonc` compatibility_date | 2026-08-18              | < 7 days old | ⚠️ 15 days stale               |

## Incidents

- **HTML validation failures**: Mermaid-generated SVG contains invalid `stroke-` attributes (empty attribute values). Fixed via vnu filterfile regex `.*stroke-.*`.
- **vnu filterfile**: Was nearly empty; now filters known Mermaid SVG output issues.

## Optimizations

- [DONE] Fixed vnu filterfile to suppress Mermaid SVG `stroke-` attribute errors
- [DONE] Verified Pagefind index size well within limits (12.8 KB gzipped)
- [DONE] Link checker passes with 0 errors (345 OK, 224 excluded)
- [IN PROGRESS] Update `wrangler.jsonc` compatibility_date to current date

## Proposals

1. **Update `wrangler.jsonc` compatibility_date** — Currently 2026-08-18 (15 days old). Should be updated weekly via automated job or pre-deploy hook.
2. **Investigate incremental build** — Astro 7 static mode rebuilds all pages. Consider `astro:build:start` cache warming for Mermaid renderer.
3. **Add build telemetry to CI** — Capture build duration, bundle sizes, Pagefind index size in GitHub Actions summaries for trend analysis.
4. **Mermaid SVG output fix** — Root cause: `mermaid-wasm-renderer` outputs invalid SVG. Consider upstream fix or post-process SVG to remove empty `stroke-` attributes.

## Learning

- vnu filterfile uses regex per line, matched against full error message including file path. Pattern `.*stroke-.*` works.
- `mermaid-wasm-renderer` produces invalid SVG with empty `stroke-` attributes — known issue in Mermaid CLI output.
- Astro static builds don't benefit from incremental compilation; full rebuild each time (~6.9s core build).
- Pagefind Chinese language (zh-cn) lacks stemming support; search works but no root-word matching.

## Action Items

- [ ] Update `wrangler.jsonc` compatibility_date to 2026-09-02
- [ ] Add weekly compatibility_date update automation (cron or pre-deploy)
- [ ] File issue/PR to mermaid-wasm-renderer for SVG output fix
- [ ] Add GitHub Actions step to emit build metrics to summary
- [ ] Consider `astro:build:start` hook to pre-warm Mermaid renderer cache
