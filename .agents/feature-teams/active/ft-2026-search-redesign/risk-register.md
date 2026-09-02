# Risk Register

> Tracks identified risks, probability, impact, owners, and mitigations. Review weekly in retro.

---

## Risk Scoring

| Probability | Score | Impact | Score |
|-------------|-------|--------|-------|
| Rare (0-10%) | 1 | Negligible | 1 |
| Unlikely (10-30%) | 2 | Minor | 2 |
| Possible (30-60%) | 3 | Moderate | 3 |
| Likely (60-80%) | 4 | Major | 4 |
| Almost Certain (80%+) | 5 | Critical | 5 |

**Risk Score = Probability × Impact** (1-25)
- **Low (1-6)**: Monitor, no immediate action
- **Medium (7-12)**: Mitigation plan required
- **High (13-19)**: Active mitigation, weekly review
- **Critical (20-25)**: Escalate immediately, daily tracking

---

## Risk Log

| ID | Risk Description | Category | Probability | Impact | Score | Owner | Status | Mitigation | Contingency | Last Review |
|----|------------------|----------|-------------|--------|-------|-------|--------|------------|-------------|-------------|
| R1 | Pagefind v2 breaking changes during development | Technical | 3 | 4 | 12 | Search | Mitigating | Pin Pagefind version in package.json; test upgrade in branch | Fallback to v1 if v2 unstable | 2026-09-03 |
| R2 | Migration script corrupts frontmatter on 200+ posts | Technical | 3 | 5 | 15 | CLI | Mitigating | Dry-run on git branch; backup original files; validate with schema | Manual fix + re-run; rollback commit | 2026-09-03 |
| R3 | Search UI redesign introduces a11y regressions | Quality | 4 | 4 | 16 | Frontend | Open | Pair with Quality on T12; axe-core in CI; manual keyboard testing | Revert to previous component; hotfix | 2026-09-03 |
| R4 | Dual index build exceeds CI time budget | Build | 3 | 3 | 9 | Build | Open | Profile build; parallelize shards; cache indices | Increase CI timeout; split into separate jobs | 2026-09-03 |
| R5 | Tag taxonomy scope creep (endless new tags) | Scope | 4 | 3 | 12 | Content | Mitigating | Freeze canonical list at M3; new tags require Content Lead approval | Defer non-critical tags to v2 | 2026-09-03 |
| R6 | Team member unavailable > 1 week (illness/leave) | Resource | 2 | 4 | 8 | Lead | Open | Cross-train on critical tasks; document handoff in retro-notes | Re-prioritize scope; extend timeline | 2026-09-03 |
| R7 | Search relevance metrics don't meet target | Product | 3 | 4 | 12 | Search | Open | Baseline current NDCG; A/B test algorithm changes | Accept lower target; iterate post-launch | 2026-09-03 |
| R8 | Mobile search UX fails usability testing | UX | 3 | 4 | 12 | Frontend | Open | Early prototype testing; iterative design | Simplify UI; defer advanced filters | 2026-09-03 |
| R9 | Dependency on external API (e.g., Algolia fallback) | External | 2 | 5 | 10 | Search | Closed | No external deps in v1; Pagefind is self-contained | N/A | 2026-09-03 |
| R10 | Knowledge loss when team archives | Process | 3 | 3 | 9 | Lead | Open | End-of-project retro mandatory; docs in shared-context | Schedule knowledge transfer session | 2026-09-03 |
| R11 | Build pipeline changes break existing deployments | Build | 2 | 5 | 10 | Build | Open | Test in staging first; feature flag dual index | Rollback to single index build | 2026-09-03 |
| R12 | Search analytics events violate privacy policy | Legal | 1 | 5 | 5 | Lead | Open | No PII in events; anonymize IP; document data flow | Disable analytics if compliance issue | 2026-09-03 |

---

## Risk Categories
- **Technical**: Implementation complexity, tooling, dependencies
- **Quality**: Testing, a11y, performance, security
- **Scope**: Requirements creep, unclear boundaries
- **Resource**: Availability, skill gaps, burnout
- **Product**: Metrics, UX, user adoption
- **External**: Third-party services, vendor changes
- **Process**: Communication, decision-making, handoffs
- **Legal**: Compliance, privacy, licensing

---

## Risk Burndown Chart (Update Weekly)

```
Week 1 (2026-09-03): ████████████████████ 12 risks (3 High, 7 Medium, 2 Low)
Week 2 (2026-09-10): ██████████████████   10 risks (2 High, 6 Medium, 2 Low)
Week 3 (2026-09-17): ████████████████     8 risks  (1 High, 5 Medium, 2 Low)
Week 4 (2026-09-24): ██████████████       6 risks  (1 High, 3 Medium, 2 Low)
Week 5 (2026-10-01): ████████████         4 risks  (0 High, 2 Medium, 2 Low)
Week 6 (2026-10-08): ████████             2 risks  (0 High, 1 Medium, 1 Low)
```

---

## Escalated Risks
> Risks escalated to Role Leads or Architecture Review Board

| Risk ID | Escalation Date | Escalated To | Resolution | Resolved Date |
|---------|-----------------|--------------|------------|---------------|
| — | — | — | — | — |

---

## Closed Risks
> Risks that have been resolved or accepted

| Risk ID | Closure Reason | Closure Date | Lessons Learned |
|---------|----------------|--------------|-----------------|
| R9 | No external dependencies in v1 design; Pagefind is fully self-contained | 2026-09-03 | Early architecture decision (ADR-001) eliminated this risk class |

---

## Review Cadence
- **Weekly Retro**: Review all Open/Mitigating risks, update scores
- **Daily Sync**: Quick check on High/Critical risks only
- **Formation**: Initial risk identification (all team members)
- **Winding Down**: Final review, archive closed risks, document lessons