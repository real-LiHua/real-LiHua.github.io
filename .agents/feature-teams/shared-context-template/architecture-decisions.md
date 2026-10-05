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

| ID      | Title                            | Status   | Date       | Deciders               |
| ------- | -------------------------------- | -------- | ---------- | ---------------------- |
| ADR-001 | [Example: Search index strategy] | Accepted | 2026-01-15 | Lead, Search, Frontend |
| ADR-002 | [Example: Tag taxonomy changes]  | Proposed | 2026-01-16 | Content, Search        |

---

## Example Entries (Remove when creating actual team)

### ADR-001: Pagefind Index Sharding Strategy

- **Status**: Accepted
- **Date**: 2026-01-15
- **Deciders**: Search (Lead), Frontend, Content
- **Consulted**: Quality, Build
- **Informed**: CLI

#### Context

Current single Pagefind index exceeds 500KB gzipped, causing slow initial load on mobile. Need to shard by content type (posts vs pages) and/or language.

#### Decision

Implement two-index strategy:

1. `pagefind-posts` — Blog posts only (~300KB)
2. `pagefind-pages` — Static pages (about, tags, etc.) ~50KB
   Load posts index on demand when user focuses search input.

#### Consequences

**Positive:**

- Initial JS payload reduced by ~60%
- Faster Time-to-Interactive on mobile
- Posts index can be cached longer (immutable content)

**Negative:**

- Search UI complexity increases (multi-index query)
- Need to maintain two index builds in CI
- Tag search requires querying both indices

**Risks:**

- Race condition between index loads
- Inconsistent result ranking across indices

#### Alternatives Considered

1. **Single index with lazy loading** — Rejected: still downloads full index on first search
2. **Server-side search (Cloudflare Workers)** — Rejected: adds latency, loses offline capability
3. **Fuse.js client-side** — Rejected: larger bundle than Pagefind, no indexing pipeline

#### Links

- Issue: #432
- PR: #445
- Global ADR: ADR-012 (Client-side search architecture)

---

### ADR-002: Tag Taxonomy Normalization

- **Status**: Proposed
- **Date**: 2026-01-16
- **Deciders**: Content, Search
- **Consulted**: Frontend, Quality
- **Informed**: Build, CLI

#### Context

Current tags are free-form strings leading to duplicates (e.g., "astro", "Astro", "astro-js"). This breaks tag pages, search facets, and recommendations.

#### Decision

Enforce normalized tag taxonomy:

1. Define canonical tag list in `src/content/tags.json`
2. Add validation in content pipeline (remark plugin)
3. Auto-suggest canonical tags in post-edit CLI
4. Migrate existing posts via one-time script

#### Consequences

**Positive:**

- Consistent tag facets in search UI
- Accurate related-post recommendations
- Cleaner tag pages

**Negative:**

- Migration effort for 200+ existing posts
- Authors lose free-form tagging flexibility
- Need governance process for new tags

**Risks:**

- Migration script introduces frontmatter errors
- Canonical list becomes stale without ownership

#### Alternatives Considered

1. **Fuzzy matching at query time** — Rejected: doesn't fix tag pages, performance cost
2. **Post-hoc normalization only** — Rejected: doesn't prevent future drift

#### Links

- Issue: #438
- Related: ADR-001 (search facets depend on clean tags)
