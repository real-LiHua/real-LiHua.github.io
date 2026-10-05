#!/usr/bin/env node
// Contract Synchronization Checker - AGENTS Knowledge Base Guard
// Validates that .agents/contracts/*.json matches src/modules/*.ts interfaces
// Usage: pnpm exec tsx .agents/scripts/sync-contracts.ts [--report]

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
Usage: sync-contracts [--report]

Checks that .agents/contracts/*.json matches src/modules/*.ts interfaces.

Options:
  --report  Generate JSON report to .agents/reports/contract-sync-<timestamp>.json
  --help    Show this help
`);
  process.exit(0);
}

const ROOT = process.cwd();
const REPORT_DIR = join(ROOT, ".agents", "reports");
const MODULES_DIR = join(ROOT, "src", "modules");
const CONTRACTS_DIR = join(ROOT, ".agents", "contracts");

interface ContractFile {
  path: string;
  content: any;
  exists: boolean;
}

interface SyncResult {
  timestamp: string;
  modulesChecked: number;
  contractsChecked: number;
  matched: number;
  mismatched: number;
  missingContracts: number;
  missingModules: number;
  details: ContractMismatch[];
}

interface ContractMismatch {
  module: string;
  type: "missing-contract" | "missing-module" | "signature-mismatch" | "version-drift";
  details: string;
  moduleExports?: string[];
  contractKeys?: string[];
}

function getTypeScriptExports(filePath: string): string[] {
  try {
    const content = readFileSync(filePath, "utf-8");
    const exports: string[] = [];

    // Match export const/interface/type/function declarations
    const patterns = [
      /export\s+(?:const|interface|type|function|class)\s+(\w+)/g,
      /export\s+\{\s*([^}]+)\s*\}/g,
      /export\s+default\s+(\w+)/g,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        if (match[1]) {
          // Handle export { a, b, c }
          const names = match[1].split(",").map(s => s.trim().split(/\s+as\s+/)[0].trim());
          exports.push(...names);
        }
      }
    }

    // Also match the main interface object export (e.g., export const contentPipeline: ContentPipeline)
    const mainExportMatch = content.match(/export\s+const\s+(\w+)\s*:\s*(\w+)/);
    if (mainExportMatch) {
      exports.push(mainExportMatch[1]);
    }

    return [...new Set(exports)];
  } catch {
    return [];
  }
}

function getContractKeys(filePath: string): string[] {
  try {
    const content = readFileSync(filePath, "utf-8");
    const json = JSON.parse(content);
    return Object.keys(json);
  } catch {
    return [];
  }
}

function checkModuleContractSync(moduleName: string): ContractMismatch[] {
  const mismatches: ContractMismatch[] = [];
  const modulePath = join(MODULES_DIR, `${moduleName}.ts`);
  const contractPath = join(CONTRACTS_DIR, `${moduleName}.json`);

  const moduleExists = existsSync(modulePath);
  const contractExists = existsSync(contractPath);

  if (!moduleExists && !contractExists) {
    return mismatches;
  }

  if (moduleExists && !contractExists) {
    mismatches.push({
      module: moduleName,
      type: "missing-contract",
      details: `Module ${moduleName}.ts exists but no contract file at ${relative(ROOT, contractPath)}`,
    });
    return mismatches;
  }

  if (!moduleExists && contractExists) {
    mismatches.push({
      module: moduleName,
      type: "missing-module",
      details: `Contract ${moduleName}.json exists but no module at ${relative(ROOT, modulePath)}`,
    });
    return mismatches;
  }

  // Both exist - compare
  const moduleExports = getTypeScriptExports(modulePath);
  const contractKeys = getContractKeys(contractPath);

  // Check for version field in contract
  let contractVersion = "unknown";
  try {
    const contractContent = readFileSync(contractPath, "utf-8");
    const json = JSON.parse(contractContent);
    contractVersion = json.version || "unknown";
  } catch {
    // ignore
  }

  // Check if main interface matches
  const mainInterface = moduleExports.find(e => e === moduleName || e === moduleName.replace(/-/g, "") || e.endsWith(moduleName.charAt(0).toUpperCase() + moduleName.slice(1)));

  if (moduleExports.length > 0 && contractKeys.length > 0) {
    const missingInContract = moduleExports.filter(e => !contractKeys.includes(e));
    const missingInModule = contractKeys.filter(k => !moduleExports.includes(k));

    if (missingInContract.length > 0) {
      mismatches.push({
        module: moduleName,
        type: "signature-mismatch",
        details: `Exports in module but not in contract: ${missingInContract.join(", ")}`,
        moduleExports,
        contractKeys,
      });
    }

    if (missingInModule.length > 0) {
      mismatches.push({
        module: moduleName,
        type: "signature-mismatch",
        details: `Keys in contract but not exported by module: ${missingInModule.join(", ")}`,
        moduleExports,
        contractKeys,
      });
    }

    if (missingInContract.length === 0 && missingInModule.length === 0) {
      // Check version drift - contract should have version
      if (contractVersion === "unknown") {
        mismatches.push({
          module: moduleName,
          type: "version-drift",
          details: `Contract missing version field`,
          moduleExports,
          contractKeys,
        });
      }
    }
  }

  return mismatches;
}

function main() {
  console.log("🔗 Checking contract synchronization...");

  if (!existsSync(MODULES_DIR)) {
    console.error(`❌ Modules directory not found: ${MODULES_DIR}`);
    process.exit(1);
  }

  if (!existsSync(CONTRACTS_DIR)) {
    console.error(`❌ Contracts directory not found: ${CONTRACTS_DIR}`);
    process.exit(1);
  }

  // Get all module files
  const moduleFiles = readdirSync(MODULES_DIR)
    .filter(f => f.endsWith(".ts") && f !== "index.ts")
    .map(f => f.replace(/\.ts$/, ""));

  const contractFiles = readdirSync(CONTRACTS_DIR)
    .filter(f => f.endsWith(".json"))
    .map(f => f.replace(/\.json$/, ""));

  console.log(`  Found ${moduleFiles.length} modules, ${contractFiles.length} contracts`);

  let allMismatches: ContractMismatch[] = [];

  for (const module of moduleFiles) {
    const mismatches = checkModuleContractSync(module);
    allMismatches.push(...mismatches);
  }

  // Check for contracts without modules
  for (const contract of contractFiles) {
    if (!moduleFiles.includes(contract)) {
      allMismatches.push({
        module: contract,
        type: "missing-module",
        details: `Contract ${contract}.json exists but no module at src/modules/${contract}.ts`,
      });
    }
  }

  const result: SyncResult = {
    timestamp: new Date().toISOString(),
    modulesChecked: moduleFiles.length,
    contractsChecked: contractFiles.length,
    matched: moduleFiles.filter(m => !allMismatches.some(mm => mm.module === m)).length,
    mismatched: allMismatches.filter(m => m.type === "signature-mismatch").length,
    missingContracts: allMismatches.filter(m => m.type === "missing-contract").length,
    missingModules: allMismatches.filter(m => m.type === "missing-module").length,
    details: allMismatches,
  };

  console.log(`\n📊 Results:`);
  console.log(`  Modules checked:    ${result.modulesChecked}`);
  console.log(`  Contracts checked:  ${result.contractsChecked}`);
  console.log(`  ✅ Matched:         ${result.matched}`);
  console.log(`  ❌ Mismatched:      ${result.mismatched}`);
  console.log(`  📄 Missing contracts: ${result.missingContracts}`);
  console.log(`  📦 Missing modules:   ${result.missingModules}`);

  if (allMismatches.length > 0) {
    console.log("\n🔍 Details:");
    for (const m of allMismatches) {
      const icon = m.type === "missing-contract" ? "📄" : m.type === "missing-module" ? "📦" : m.type === "version-drift" ? "🔢" : "⚠️";
      console.log(`  ${icon} ${m.module}: ${m.details}`);
      if (m.moduleExports) console.log(`     Module exports: [${m.moduleExports.join(", ")}]`);
      if (m.contractKeys) console.log(`     Contract keys:  [${m.contractKeys.join(", ")}]`);
    }
  }

  // JSON report
  if (values.report || allMismatches.length > 0) {
    if (!existsSync(REPORT_DIR)) {
      readdirSync(REPORT_DIR, { recursive: true });
    }
    const reportFile = join(REPORT_DIR, `contract-sync-${Date.now()}.json`);
    writeFileSync(reportFile, JSON.stringify(result, null, 2));
    console.log(`\n📄 Report: ${relative(ROOT, reportFile)}`);
  }

  if (allMismatches.length > 0) {
    console.log("\n💡 Fix mismatches: update contract files to match module exports, or vice versa");
    process.exit(1);
  } else {
    console.log("\n✅ All contracts synchronized with modules");
  }
}

main().catch(e => {
  console.error("Fatal:", e);
  process.exit(1);
});