# Feature Team Charter

## Team Identity

- **Team Name**: ft-2026-search-redesign
- **Formation Date**: 2026-09-03
- **Expected End Date**: 2026-10-15
- **Team Lead**: Alex Chen (Search)
- **Status**: Active

---

## Purpose

The current search implementation on real-LiHua.github.io has three critical issues: (1) Pagefind index exceeds 500KB gzipped, causing slow initial load on mobile; (2) tag system uses free-form strings leading to duplicates and broken facets; (3) search UI lacks keyboard navigation and accessibility compliance. This feature team will redesign the search experience with a sharded index strategy, normalized tag taxonomy, and fully accessible search UI — all while maintaining zero external dependencies.

---

## Scope

### In Scope

- Pagefind index sharding (posts vs pages) with lazy loading
- Canonical tag taxonomy definition and migration of 200+ existing posts
- Search UI redesign: results component, tag facet filtering, keyboard navigation
- Search analytics events for relevance measurement
- E2E test coverage for search flows
- CI/CD updates for dual index build
- Performance budget validation (<200ms p95 search latency)

### Out of Scope

- Server-side search (Cloudflare Workers fallback)
- Algolia or external search service integration
- Multi-language search (i18n)
- Search autocomplete/suggestions
- Content authoring workflow changes beyond tag validation

---

## Success Criteria

> Measurable, time-boxed outcomes. Each criterion should be verifiable.

| #   | Criterion                    | Metric              | Target               | Deadline   |
| --- | ---------------------------- | ------------------- | -------------------- | ---------- |
| 1   | Search latency p95           | ms                  | < 200ms              | 2026-10-15 |
| 2   | Search relevance             | NDCG@10             | > 0.85               | 2026-10-15 |
| 3   | Zero regressions             | E2E pass rate       | 100%                 | 2026-10-15 |
| 4   | Initial JS payload reduction | KB gzipped          | < 150KB (from 500KB) | 2026-10-01 |
| 5   | Tag taxonomy coverage        | % posts migrated    | 100%                 | 2026-10-08 |
| 6   | Accessibility compliance     | axe-core violations | 0 critical/serious   | 2026-10-15 |

---

## Team Members

| Role     | Representative        | Primary / Delegate | Contact    |
| -------- | --------------------- | ------------------ | ---------- |
| Lead     | Alex Chen             | Primary            | @alexchen  |
| Content  | Bob Wilson            | Primary            | @bobwilson |
| Frontend | Jane Smith            | Primary            | @janesmith |
| Search   | Alex Chen             | Primary            | @alexchen  |
| Quality  | Carol Lee             | Primary            | @carolle   |
| Build    | Dave Kim              | Primary            | @davekim   |
| CLI      | (Delegate from Build) | Delegate           | @davekim   |

---

## Rituals Agreement

| Ritual               | Cadence | Duration | Time          | Location/Link               |
| -------------------- | ------- | -------- | ------------- | --------------------------- |
| Daily Sync           | Daily   | 15 min   | 09:30 UTC     | Discord #ft-search-redesign |
| Weekly Retro         | Weekly  | 30 min   | Fri 15:00 UTC | Discord #ft-search-redesign |
| End-of-Project Retro | Once    | 60 min   | TBD           | TBD                         |

---

## Communication Channels

- **Sync**: Discord #ft-search-redesign
- **Async**: GitHub Discussions (repo: real-LiHua/real-LiHua.github.io)
- **Documents**: This folder (shared-context/)

---

## Escalation Path

1. Team Lead resolves within team
2. Unresolved → Role Leads (standing roles)
3. Still unresolved → Architecture Review Board (Tech Lead)

---

## Approval

| Role     | Name                | Signature | Date       |
| -------- | ------------------- | --------- | ---------- |
| Lead     | Alex Chen           |           | 2026-09-03 |
| Content  | Bob Wilson          |           | 2026-09-03 |
| Frontend | Jane Smith          |           | 2026-09-03 |
| Search   | Alex Chen           |           | 2026-09-03 |
| Quality  | Carol Lee           |           | 2026-09-03 |
| Build    | Dave Kim            |           | 2026-09-03 |
| CLI      | Dave Kim (delegate) |           | 2026-09-03 |

---

## Changelog

| Date       | Version | Change          | Author    |
| ---------- | ------- | --------------- | --------- |
| 2026-09-03 | 1.0     | Initial charter | Alex Chen |
