# RACI Template for Feature Teams

## Standard Roles

| Role         | Description                                                            | Primary Domain                                                |
| ------------ | ---------------------------------------------------------------------- | ------------------------------------------------------------- |
| **Lead**     | Feature Team Lead — accountable for outcome, facilitates rituals       | Team coordination, escalation, charter ownership              |
| **Content**  | Content Engineer — MDX, Content Collections, RSS, SEO, Satteri         | Posts, content pipeline, frontmatter schema, search content   |
| **Frontend** | Frontend Architect — Components, Layouts, Styling, Accessibility       | Astro components, Tailwind/daisyUI, a11y, design system       |
| **Search**   | Search Discovery Engineer — Pagefind, Search UI, Tags, Recommendations | Search index, search UI components, tag system, related posts |
| **Quality**  | Quality & DX Guardian — Testing, Linting, TypeScript, Playwright       | oxlint/oxfmt, TypeScript, Playwright E2E, pre-commit, CI      |
| **Build**    | Build/Deploy Engineer — Astro Config, CI/CD, Deployments, Workers      | astro.config.ts, wrangler, GitHub Actions, Cloudflare, IPFS   |
| **CLI**      | CLI Tool Engineer — Rust post-edit, Interactive Tooling, Automation    | Cargo workspace, post-edit binary, skim/fuzzy, scripts        |

---

## RACI Matrix

### Legend

- **R** = Responsible (does the work)
- **A** = Accountable (owns outcome, approves) — **exactly one per row**
- **C** = Consulted (provides input, two-way communication)
- **I** = Informed (kept updated, one-way communication)
- **—** = Not involved

---

### Template: Copy and Customize Per Feature Team

| Activity / Deliverable             | Lead | Content | Frontend | Search | Quality | Build | CLI |
| ---------------------------------- | :--: | :-----: | :------: | :----: | :-----: | :---: | :-: |
| **Charter Definition**             |  A   |    C    |    C     |   C    |    C    |   C   |  I  |
| **Dependency Graph**               |  A   |    R    |    R     |   R    |    C    |   C   |  C  |
| **Architecture Decisions (ADRs)**  |  A   |    C    |    R     |   R    |    C    |   C   |  C  |
| **Risk Identification**            |  A   |    R    |    R     |   R    |    R    |   R   |  R  |
| **Daily Sync Facilitation**        |  R   |    I    |    I     |   I    |    I    |   I   |  I  |
| **Weekly Retro Facilitation**      |  R   |    I    |    I     |   I    |    I    |   I   |  I  |
| **Content Schema Changes**         |  I   |   A/R   |    C     |   C    |    C    |   I   |  I  |
| **Component Development**          |  I   |    C    |   A/R    |   C    |    C    |   I   |  I  |
| **Search Index/Algorithm Changes** |  I   |    C    |    C     |  A/R   |    C    |   I   |  I  |
| **Test Strategy & E2E Tests**      |  I   |    C    |    C     |   C    |   A/R   |   C   |  I  |
| **CI/CD Pipeline Changes**         |  I   |    I    |    C     |   C    |    C    |  A/R  |  C  |
| **Build Configuration**            |  I   |    I    |    C     |   C    |    C    |  A/R  |  I  |
| **Deployment & Release**           |  A   |    I    |    C     |   I    |    C    |   R   |  I  |
| **Rust CLI Changes**               |  I   |    I    |    I     |   I    |    C    |   C   | A/R |
| **Documentation Updates**          |  A   |    R    |    R     |   R    |    R    |   R   |  R  |
| **End-of-Project Retrospective**   |  R   |    R    |    R     |   R    |    R    |   R   |  R  |
| **Knowledge Capture / Handoff**    |  A   |    R    |    R     |   R    |    R    |   R   |  R  |

---

## Customization Guide

### For Each Feature Team:

1. **Copy this template** to the team's folder (e.g., `ft-2026-search-redesign/raci.md`)
2. **Adjust activities** to match the team's specific scope
3. **Assign exactly one A (Accountable)** per row
4. **Ensure every role has at least one R** (no passive members)
5. **Review with all members** during formation (Step 5)
6. **Update as scope changes** — record changes in architecture-decisions.md

### Example Customization for Search Redesign

| Activity / Deliverable       | Lead | Content | Frontend | Search | Quality | Build | CLI |
| ---------------------------- | :--: | :-----: | :------: | :----: | :-----: | :---: | :-: |
| Search UI Redesign           |  A   |    C    |    R     |   R    |    C    |   I   |  I  |
| Pagefind Index Optimization  |  C   |    C    |    I     |  A/R   |    C    |   C   |  I  |
| Tag System Refactor          |  C   |    R    |    C     |  A/R   |    C    |   I   |  I  |
| Search Analytics Integration |  I   |    C    |    C     |  A/R   |    C    |   R   |  I  |
| E2E Search Tests             |  I   |    C    |    C     |   R    |   A/R   |   I   |  I  |

---

## RACI Anti-Patterns

| Pattern                      | Problem                   | Fix                                                      |
| ---------------------------- | ------------------------- | -------------------------------------------------------- |
| **Multiple As**              | No clear decision owner   | Enforce single A per row                                 |
| **No As**                    | Orphaned activity         | Assign A immediately                                     |
| **All Rs**                   | No accountability         | Designate one A, others become C/I                       |
| **Lead is R on everything**  | Lead becomes bottleneck   | Lead should be A on coordination, R only on facilitation |
| **Role missing from matrix** | Work falls through cracks | Add row for missing activity, assign R                   |

---

## Approval

This RACI must be reviewed and agreed upon by all role representatives during **Formation Step 5 (Define Rituals)**.

**Sign-off:**

- Lead: ********\_******** Date: ****\_****
- Content: ********\_******** Date: ****\_****
- Frontend: ********\_******** Date: ****\_****
- Search: ********\_******** Date: ****\_****
- Quality: ********\_******** Date: ****\_****
- Build: ********\_******** Date: ****\_****
- CLI: ********\_******** Date: ****\_****
