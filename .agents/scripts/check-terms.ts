#!/usr/bin/env node
// Term Consistency Checker - AGENTS Knowledge Base Guard
// Validates term usage against CONTEXT.md glossary
// Usage: pnpm exec tsx .agents/scripts/check-terms.ts [--report]

import { parseArgs } from "node:util";
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join, relative, extname } from "node:path";

const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: {
    report: { type: "boolean" },
    help: { type: "boolean", short: "h" },
  },
  strict: true,
  allowPositionals: true,
});

if (values.help) {
  console.log(`
Usage: check-terms [--report]

Checks term usage against CONTEXT.md glossary.

Options:
  --report  Generate JSON report to .agents/reports/term-check-<timestamp>.json
  --help    Show this help
`);
  process.exit(0);
}

const ROOT = process.cwd();
const REPORT_DIR = join(ROOT, ".agents", "reports");
const TARGET_EXTS = [".md", ".ts", ".astro"];

// Load CONTEXT.md glossary
function loadGlossary(): Map<string, string> {
  const contextPath = join(ROOT, "CONTEXT.md");
  if (!existsSync(contextPath)) {
    console.error("❌ CONTEXT.md not found");
    process.exit(1);
  }

  const content = readFileSync(contextPath, "utf-8");
  const glossary = new Map<string, string>();

  // Parse glossary entries: **Term** — Definition
  const lines = content.split("\n");
  let currentTerm = "";
  let currentDef = "";

  for (const line of lines) {
    const termMatch = line.match(/^\*\*(.+?)\*\*\s*[—-]\s*(.+)$/);
    if (termMatch) {
      if (currentTerm) {
        glossary.set(currentTerm.toLowerCase(), currentDef.trim());
      }
      currentTerm = termMatch[1].trim();
      currentDef = termMatch[2].trim();
    } else if (currentTerm && line.trim() && !line.startsWith("|") && !line.startsWith("#")) {
      currentDef += " " + line.trim();
    }
  }
  if (currentTerm) {
    glossary.set(currentTerm.toLowerCase(), currentDef.trim());
  }

  return glossary;
}

function getAllFiles(dir: string, exts: string[]): string[] {
  const files: string[] = [];
  function walk(d: string) {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const full = join(d, entry.name);
      if (entry.isDirectory()) {
        if (!entry.name.startsWith(".") && entry.name !== "node_modules" && entry.name !== "dist" && entry.name !== ".astro") {
          walk(full);
        }
      } else if (exts.includes(extname(entry.name))) {
        files.push(full);
      }
    }
  }
  walk(dir);
  return files;
}

interface TermIssue {
  file: string;
  line: number;
  term: string;
  type: "undefined" | "redefined" | "inconsistent";
  context: string;
  suggestion?: string;
}

function checkFile(content: string, file: string, glossary: Map<string, string>, allTerms: Set<string>): TermIssue[] {
  const issues: TermIssue[] = [];
  const lines = content.split("\n");
  const fileRel = relative(ROOT, file);

  // Skip CONTEXT.md itself (it's the source of truth)
  if (fileRel === "CONTEXT.md") return issues;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Check for term usage (capitalized words that match glossary terms)
    for (const [term, def] of glossary) {
      const termPattern = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
      let match;
      while ((match = termPattern.exec(line)) !== null) {
        const matched = match[0];
        // Check if this usage looks like a definition (has —, :, or "is")
        const contextBefore = line.slice(Math.max(0, match.index - 30), match.index);
        const contextAfter = line.slice(match.index + matched.length, match.index + matched.length + 30);
        const fullContext = contextBefore + matched + contextAfter;

        // Heuristic: if the term is being defined rather than used
        const looksLikeDefinition = /[—:]\s*$/.test(contextBefore) || /\b(is|means|refers to|defined as)\b/i.test(contextAfter);

        if (looksLikeDefinition && fileRel !== "CONTEXT.md") {
          issues.push({
            file: fileRel,
            line: lineNum,
            term: matched,
            type: "redefined",
            context: fullContext.trim(),
            suggestion: `Move definition to CONTEXT.md; use term directly here`,
          });
        }
        // Valid usage - just note it
      }
    }

    // Check for potential undefined terms (capitalized phrases that look like terms)
    const potentialTerms = line.match(/\b[A-Z][a-z]+(?:[A-Z][a-z]+)*\b/g) || [];
    for (const pt of potentialTerms) {
      if (pt.length > 2 && !glossary.has(pt.toLowerCase()) && !allTerms.has(pt.toLowerCase())) {
        // Check if it's a known code identifier (TypeScript, component names, etc.)
        const codeContext = /[<>{}[\]()=;,:]/.test(line);
        if (!codeContext && !/^(The|This|That|These|Those|When|Where|Which|Who|How|Why|If|Then|Else|For|While|Return|Import|Export|Const|Let|Var|Function|Class|Interface|Type|Enum|Async|Await|Promise|Error|Null|Undefined|True|False|String|Number|Boolean|Object|Array|Map|Set|Date|RegExp|JSON|Math|Console|Window|Document|Element|Node|Event|Handler|Listener|Callback|Props|State|Context|Provider|Consumer|Ref|Memo|Effect|Layout|Component|Page|Route|Path|Query|Param|Body|Header|Footer|Main|Section|Article|Aside|Nav|Div|Span|Button|Input|Form|Label|Select|Option|Table|Row|Cell|Head|Body|Title|Meta|Link|Script|Style|Image|Video|Audio|Source|Canvas|Svg|Path|Circle|Rect|Line|Polygon|Text|Group|Defs|Use|Symbol|Marker|ClipPath|Mask|Filter|LinearGradient|RadialGradient|Stop|Animate|AnimateTransform|AnimateMotion|Set|ForeignObject|Switch|Image|View|G|Defs|Symbol|Marker|ClipPath|Mask|Filter|LinearGradient|RadialGradient|Stop|Animate|AnimateTransform|AnimateMotion|Set|ForeignObject|Switch)$/.test(pt)) {
          // Likely a domain term not in glossary
          issues.push({
            file: fileRel,
            line: lineNum,
            term: pt,
            type: "undefined",
            context: line.trim().slice(0, 100),
            suggestion: `Add to CONTEXT.md if it's a domain concept`,
          });
        }
      }
    }
  }

  return issues;
}

function main() {
  console.log("📖 Loading glossary from CONTEXT.md...");
  const glossary = loadGlossary();
  console.log(`  Loaded ${glossary.size} terms`);

  // Build set of all known terms (including code identifiers)
  const allTerms = new Set<string>();
  for (const term of glossary.keys()) {
    allTerms.add(term.toLowerCase());
  }

  // Add common technical terms that shouldn't be flagged
  const techTerms = [
    "typescript", "javascript", "astro", "tailwind", "daisyui", "pagefind",
    "cloudflare", "github", "codeberg", "pinata", "wrangler", "playwright",
    "oxlint", "oxfmt", "husky", "lintstaged", "pnpm", "node", "npm", "yarn",
    "git", "ssh", "http", "https", "api", "rest", "graphql", "json", "yaml",
    "toml", "markdown", "mdx", "html", "css", "svg", "png", "jpg", "webp",
    "avif", "woff", "woff2", "ttf", "eot", "otf", "font", "fontsource",
    "dayjs", "zod", "satteri", "mermaid", "shiki", "remark", "rehype",
    "hast", "mdast", "unist", "vfile", "vnu", "lychee", "cargo", "rust",
    "tsx", "jsx", "esm", "cjs", "umd", "iife", "cli", "gui", "tui", "ui",
    "ux", "ci", "cd", "ssr", "ssg", "spa", "mpa", "pwa", "seo", "ogp",
    "rss", "atom", "xml", "sitemap", "robots", "canonical", "hreflang",
    "i18n", "l10n", "a11y", "i18n", "rtl", "ltr", "dir", "lang", "charset",
    "utf8", "utf16", "ascii", "base64", "hex", "sha256", "md5", "uuid",
    "nanoid", "ulid", "cuid", "ksuid", "xid", "uuidv4", "uuidv7",
  ];
  for (const t of techTerms) allTerms.add(t);

  console.log("🔍 Scanning files for term usage...");
  const files = getAllFiles(ROOT, TARGET_EXTS).filter(f => !f.includes("node_modules") && !f.includes(".git"));
  console.log(`  Scanning ${files.length} files...`);

  let allIssues: TermIssue[] = [];
  for (const file of files) {
    const content = readFileSync(file, "utf-8");
    const issues = checkFile(content, file, glossary, allTerms);
    allIssues.push(...issues);
  }

  // Deduplicate similar issues
  const uniqueIssues = new Map<string, TermIssue>();
  for (const issue of allIssues) {
    const key = `${issue.file}:${issue.line}:${issue.term}:${issue.type}`;
    if (!uniqueIssues.has(key)) {
      uniqueIssues.set(key, issue);
    }
  }

  const issues = Array.from(uniqueIssues.values());
  const undefinedTerms = issues.filter(i => i.type === "undefined");
  const redefinedTerms = issues.filter(i => i.type === "redefined");
  const inconsistentTerms = issues.filter(i => i.type === "inconsistent");

  console.log(`\n📊 Results:`);
  console.log(`  Undefined terms:    ${undefinedTerms.length}`);
  console.log(`  Redefined terms:    ${redefinedTerms.length}`);
  console.log(`  Inconsistent usage: ${inconsistentTerms.length}`);

  if (undefinedTerms.length > 0) {
    console.log("\n❓ Potentially undefined terms:");
    for (const issue of undefinedTerms.slice(0, 20)) {
      console.log(`  ${issue.file}:${issue.line} → "${issue.term}"`);
      console.log(`    Context: ${issue.context}`);
    }
    if (undefinedTerms.length > 20) console.log(`  ... and ${undefinedTerms.length - 20} more`);
  }

  if (redefinedTerms.length > 0) {
    console.log("\n🔄 Redefined terms (should only be in CONTEXT.md):");
    for (const issue of redefinedTerms.slice(0, 10)) {
      console.log(`  ${issue.file}:${issue.line} → "${issue.term}"`);
      console.log(`    Context: ${issue.context}`);
    }
  }

  // JSON report
  if (values.report || issues.length > 0) {
    if (!existsSync(REPORT_DIR)) {
      readdirSync(REPORT_DIR, { recursive: true });
    }
    const reportFile = join(REPORT_DIR, `term-check-${Date.now()}.json`);
    writeFileSync(reportFile, JSON.stringify({
      timestamp: new Date().toISOString(),
      glossarySize: glossary.size,
      filesScanned: files.length,
      totalIssues: issues.length,
      byType: {
        undefined: undefinedTerms.length,
        redefined: redefinedTerms.length,
        inconsistent: inconsistentTerms.length,
      },
      issues: issues.map(i => ({
        file: i.file,
        line: i.line,
        term: i.term,
        type: i.type,
        context: i.context,
        suggestion: i.suggestion,
      })),
    }, null, 2));
    console.log(`\n📄 Report: ${relative(ROOT, reportFile)}`);
  }

  if (issues.length > 0) {
    console.log("\n💡 Review and update CONTEXT.md for undefined terms; move definitions to CONTEXT.md for redefined terms");
    process.exit(1);
  } else {
    console.log("\n✅ All term usage consistent with CONTEXT.md");
  }
}

main().catch(e => {
  console.error("Fatal:", e);
  process.exit(1);
});