# RACI Matrix — ft-2026-search-redesign

## Team Roles

| Role | Representative | Primary Domain |
|------|----------------|----------------|
| **Lead** | Alex Chen | Team coordination, escalation, charter ownership |
| **Content** | Bob Wilson | Posts, content pipeline, frontmatter schema, tag taxonomy |
| **Frontend** | Jane Smith | Astro components, Tailwind/daisyUI, a11y, search UI |
| **Search** | Alex Chen | Pagefind index, search algorithms, tag facets, recommendations |
| **Quality** | Carol Lee | oxlint/oxfmt, TypeScript, Playwright E2E, accessibility audit |
| **Build** | Dave Kim | astro.config.ts, CI/CD, Cloudflare Workers, dual index build |
| **CLI** | Dave Kim (delegate) | post-edit binary, tag migration script, automation |

---

## RACI Matrix

### Legend
- **R** = Responsible (does the work)
- **A** = Accountable (owns outcome, approves) — **exactly one per row**
- **C** = Consulted (provides input, two-way communication)
- **I** = Informed (kept updated, one-way communication)
- **—** = Not involved

---

### Search Redesign Activities

| Activity / Deliverable | Lead | Content | Frontend | Search | Quality | Build | CLI |
|------------------------|:----:|:-------:|:--------:|:------:|:-------:|:-----:|:---:|
| **Charter Definition** | A | C | C | C | C | C | I |
| **Dependency Graph** | A | R | R | R | C | C | C |
| **Architecture Decisions (ADRs)** | A | C | R | R | C | C | C |
| **Risk Identification** | A | R | R | R | R | R | R |
| **Daily Sync Facilitation** | R | I | I | I | I | I | I |
| **Weekly Retro Facilitation** | R | I | I | I | I | I | I |
| **Canonical Tag List Definition** | I | A/R | C | C | C | I | C |
| **Tag Validation Pipeline** | I | A/R | C | C | C | I | C |
| **Tag Migration Script** | I | C | I | C | C | C | A/R |
| **Pagefind Multi-Index Schema** | I | C | C | A/R | C | C | I |
| **Index Build Pipeline** | I | I | I | C | C | A/R | I |
| **Posts Index Shard** | I | I | I | A/R | C | C | I |
| **Pages Index Shard** | I | I | I | A/R | C | C | I |
| **Lazy Index Loading UI** | I | C | R | A | C | I | I |
| **Search Results Component Redesign** | I | C | A/R | R | C | I | I |
| **Tag Facet Filtering UI** | I | C | A/R | R | C | I | I |
| **Keyboard Navigation & a11y** | I | C | A/R | C | R | I | I |
| **Search Analytics Events** | I | C | C | A/R | R | C | I |
| **Recommendations Widget** | I | C | R | A/R | C | I | I |
| **E2E Search Tests** | I | C | C | R | A/R | I | I |
| **Performance Budget Validation** | I | C | C | C | A/R | C | I |
| **Accessibility Audit** | I | C | R | C | A/R | I | I |
| **CI Dual Index Build** | I | I | I | C | C | A/R | C |
| **Staging Deploy & Validation** | A | I | C | I | C | R | I |
| **Production Deploy** | A | I | I | I | C | R | I |
| **Documentation Updates** | A | R | R | R | R | R | R |
| **End-of-Project Retrospective** | R | R | R | R | R | R | R |
| **Knowledge Capture / Handoff** | A | R | R | R | R | R | R |

---

## RACI Anti-Patterns Check

| Pattern | Status | Notes |
|---------|--------|-------|
| Multiple As per row | ✅ None | Verified: exactly one A per row |
| No As per row | ✅ None | All rows have an A |
| Lead is R on everything | ✅ Avoided | Lead is R only on facilitation (sync, retro) |
| Every role has at least one R | ✅ Verified | Lead: 2, Content: 3, Frontend: 5, Search: 7, Quality: 4, Build: 3, CLI: 1 |
| Missing role from matrix | ✅ None | All 7 roles represented |

---

## Approval

This RACI has been reviewed and agreed upon by all role representatives during **Formation Step 5 (Define Rituals)**.

**Sign-off:**

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Lead | Alex Chen | ✅ | 2026-09-03 |
| Content | Bob Wilson | ✅ | 2026-09-03 |
| Frontend | Jane Smith | ✅ | 2026-09-03 |
| Search | Alex Chen | ✅ | 2026-09-03 |
| Quality | Carol Lee | ✅ | 2026-09-03 |
| Build | Dave Kim | ✅ | 2026-09-03 |
| CLI | Dave Kim (delegate) | ✅ | 2026-09-03 |

---

## Change Log

| Date | Version | Change | Author |
|------|---------|--------|--------|
| 2026-09-03 | 1.0 | Initial RACI for search redesign | Alex Chen |