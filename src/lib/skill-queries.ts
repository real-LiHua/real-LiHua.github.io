/**
 * Representative queries for the vendored agent skills, keyed by lock name.
 *
 * ARD recommends 2–5 natural-language queries per entry so a semantic index can match user intent.
 * The skill descriptions are written for an agent, not as search queries, so these are authored per
 * skill from the SKILL.md text.
 *
 * `tests/unit/skills.test.ts` fails when an installed skill is missing here, so adding a skill to
 * `skills-lock.json` also means adding its queries.
 */
export const SKILL_QUERIES: Record<string, readonly string[]> = {
  "ai-catalog-cli": [
    "Find an MCP server in an AI Catalog",
    "Validate an ai-catalog.json document",
    "Install an agent skill from a catalog",
  ],
  "ask-matt": ["Which skill fits my situation?", "Help me pick a workflow from this repo"],
  "canvas-design": ["Create a poster design", "Generate a piece of visual art as PNG"],
  "chrome-devtools-cli": [
    "Automate a browser task from the shell",
    "Click a page element with Chrome DevTools CLI",
    "Take a snapshot of the current page with chrome-devtools-mcp",
  ],
  "chrome-extensions": [
    "Build a Chrome extension with Manifest V3",
    "Debug my browser extension's content script",
    "Publish an extension to the Chrome Web Store",
  ],
  "claude-handoff": [
    "Hand this conversation off to a background agent",
    "Start a fresh agent to continue this work",
  ],
  "code-review": ["Review my branch since main", "Review this PR against our standards"],
  "codebase-design": ["Design a module's interface", "Find where to put a seam in this codebase"],
  "create-agentsmd": [
    "Generate an AGENTS.md for this repository",
    "Write agent instructions for a repo",
  ],
  "create-implementation-plan": [
    "Create an implementation plan for a new feature",
    "Plan a package upgrade",
  ],
  "create-readme": ["Create a README for this project", "Write a README.md"],
  "diagnosing-bugs": ["Diagnose this bug", "Why is this page slow?"],
  "domain-modeling": ["Write a glossary for this codebase", "Record an architecture decision"],
  "frontend-design": [
    "Give this UI a distinctive visual direction",
    "Help me pick typography for a new page",
  ],
  "git-commit": ["Commit these changes", "Split my work into multiple conventional commits"],
  "git-guardrails-claude-code": [
    "Block dangerous git commands in Claude Code",
    "Add git safety hooks",
  ],
  "github-issues": [
    "Create a bug report issue",
    "Add a label to an issue",
    "Link two issues as blocked-by",
  ],
  "grill-me": ["Grill me on this plan", "Stress-test my design decisions"],
  "grill-with-docs": [
    "Grill my plan and write ADRs as we go",
    "Challenge this design and record the decisions",
  ],
  grilling: ["Grill me about this idea", "Challenge my thinking on this decision"],
  handoff: [
    "Compact this conversation into a handoff document",
    "Write a handoff for another agent",
  ],
  "i-have-adhd": ["Turn on ADHD output mode", "Lead with the next action in your replies"],
  impeccable: [
    "Redesign this landing page",
    "Audit the UX of my dashboard",
    "Polish this component's typography and color",
  ],
  implement: ["Implement this spec", "Work through these tickets"],
  "implement-spec": ["Implement the result of /to-spec", "Turn this spec into code"],
  "improve-codebase-architecture": [
    "Find deepening opportunities in this codebase",
    "Where should the architecture improve?",
  ],
  "loop-me": [
    "Grill me about the workflows I want to build",
    "Help me spec a workflow in this workspace",
  ],
  "migrate-to-shoehorn": [
    "Replace as assertions in tests with shoehorn",
    "Migrate my tests to @total-typescript/shoehorn",
  ],
  "modern-web-guidance": [
    "Find modern web best practices for this UI pattern",
    "Modernize this component with current platform features",
    "Audit my site for legacy web patterns",
  ],
  prd: ["Write a PRD for this feature", "Generate product requirements for an AI feature"],
  prototype: [
    "Prototype this UI to see how it feels",
    "Build a throwaway prototype for this state model",
  ],
  refactor: ["Refactor this god function", "Improve type safety without changing behavior"],
  "refactor-plan": ["Plan a multi-file refactor", "What is the safe sequence for this refactor?"],
  research: [
    "Research this topic against primary sources",
    "Gather docs facts and write up the findings",
  ],
  retro: ["Run a retrospective on this coding session", "Write a retro of what we just did"],
  "scaffold-exercises": [
    "Scaffold a new exercise section",
    "Create exercise stubs that pass linting",
  ],
  "security-audit": [
    "Audit this codebase for security issues",
    "Review this API for vulnerabilities",
  ],
  "setup-matt-pocock-skills": [
    "Configure this repo for the engineering skills",
    "Set up the issue tracker and triage labels",
  ],
  "setup-pre-commit": [
    "Set up Husky pre-commit hooks",
    "Add lint-staged and type checking on commit",
  ],
  shadcn: [
    "Add a shadcn component to my app",
    "Switch this project to a shadcn preset",
    "Build a design system with shadcn/ui",
  ],
  "to-tickets": ["Break this plan into tickets", "Turn this spec into tracer-bullet tickets"],
  "transitions-dev": [
    "Add a dropdown transition",
    "Animate the modal opening",
    "Make the toast stack animate in",
  ],
  "transitions-polish": [
    "Polish my transitions",
    "Tighten the durations and easing on these animations",
  ],
  "skill-creator": [
    "Create a new agent skill from scratch",
    "Optimize a skill's description for better triggering",
    "Benchmark skill performance with evals",
  ],
  triage: ["Triage this issue", "Move this pull request through triage states"],
  unslop: ["Unslop this UI", "This page looks AI-generated, redesign it"],
  "vercel-composition-patterns": [
    "Refactor these boolean props into composition",
    "Design a reusable component API",
  ],
  "wait-what": ["That did not land, re-pitch it", "Explain that again more clearly"],
  wayfinder: ["Plan this huge multi-session project", "Break this work into decision tickets"],
  "web-design-guidelines": [
    "Review my UI for accessibility",
    "Check this site against best practices",
  ],
  "web-perf": ["Audit my website performance", "Improve Core Web Vitals and Lighthouse scores"],
  wizard: [
    "Generate a bash wizard for credential setup",
    "Walk me through a third-party dashboard setup",
  ],
  "writing-beats": [
    "Turn these notes into a journey of beats",
    "Assemble raw material into narrative beats",
  ],
  "writing-for-agents": ["Write an AGENTS.md", "Improve this skill's instructions"],
  "writing-fragments": [
    "Brainstorm raw fragments for an article",
    "Explore notes without structure yet",
  ],
  "writing-shape": ["Shape these notes into an article", "Draft an article paragraph by paragraph"],
};
