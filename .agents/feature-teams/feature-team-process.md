# Feature Team Process

## Overview

Feature teams are temporary, cross-functional groups formed to deliver complex initiatives that span multiple roles. They exist alongside the standing role structure and dissolve once their objective is complete.

---

## Triggers for Formation

A feature team **must** be formed when any of the following conditions are met:

| Trigger | Description | Examples |
|---------|-------------|----------|
| **Cross-Role Dependency** | Work requires coordinated effort across **3 or more roles** | Search redesign (Search + Frontend + Content + Quality) |
| **Architectural Decision** | Initiative involves system-wide architectural choices that affect multiple roles | Migration to new framework, database schema changes |
| **Technical Debt Remediation** | Paying down debt that spans multiple components owned by different roles | Removing legacy CSS, consolidating duplicate utilities |
| **Strategic Initiative** | Leadership-directed effort with org-wide impact | Rebranding, accessibility compliance, performance program |

> **Note**: Two-role collaborations should use direct role-to-role coordination (see Role Contracts). Feature teams are for 3+ roles.

---

## Formation Process (5 Steps)

### Step 1: Build Dependency Graph
- Map all tasks, deliverables, and their interdependencies
- Identify which roles own each task
- Document in `shared-context/dependency-graph.md`

### Step 2: Select Team Lead
- Lead must come from the **primary owning role** (the role with the most tasks/stake)
- Lead is accountable for team outcomes, not individual contributions
- Lead facilitates rituals, owns the charter, escalates blockers

### Step 3: Invite Required Roles
- Include all roles with tasks in the dependency graph
- Each role nominates a **representative** (can be the role holder or delegate)
- Document members in `shared-context/charter.md`

### Step 4: Establish Shared Context
Create the shared context package (see `shared-context-template/`):
- `charter.md` — Purpose, scope, success criteria, timeline
- `architecture-decisions.md` — Local ADRs for this initiative
- `dependency-graph.md` — Task dependency visualization
- `risk-register.md` — Identified risks with owners and mitigations
- `retro-notes.md` — Running retro notes

### Step 5: Define Rituals
Agree on cadence and format for:
- **Daily Sync** (15 min) — Progress, blockers, coordination needs
- **Weekly Retro** (30 min) — Process improvement, interpersonal dynamics
- **End-of-Project Retrospective** (60 min) — Lessons learned, knowledge capture

---

## Rituals

### Daily Sync (15 minutes)
**Frequency**: Daily during active phase
**Attendees**: All team members
**Format**:
1. Each member: What did I complete yesterday? What will I tackle today? Any blockers needing help?
2. Lead: Any cross-team dependencies or external blockers?
3. Quick decisions on items raised (defer deep discussions)

**Output**: Updated dependency graph, new risks added to register

### Weekly Retrospective (30 minutes)
**Frequency**: Weekly during active phase
**Attendees**: All team members
**Format**:
1. What went well this week? (Celebrate)
2. What didn't go well? (Facts, not blame)
3. Action items for next week (max 3, assigned owners)
4. Team health check (1-5 scale: psychological safety, clarity, pace)

**Output**: Updated `retro-notes.md`, action items tracked

### End-of-Project Retrospective (60 minutes)
**Frequency**: Once, at winding down
**Attendees**: All team members + relevant stakeholders
**Format**:
1. Timeline review: What happened when?
2. Outcomes vs. success criteria (from charter)
3. What should we start/stop/continue for future feature teams?
4. Knowledge capture: Decisions, patterns, anti-patterns documented
5. Celebration

**Output**: Archived in team folder, lessons fed back to role definitions

---

## RACI Matrix Template

See [raci-template.md](./raci-template.md) for the standard template with roles:
- **Lead** (Accountable for outcome)
- **Content** (Content Collections, MDX, RSS, SEO)
- **Frontend** (Components, Layouts, Styling, a11y)
- **Search** (Pagefind, Search UI, Recommendations)
- **Quality** (Testing, Linting, TypeScript, Playwright)
- **Build** (Astro Config, CI/CD, Deployments, Workers)
- **CLI** (Rust post-edit, Tooling, Automation)

### RACI Definitions
| Code | Meaning |
|------|---------|
| **R** (Responsible) | Does the work |
| **A** (Accountable) | Owns the outcome, approves |
| **C** (Consulted) | Provides input, two-way |
| **I** (Informed) | Kept updated, one-way |

---

## Lifecycle

```
FORMATION → ACTIVE → WINDING DOWN → ARCHIVED
```

### Formation
- Trigger identified
- 5-step formation process completed
- Charter approved by all role representatives
- Team folder created under `.agents/feature-teams/active/`

### Active
- Daily syncs running
- Weekly retros running
- Dependency graph updated as work progresses
- Risks actively managed
- Decisions recorded in architecture-decisions.md

### Winding Down
- All success criteria met (or explicitly descoped)
- Deliverables handed off to owning roles
- End-of-project retrospective scheduled
- Final documentation complete

### Archived
- Team folder moved to `.agents/feature-teams/archive/`
- Charter marked complete
- Lessons learned extracted to role knowledge base
- Team members return to primary role focus

---

## Governance

- **Role Leads** (from standing roles) approve feature team formation
- **Lead** escalates unresolved conflicts to Role Leads
- **Quality Role** audits feature team process compliance quarterly
- **Maximum duration**: 6 weeks (extendable with Role Lead approval)

---

## Anti-Patterns to Avoid

| Anti-Pattern | Symptom | Correction |
|--------------|---------|------------|
| **Permanent feature team** | Team exists > 6 weeks without winding down | Enforce lifecycle, archive or restructure |
| **Lead does all work** | Lead is R on most tasks | Lead should be A, delegate R to members |
| **Missing roles** | Key dependency not represented | Revisit dependency graph, invite missing role |
| **No shared context** | Decisions made in private channels | Enforce all decisions in architecture-decisions.md |
| **Ritual theater** | Syncs happen but no blockers surface | Lead models vulnerability, psychological safety |

---

## References

- [Role Definitions](../roles/) — Standing role responsibilities
- [Role Contracts](../contracts/) — Bilateral role agreements
- [RACI Template](./raci-template.md) — Standard responsibility matrix
- [Shared Context Template](./shared-context-template/) — Context package structure