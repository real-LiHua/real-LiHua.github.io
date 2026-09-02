#!/usr/bin/env node
/**
 * Feature Team CLI
 * Manages feature team lifecycle: create, update, archive, and ritual templates.
 * 
 * Usage:
 *   pnpm ft create-team --name ft-2026-search-redesign --lead search --members frontend,content,quality --trigger "cross-role-dependency"
 *   pnpm ft add-member ft-2026-search-redesign --role build --person "jane"
 *   pnpm ft record-decision ft-2026-search-redesign --title "Index sharding" --context "Pagefind v2..."
 *   pnpm ft add-risk ft-2026-search-redesign --desc "Migration may corrupt frontmatter" --prob 3 --impact 5 --owner cli
 *   pnpm ft daily-sync ft-2026-search-redesign
 *   pnpm ft weekly-retro ft-2026-search-redesign
 *   pnpm ft archive-team ft-2026-search-redesign
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FEATURE_TEAMS_DIR = path.resolve(__dirname, '..', '..', '.agents', 'feature-teams');
const ACTIVE_DIR = path.join(FEATURE_TEAMS_DIR, 'active');
const ARCHIVE_DIR = path.join(FEATURE_TEAMS_DIR, 'archive');
const TEMPLATE_DIR = path.join(FEATURE_TEAMS_DIR, 'shared-context-template');

interface TeamMember {
  role: string;
  person: string;
  type: 'primary' | 'delegate';
}

interface TeamConfig {
  name: string;
  lead: string;
  members: TeamMember[];
  trigger: 'cross-role-dependency' | 'architectural-decision' | 'tech-debt' | 'strategic-initiative';
  formedDate: string;
  expectedEndDate?: string;
  status: 'formation' | 'active' | 'winding-down' | 'archived';
  charterPath: string;
}

const ROLES = ['lead', 'content', 'frontend', 'search', 'quality', 'build', 'cli'] as const;
type Role = typeof ROLES[number];

const TRIGGERS = ['cross-role-dependency', 'architectural-decision', 'tech-debt', 'strategic-initiative'] as const;

function parseArgs(argv: string[]): { command: string; args: string[]; flags: Record<string, string | boolean> } {
  const flags: Record<string, string | boolean> = {};
  const args: string[] = [];
  let command = '';

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      if (i + 1 < argv.length && !argv[i + 1].startsWith('--')) {
        flags[key] = argv[++i];
      } else {
        flags[key] = true;
      }
    } else if (arg.startsWith('-')) {
      const key = arg.slice(1);
      if (i + 1 < argv.length && !argv[i + 1].startsWith('-')) {
        flags[key] = argv[++i];
      } else {
        flags[key] = true;
      }
    } else if (!command) {
      command = arg;
    } else {
      args.push(arg);
    }
  }

  return { command, args, flags };
}

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function loadTeam(name: string): TeamConfig | null {
  const teamDir = path.join(ACTIVE_DIR, name);
  const configPath = path.join(teamDir, 'team.json');
  
  if (!fs.existsSync(configPath)) {
    return null;
  }
  
  return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
}

function saveTeam(team: TeamConfig): void {
  const teamDir = path.join(ACTIVE_DIR, team.name);
  ensureDir(teamDir);
  fs.writeFileSync(path.join(teamDir, 'team.json'), JSON.stringify(team, null, 2));
}

function copyTemplate(templateName: string, destPath: string, replacements: Record<string, string> = {}): void {
  const templatePath = path.join(TEMPLATE_DIR, templateName);
  if (!fs.existsSync(templatePath)) {
    console.error(`Template not found: ${templatePath}`);
    process.exit(1);
  }
  
  let content = fs.readFileSync(templatePath, 'utf-8');
  
  for (const [key, value] of Object.entries(replacements)) {
    content = content.replace(new RegExp(`\\[${key}\\]`, 'g'), value);
  }
  
  fs.writeFileSync(destPath, content);
}

function generateTeamId(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).slice(2, 6);
  return `ft-${date}-${random}`;
}

async function cmdCreateTeam(args: string[], flags: Record<string, string | boolean>): Promise<void> {
  const name = flags.name as string || generateTeamId();
  const lead = flags.lead as string;
  const membersStr = flags.members as string || '';
  const trigger = flags.trigger as string;
  const expectedEndDate = flags['expected-end'] as string;
  
  if (!lead) {
    console.error('Error: --lead is required');
    process.exit(1);
  }
  
  if (!ROLES.includes(lead as Role)) {
    console.error(`Error: Invalid lead role. Must be one of: ${ROLES.join(', ')}`);
    process.exit(1);
  }
  
  if (!TRIGGERS.includes(trigger as typeof TRIGGERS[number])) {
    console.error(`Error: Invalid trigger. Must be one of: ${TRIGGERS.join(', ')}`);
    process.exit(1);
  }
  
  const members: TeamMember[] = [
    { role: lead, person: flags['lead-person'] as string || 'TBD', type: 'primary' }
  ];
  
  if (membersStr) {
    for (const memberSpec of membersStr.split(',')) {
      const [role, person] = memberSpec.split(':');
      if (!ROLES.includes(role as Role)) {
        console.error(`Warning: Unknown role "${role}", skipping`);
        continue;
      }
      if (role === lead) continue; // Lead already added
      members.push({ role: role as Role, person: person || 'TBD', type: 'primary' });
    }
  }
  
  const team: TeamConfig = {
    name,
    lead,
    members,
    trigger: trigger as typeof TRIGGERS[number],
    formedDate: new Date().toISOString().split('T')[0],
    expectedEndDate,
    status: 'formation',
    charterPath: `active/${name}/charter.md`
  };
  
  // Create team directory
  const teamDir = path.join(ACTIVE_DIR, name);
  ensureDir(teamDir);
  
  // Save team config
  saveTeam(team);
  
  // Copy shared context templates
  const replacements = {
    'Team Name': name,
    'Formation Date': team.formedDate,
    'Expected End Date': expectedEndDate || 'TBD',
    'Team Lead': lead,
    'Lead Name': flags['lead-person'] as string || 'TBD'
  };
  
  copyTemplate('charter.md', path.join(teamDir, 'charter.md'), replacements);
  copyTemplate('architecture-decisions.md', path.join(teamDir, 'architecture-decisions.md'));
  copyTemplate('dependency-graph.md', path.join(teamDir, 'dependency-graph.md'));
  copyTemplate('risk-register.md', path.join(teamDir, 'risk-register.md'));
  copyTemplate('retro-notes.md', path.join(teamDir, 'retro-notes.md'));
  
  // Create RACI from template
  const raciTemplatePath = path.join(FEATURE_TEAMS_DIR, 'raci-template.md');
  const raciDestPath = path.join(teamDir, 'raci.md');
  if (fs.existsSync(raciTemplatePath)) {
    fs.copyFileSync(raciTemplatePath, raciDestPath);
  }
  
  console.log(`✅ Feature team "${name}" created successfully!`);
  console.log(`   Lead: ${lead} (${flags['lead-person'] || 'TBD'})`);
  console.log(`   Members: ${members.map(m => `${m.role}:${m.person}`).join(', ')}`);
  console.log(`   Trigger: ${trigger}`);
  console.log(`   Directory: ${teamDir}`);
  console.log(`\nNext steps:`);
  console.log(`  1. Edit ${path.join(teamDir, 'charter.md')} to define purpose, scope, success criteria`);
  console.log(`  2. Edit ${path.join(teamDir, 'dependency-graph.md')} to map tasks`);
  console.log(`  3. Run: pnpm ft daily-sync ${name} (when ready to start)`);
}

async function cmdAddMember(args: string[], flags: Record<string, string | boolean>): Promise<void> {
  const teamName = args[0];
  if (!teamName) {
    console.error('Error: Team name required as first argument');
    process.exit(1);
  }
  
  const team = loadTeam(teamName);
  if (!team) {
    console.error(`Error: Team "${teamName}" not found in active teams`);
    process.exit(1);
  }
  
  const role = flags.role as string;
  const person = flags.person as string || 'TBD';
  const type = (flags.type as string) || 'primary';
  
  if (!role || !ROLES.includes(role as Role)) {
    console.error(`Error: --role is required and must be one of: ${ROLES.join(', ')}`);
    process.exit(1);
  }
  
  if (team.members.some(m => m.role === role)) {
    console.error(`Error: Role "${role}" already has a member`);
    process.exit(1);
  }
  
  team.members.push({ role: role as Role, person, type: type as 'primary' | 'delegate' });
  saveTeam(team);
  
  // Update charter.md with new member
  const charterPath = path.join(ACTIVE_DIR, teamName, 'charter.md');
  if (fs.existsSync(charterPath)) {
    let content = fs.readFileSync(charterPath, 'utf-8');
    const memberRow = `| ${role.charAt(0).toUpperCase() + role.slice(1)} | ${person} | ${type} | [handle] |`;
    content = content.replace(
      /(\| CLI \| .* \|.*\n)/,
      `$1${memberRow}\n`
    );
    fs.writeFileSync(charterPath, content);
  }
  
  console.log(`✅ Added ${role}:${person} (${type}) to team "${teamName}"`);
}

async function cmdRecordDecision(args: string[], flags: Record<string, string | boolean>): Promise<void> {
  const teamName = args[0];
  if (!teamName) {
    console.error('Error: Team name required as first argument');
    process.exit(1);
  }
  
  const team = loadTeam(teamName);
  if (!team) {
    console.error(`Error: Team "${teamName}" not found`);
    process.exit(1);
  }
  
  const title = flags.title as string;
  const context = flags.context as string;
  const decision = flags.decision as string;
  const consequences = flags.consequences as string;
  const alternatives = flags.alternatives as string;
  const status = (flags.status as string) || 'Accepted';
  const deciders = (flags.deciders as string) || team.lead;
  const consulted = flags.consulted as string;
  const informed = flags.informed as string;
  
  if (!title || !context || !decision) {
    console.error('Error: --title, --context, and --decision are required');
    process.exit(1);
  }
  
  const adrPath = path.join(ACTIVE_DIR, teamName, 'architecture-decisions.md');
  const existing = fs.readFileSync(adrPath, 'utf-8');
  
  // Find next ADR number
  const adrMatches = existing.match(/ADR-(\d{3})/g);
  const nextNum = adrMatches ? Math.max(...adrMatches.map(m => parseInt(m.split('-')[1]))) + 1 : 1;
  const adrId = `ADR-${String(nextNum).padStart(3, '0')}`;
  
  const adrEntry = `
### ${adrId}: ${title}
- **Status**: ${status}
- **Date**: ${new Date().toISOString().split('T')[0]}
- **Deciders**: ${deciders}
- **Consulted**: ${consulted || 'TBD'}
- **Informed**: ${informed || 'TBD'}

#### Context
${context}

#### Decision
${decision}

#### Consequences
${consequences || 'TBD'}

#### Alternatives Considered
${alternatives || 'TBD'}

#### Links
- Related issue: [#XXX]
- Related PR: [#YYY]
`;

  // Insert after "## Decision Log" table
  const updated = existing.replace(
    /(\| ADR-\d{3} \| .* \|.*\n)/,
    `$1| ${adrId} | ${title} | ${status} | ${new Date().toISOString().split('T')[0]} | ${deciders} |\n`
  ).replace(
    /(## Decision Log)/,
    `$1\n${adrEntry}`
  );
  
  fs.writeFileSync(adrPath, updated);
  
  console.log(`✅ Recorded decision ${adrId}: ${title}`);
}

async function cmdAddRisk(args: string[], flags: Record<string, string | boolean>): Promise<void> {
  const teamName = args[0];
  if (!teamName) {
    console.error('Error: Team name required as first argument');
    process.exit(1);
  }
  
  const team = loadTeam(teamName);
  if (!team) {
    console.error(`Error: Team "${teamName}" not found`);
    process.exit(1);
  }
  
  const desc = flags.desc as string;
  const prob = parseInt(flags.prob as string || '3');
  const impact = parseInt(flags.impact as string || '3');
  const owner = flags.owner as string;
  const category = (flags.category as string) || 'Technical';
  
  if (!desc || !owner) {
    console.error('Error: --desc and --owner are required');
    process.exit(1);
  }
  
  if (!ROLES.includes(owner as Role)) {
    console.error(`Error: Owner must be one of: ${ROLES.join(', ')}`);
    process.exit(1);
  }
  
  const score = prob * impact;
  let severity: 'Low' | 'Medium' | 'High' | 'Critical';
  if (score <= 6) severity = 'Low';
  else if (score <= 12) severity = 'Medium';
  else if (score <= 19) severity = 'High';
  else severity = 'Critical';
  
  const riskPath = path.join(ACTIVE_DIR, teamName, 'risk-register.md');
  const existing = fs.readFileSync(riskPath, 'utf-8');
  
  // Find next risk number
  const riskMatches = existing.match(/R(\d+)/g);
  const nextNum = riskMatches ? Math.max(...riskMatches.map(m => parseInt(m.slice(1)))) + 1 : 1;
  const riskId = `R${nextNum}`;
  
  const today = new Date().toISOString().split('T')[0];
  const riskRow = `| ${riskId} | ${desc} | ${category} | ${prob} | ${impact} | ${score} | ${owner} | Open | TBD | TBD | ${today} |`;
  
  const updated = existing.replace(
    /(\| R\d+ \| .* \|.*\n)(\n|$)/,
    `$1${riskRow}\n$2`
  );
  
  fs.writeFileSync(riskPath, updated);
  
  console.log(`✅ Added risk ${riskId} (${severity}, score=${score}): ${desc}`);
}

async function cmdDailySync(args: string[], flags: Record<string, string | boolean>): Promise<void> {
  const teamName = args[0];
  if (!teamName) {
    console.error('Error: Team name required as first argument');
    process.exit(1);
  }
  
  const team = loadTeam(teamName);
  if (!team) {
    console.error(`Error: Team "${teamName}" not found`);
    process.exit(1);
  }
  
  const today = new Date().toISOString().split('T')[0];
  const template = `# Daily Sync — ${teamName} — ${today}

## Attendees
- [ ] Lead: ${team.members.find(m => m.role === team.lead)?.person || 'TBD'}
${team.members.filter(m => m.role !== team.lead).map(m => `- [ ] ${m.role.charAt(0).toUpperCase() + m.role.slice(1)}: ${m.person}`).join('\n')}

## Yesterday's Progress
| Role | Completed | Notes |
|------|-----------|-------|
| Lead | | |
${team.members.filter(m => m.role !== team.lead).map(m => `| ${m.role.charAt(0).toUpperCase() + m.role.slice(1)} | | |`).join('\n')}

## Today's Focus
| Role | Planned | Blockers |
|------|---------|----------|
| Lead | | |
${team.members.filter(m => m.role !== team.lead).map(m => `| ${m.role.charAt(0).toUpperCase() + m.role.slice(1)} | | |`).join('\n')}

## Cross-Team Dependencies / External Blockers
- 

## Decisions Needed
- 

## Risk Updates
- 

---
*Generated by feature-team-cli. Fill in during sync, then save to retro-notes.md if needed.*
`;
  
  console.log(template);
  
  // Optionally save to file
  if (flags.save) {
    const syncDir = path.join(ACTIVE_DIR, teamName, 'daily-syncs');
    ensureDir(syncDir);
    fs.writeFileSync(path.join(syncDir, `${today}.md`), template);
    console.log(`\n✅ Saved to ${syncDir}/${today}.md`);
  }
}

async function cmdWeeklyRetro(args: string[], flags: Record<string, string | boolean>): Promise<void> {
  const teamName = args[0];
  if (!teamName) {
    console.error('Error: Team name required as first argument');
    process.exit(1);
  }
  
  const team = loadTeam(teamName);
  if (!team) {
    console.error(`Error: Team "${teamName}" not found`);
    process.exit(1);
  }
  
  const weekStart = flags['week-start'] as string || new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0];
  const weekEnd = flags['week-end'] as string || new Date().toISOString().split('T')[0];
  
  const template = `# Weekly Retrospective — ${teamName} — Week of ${weekStart} to ${weekEnd}

## Attendees
- [ ] Lead: ${team.members.find(m => m.role === team.lead)?.person || 'TBD'}
${team.members.filter(m => m.role !== team.lead).map(m => `- [ ] ${m.role.charAt(0).toUpperCase() + m.role.slice(1)}: ${m.person}`).join('\n')}

## What Went Well (Celebrate)
- 
- 
- 

## What Didn't Go Well (Facts, Not Blame)
- 
- 

## Action Items (Max 3, Assigned Owners)
| # | Action | Owner | Due Date | Status |
|---|--------|-------|----------|--------|
| 1 | | | | Open |
| 2 | | | | Open |
| 3 | | | | Open |

## Team Health Check (1-5 Scale)
| Dimension | Score | Notes |
|-----------|-------|-------|
| Psychological Safety | | |
| Clarity of Purpose | | |
| Sustainable Pace | | |
| Cross-Role Collaboration | | |
| Decision Quality | | |

## Blockers Raised This Week
- 

## Decisions Made This Week
- 

---
*Generated by feature-team-cli. Fill in during retro, then append to retro-notes.md*
`;
  
  console.log(template);
  
  if (flags.save) {
    const retroDir = path.join(ACTIVE_DIR, teamName, 'weekly-retros');
    ensureDir(retroDir);
    fs.writeFileSync(path.join(retroDir, `week-${weekStart}.md`), template);
    console.log(`\n✅ Saved to ${retroDir}/week-${weekStart}.md`);
  }
}

async function cmdArchiveTeam(args: string[], flags: Record<string, string | boolean>): Promise<void> {
  const teamName = args[0];
  if (!teamName) {
    console.error('Error: Team name required as first argument');
    process.exit(1);
  }
  
  const activePath = path.join(ACTIVE_DIR, teamName);
  if (!fs.existsSync(activePath)) {
    console.error(`Error: Team "${teamName}" not found in active teams`);
    process.exit(1);
  }
  
  const team = loadTeam(teamName);
  if (!team) {
    console.error(`Error: Could not load team config`);
    process.exit(1);
  }
  
  // Update status
  team.status = 'archived';
  const archivePath = path.join(ARCHIVE_DIR, teamName);
  ensureDir(archivePath);
  
  // Move entire directory
  fs.cpSync(activePath, archivePath, { recursive: true });
  fs.rmSync(activePath, { recursive: true });
  
  // Save updated config in archive
  fs.writeFileSync(path.join(archivePath, 'team.json'), JSON.stringify(team, null, 2));
  
  console.log(`✅ Team "${teamName}" archived to ${archivePath}`);
  console.log(`\nRemember to:`);
  console.log(`  1. Complete end-of-project retrospective`);
  console.log(`  2. Update role contracts with lessons learned`);
  console.log(`  3. Promote org-wide ADRs to .agents/adr/`);
}

async function cmdListTeams(args: string[], flags: Record<string, string | boolean>): Promise<void> {
  const showArchived = flags.archived === true;
  const dir = showArchived ? ARCHIVE_DIR : ACTIVE_DIR;
  
  if (!fs.existsSync(dir)) {
    console.log(`No ${showArchived ? 'archived' : 'active'} teams found.`);
    return;
  }
  
  const teams = fs.readdirSync(dir).filter(f => fs.statSync(path.join(dir, f)).isDirectory());
  
  if (teams.length === 0) {
    console.log(`No ${showArchived ? 'archived' : 'active'} teams found.`);
    return;
  }
  
  console.log(`${showArchived ? 'Archived' : 'Active'} Feature Teams:\n`);
  
  for (const teamName of teams) {
    const configPath = path.join(dir, teamName, 'team.json');
    if (fs.existsSync(configPath)) {
      const team = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      console.log(`  ${team.name}`);
      console.log(`    Status: ${team.status} | Lead: ${team.lead} | Formed: ${team.formedDate}`);
      console.log(`    Members: ${team.members.map((m: TeamMember) => `${m.role}:${m.person}`).join(', ')}`);
      console.log(`    Trigger: ${team.trigger}`);
      console.log('');
    } else {
      console.log(`  ${teamName} (no config)`);
    }
  }
}

function printHelp(): void {
  console.log(`
Feature Team CLI

Usage: pnpm ft <command> [options]

Commands:
  create-team              Create a new feature team
  add-member <team>        Add a member to an existing team
  record-decision <team>   Record an architecture decision (ADR)
  add-risk <team>          Add a risk to the risk register
  daily-sync <team>        Generate daily standup template
  weekly-retro <team>      Generate weekly retrospective template
  archive-team <team>      Archive a completed team
  list [--archived]        List active or archived teams

Options for create-team:
  --name <name>            Team name (default: auto-generated ft-YYYYMMDD-xxxx)
  --lead <role>            Lead role (required): lead, content, frontend, search, quality, build, cli
  --lead-person <name>     Lead person name
  --members <roles>        Comma-separated roles (optionally with :person), e.g., "frontend:jane,content"
  --trigger <type>         Trigger type (required): cross-role-dependency, architectural-decision, tech-debt, strategic-initiative
  --expected-end <date>    Expected end date (YYYY-MM-DD)

Options for add-member:
  --role <role>            Role to add (required)
  --person <name>          Person name (default: TBD)
  --type <type>            primary or delegate (default: primary)

Options for record-decision:
  --title <title>          ADR title (required)
  --context <text>         Context/problem (required)
  --decision <text>        Decision made (required)
  --consequences <text>    Consequences
  --alternatives <text>    Alternatives considered
  --status <status>        Proposed/Accepted/Superseded/Rejected (default: Accepted)
  --deciders <roles>       Decider roles (default: lead)
  --consulted <roles>      Consulted roles
  --informed <roles>       Informed roles

Options for add-risk:
  --desc <text>            Risk description (required)
  --prob <1-5>             Probability (default: 3)
  --impact <1-5>           Impact (default: 3)
  --owner <role>           Owner role (required)
  --category <cat>         Category (default: Technical)

Options for daily-sync / weekly-retro:
  --save                   Save template to team directory
  --week-start <date>      Week start date (weekly-retro only)
  --week-end <date>        Week end date (weekly-retro only)

Examples:
  pnpm ft create-team --name ft-2026-search-redesign --lead search --lead-person "alex" --members "frontend:jane,content:bob,quality:carol" --trigger cross-role-dependency
  pnpm ft add-member ft-2026-search-redesign --role build --person "dave"
  pnpm ft record-decision ft-2026-search-redesign --title "Index sharding" --context "Index too large" --decision "Two shards: posts and pages"
  pnpm ft add-risk ft-2026-search-redesign --desc "Migration corrupts frontmatter" --prob 3 --impact 5 --owner cli
  pnpm ft daily-sync ft-2026-search-redesign --save
  pnpm ft weekly-retro ft-2026-search-redesign --save
  pnpm ft archive-team ft-2026-search-redesign
  pnpm ft list --archived
`);
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const { command, args, flags } = parseArgs(argv);
  
  // Ensure directories exist
  ensureDir(ACTIVE_DIR);
  ensureDir(ARCHIVE_DIR);
  
  switch (command) {
    case 'create-team':
    case 'create':
      await cmdCreateTeam(args, flags);
      break;
    case 'add-member':
    case 'add':
      await cmdAddMember(args, flags);
      break;
    case 'record-decision':
    case 'decision':
    case 'adr':
      await cmdRecordDecision(args, flags);
      break;
    case 'add-risk':
    case 'risk':
      await cmdAddRisk(args, flags);
      break;
    case 'daily-sync':
    case 'sync':
    case 'standup':
      await cmdDailySync(args, flags);
      break;
    case 'weekly-retro':
    case 'retro':
    case 'retrospective':
      await cmdWeeklyRetro(args, flags);
      break;
    case 'archive-team':
    case 'archive':
      await cmdArchiveTeam(args, flags);
      break;
    case 'list':
    case 'ls':
      await cmdListTeams(args, flags);
      break;
    case 'help':
    case '--help':
    case '-h':
    default:
      printHelp();
      break;
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});