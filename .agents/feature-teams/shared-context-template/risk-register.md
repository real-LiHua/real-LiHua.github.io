# Risk Register

> Tracks identified risks, probability, impact, owners, and mitigations. Review weekly in retro.

---

## Risk Scoring

| Probability           | Score | Impact     | Score |
| --------------------- | ----- | ---------- | ----- |
| Rare (0-10%)          | 1     | Negligible | 1     |
| Unlikely (10-30%)     | 2     | Minor      | 2     |
| Possible (30-60%)     | 3     | Moderate   | 3     |
| Likely (60-80%)       | 4     | Major      | 4     |
| Almost Certain (80%+) | 5     | Critical   | 5     |

**Risk Score = Probability × Impact** (1-25)

- **Low (1-6)**: Monitor, no immediate action
- **Medium (7-12)**: Mitigation plan required
- **High (13-19)**: Active mitigation, weekly review
- **Critical (20-25)**: Escalate immediately, daily tracking

---

## Risk Log

| ID  | Risk Description                                    | Category  | Probability | Impact | Score | Owner    | Status                   | Mitigation                                                          | Contingency                                   | Last Review |
| --- | --------------------------------------------------- | --------- | ----------- | ------ | ----- | -------- | ------------------------ | ------------------------------------------------------------------- | --------------------------------------------- | ----------- |
| R1  | Pagefind v2 breaking changes during development     | Technical | 3           | 4      | 12    | Search   | [Open/Mitigating/Closed] | Pin version in package.json; test upgrade in branch                 | Fallback to v1 if v2 unstable                 | YYYY-MM-DD  |
| R2  | Migration script corrupts frontmatter on 200+ posts | Technical | 3           | 5      | 15    | CLI      | [Open/Mitigating/Closed] | Dry-run on git branch; backup original files; validate with schema  | Manual fix + re-run; rollback commit          | YYYY-MM-DD  |
| R3  | Search UI redesign introduces a11y regressions      | Quality   | 4           | 4      | 16    | Frontend | [Open/Mitigating/Closed] | Pair with Quality on T12; axe-core in CI; manual keyboard testing   | Revert to previous component; hotfix          | YYYY-MM-DD  |
| R4  | Dual index build exceeds CI time budget             | Build     | 3           | 3      | 9     | Build    | [Open/Mitigating/Closed] | Profile build; parallelize shards; cache indices                    | Increase CI timeout; split into separate jobs | YYYY-MM-DD  |
| R5  | Tag taxonomy scope creep (endless new tags)         | Scope     | 4           | 3      | 12    | Content  | [Open/Mitigating/Closed] | Freeze canonical list at M3; new tags require Content Lead approval | Defer non-critical tags to v2                 | YYYY-MM-DD  |
| R6  | Team member unavailable > 1 week (illness/leave)    | Resource  | 2           | 4      | 8     | Lead     | [Open/Mitigating/Closed] | Cross-train on critical tasks; document handoff in retro-notes      | Re-prioritize scope; extend timeline          | YYYY-MM-DD  |
| R7  | Search relevance metrics don't meet target          | Product   | 3           | 4      | 12    | Search   | [Open/Mitigating/Closed] | Baseline current NDCG; A/B test algorithm changes                   | Accept lower target; iterate post-launch      | YYYY-MM-DD  |
| R8  | Mobile search UX fails usability testing            | UX        | 3           | 4      | 12    | Frontend | [Open/Mitigating/Closed] | Early prototype testing; iterative design                           | Simplify UI; defer advanced filters           | YYYY-MM-DD  |
| R9  | Dependency on external API (e.g., Algolia fallback) | External  | 2           | 5      | 10    | Search   | [Open/Mitigating/Closed] | No external deps in v1; Pagefind is self-contained                  | N/A                                           | YYYY-MM-DD  |
| R10 | Knowledge loss when team archives                   | Process   | 3           | 3      | 9     | Lead     | [Open/Mitigating/Closed] | End-of-project retro mandatory; docs in shared-context              | Schedule knowledge transfer session           | YYYY-MM-DD  |

---

## Risk Categories

- **Technical**: Implementation complexity, tooling, dependencies
- **Quality**: Testing, a11y, performance, security
- **Scope**: Requirements creep, unclear boundaries
- **Resource**: Availability, skill gaps, burnout
- **Product**: Metrics, UX, user adoption
- **External**: Third-party services, vendor changes
- **Process**: Communication, decision-making, handoffs

---

## Risk Burndown Chart (Update Weekly)

```
Week 1: ████████████████████ 10 risks (3 High, 5 Medium, 2 Low)
Week 2: ██████████████████   9 risks  (2 High, 5 Medium, 2 Low)
Week 3: ████████████████     8 risks  (1 High, 5 Medium, 2 Low)
Week 4: ██████████████       6 risks  (1 High, 3 Medium, 2 Low)
Week 5: ████████████         4 risks  (0 High, 2 Medium, 2 Low)
Week 6: ████████             2 risks  (0 High, 1 Medium, 1 Low)
```

---

## Escalated Risks

> Risks escalated to Role Leads or Architecture Review Board

| Risk ID | Escalation Date | Escalated To | Resolution | Resolved Date |
| ------- | --------------- | ------------ | ---------- | ------------- |
| —       | —               | —            | —          | —             |

---

## Closed Risks

> Risks that have been resolved or accepted

| Risk ID | Closure Reason | Closure Date | Lessons Learned |
| ------- | -------------- | ------------ | --------------- |
| —       | —              | —            | —               |

---

## Review Cadence

- **Weekly Retro**: Review all Open/Mitigating risks, update scores
- **Daily Sync**: Quick check on High/Critical risks only
- **Formation**: Initial risk identification (all team members)
- **Winding Down**: Final review, archive closed risks, document lessons
