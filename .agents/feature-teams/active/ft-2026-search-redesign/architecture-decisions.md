# Architecture Decisions (Local ADRs)

> This file records architectural decisions made **within this feature team**. Decisions with org-wide impact should be promoted to the global ADR registry (`.agents/adr/`).

---

## ADR Template

### ADR-[NNN]: [Short Title]

- **Status**: [Proposed / Accepted / Superseded / Rejected]
- **Date**: YYYY-MM-DD
- **Deciders**: [Roles/Names]
- **Consulted**: [Roles/Names]
- **Informed**: [Roles/Names]

#### Context

[What is the problem? What constraints exist?]

#### Decision

[What did we decide? Be specific.]

#### Consequences

**Positive:**

- [Benefit 1]
- [Benefit 2]

**Negative:**

- [Cost/Tradeoff 1]
- [Cost/Tradeoff 2]

**Risks:**

- [Risk 1]
- [Risk 2]

#### Alternatives Considered

1. [Alternative 1] — Rejected because [reason]
2. [Alternative 2] — Rejected because [reason]

#### Links

- Related issue: [#XXX]
- Related PR: [#YYY]
- Global ADR (if promoted): [ADR-XXX]

---

## Decision Log

| ID      | Title                            | Status   | Date       | Deciders                         |
| ------- | -------------------------------- | -------- | ---------- | -------------------------------- |
| ADR-001 | Pagefind Index Sharding Strategy | Accepted | 2026-09-03 | Lead (Search), Frontend, Content |
| ADR-002 | Tag Taxonomy Normalization       | Accepted | 2026-09-03 | Content, Search                  |
| ADR-003 | Search Analytics Event Schema    | Proposed | 2026-09-04 | Search, Quality                  |

---

## ADR Entries

### ADR-001: Pagefind Index Sharding Strategy

- **Status**: Accepted
- **Date**: 2026-09-03
- **Deciders**: Alex Chen (Search/Lead), Jane Smith (Frontend), Bob Wilson (Content)
- **Consulted**: Carol Lee (Quality), Dave Kim (Build)
- **Informed**: Dave Kim (CLI delegate)

#### Context

Current single Pagefind index exceeds 500KB gzipped, causing slow initial load on mobile (3G/4G). Need to shard by content type (posts vs pages) to reduce initial payload.

#### Decision

Implement two-index strategy:

1. `pagefind-posts` — Blog posts only (~300KB gzipped)
2. `pagefind-pages` — Static pages (about, tags, etc.) ~50KB gzipped
   Load posts index on demand when user focuses search input or types first character.

#### Consequences

**Positive:**

- Initial JS payload reduced by ~60% (from 500KB to ~50KB for pages index)
- Faster Time-to-Interactive on mobile
- Posts index can be cached longer (immutable content, changes only on new posts)
- Pages index rebuilds faster (fewer documents)

**Negative:**

- Search UI complexity increases (multi-index query merging)
- Need to maintain two index builds in CI pipeline
- Tag search requires querying both indices and merging results
- Recommendations widget needs posts index loaded

**Risks:**

- Race condition between index loads (mitigated: load pages index eagerly, posts on demand)
- Inconsistent result ranking across indices (mitigated: shared ranking config)

#### Alternatives Considered

1. **Single index with lazy loading** — Rejected: still downloads full index on first search interaction
2. **Server-side search (Cloudflare Workers)** — Rejected: adds network latency, loses offline capability, increases complexity
3. **Fuse.js client-side** — Rejected: larger bundle than Pagefind (~40KB vs ~15KB), no incremental indexing pipeline
4. **Single index with content-type filtering** — Rejected: doesn't reduce initial payload size

#### Links

- Issue: #432
- PR: #445 (to be created)
- Global ADR: ADR-012 (Client-side search architecture) — to be promoted

---

### ADR-002: Tag Taxonomy Normalization

- **Status**: Accepted
- **Date**: 2026-09-03
- **Deciders**: Bob Wilson (Content), Alex Chen (Search)
- **Consulted**: Jane Smith (Frontend), Carol Lee (Quality)
- **Informed**: Dave Kim (Build), Dave Kim (CLI delegate)

#### Context

Current tags are free-form strings leading to duplicates (e.g., "astro", "Astro", "astro-js", "Astro.js"). This breaks tag pages, search facets, and related-post recommendations. Over 200 existing posts need migration.

#### Decision

Enforce normalized tag taxonomy:

1. Define canonical tag list in `src/content/tags.json` with slug, label, and category
2. Add validation in content pipeline (remark plugin) — reject unknown tags at build time
3. Auto-suggest canonical tags in post-edit CLI (fuzzy match against canonical list)
4. Migrate existing posts via one-time script (dry-run first, then apply)

#### Consequences

**Positive:**

- Consistent tag facets in search UI (exact matches, no duplicates)
- Accurate related-post recommendations (shared canonical tags)
- Cleaner tag pages with proper capitalization and grouping
- Foundation for future tag hierarchy (categories → tags)

**Negative:**

- Migration effort for 200+ existing posts (estimated 2 days for script + validation)
- Authors lose free-form tagging flexibility (must choose from canonical list)
- Need governance process for adding new canonical tags (Content Lead approval)

**Risks:**

- Migration script introduces frontmatter errors (mitigated: dry-run, backup, schema validation)
- Canonical list becomes stale without ownership (mitigated: Content owns tags.json, quarterly review)

#### Alternatives Considered

1. **Fuzzy matching at query time** — Rejected: doesn't fix tag pages or recommendations, performance cost at query time
2. **Post-hoc normalization only** — Rejected: doesn't prevent future drift, technical debt accumulates
3. **Allow both canonical and free-form** — Rejected: defeats purpose, dual maintenance burden

#### Links

- Issue: #438
- Related: ADR-001 (search facets depend on clean tags)
- Migration script: `scripts/migrate-tags.ts` (to be created)

---

### ADR-003: Search Analytics Event Schema

- **Status**: Proposed
- **Date**: 2026-09-04
- **Deciders**: Alex Chen (Search), Carol Lee (Quality)
- **Consulted**: Jane Smith (Frontend), Dave Kim (Build)
- **Informed**: Bob Wilson (Content)

#### Context

Need to measure search relevance (NDCG@10) and latency (p95) to validate success criteria. Current analytics only track page views, not search interactions.

#### Decision

Define minimal search analytics events (no PII, GDPR-compliant):

1. `search_impression` — Search UI rendered, index loaded
2. `search_query` — User submitted query (debounced, 300ms)
3. `search_result_click` — User clicked result (position, doc_id)
4. `search_facet_change` — User toggled tag facet (tag, included/excluded)
5. `search_latency` — Client-side measured latency (index load + query execution)

Events sent to `/api/analytics/search` (Cloudflare Worker) → batched to analytics store. No IP, no user ID, session ID only (random UUID, 24hr TTL).

#### Consequences

**Positive:**

- Enables NDCG@10 calculation from click positions
- Latency monitoring for performance budget
- Facet usage data informs tag taxonomy priorities
- Zero PII — privacy-friendly by design

**Negative:**

- Additional client-side JS (~2KB gzipped)
- Need to implement analytics endpoint (Build effort)
- Data volume: ~10K events/day (manageable)

**Risks:**

- Ad blockers may drop events (mitigation: server-side fallback for critical metrics)
- Schema evolution (mitigation: versioned events, backward compatibility)

#### Alternatives Considered

1. **Full analytics platform (Plausible, Umami)** — Rejected: overkill, adds 10KB+ JS, not search-specific
2. **No analytics, only synthetic monitoring** — Rejected: can't measure real user relevance (NDCG)
3. **Log search queries server-side** — Rejected: client-side search means no server query logs

#### Links

- Issue: #456 (to be created)
- Success criteria: Charter metrics #1, #2

---
