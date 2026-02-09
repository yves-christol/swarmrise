/**
 * Pre-deployment validation script.
 *
 * Runs all checks that must pass before deploying to production.
 * Exit code 0 = all checks passed, exit code 1 = one or more checks failed.
 *
 * Usage:
 *   bun run scripts/pre-deploy-check.ts
 */

import { $ } from "bun";

const PASS = "[PASS]";
const FAIL = "[FAIL]";
const WARN = "[WARN]";

let hasFailure = false;
let hasWarning = false;

function pass(message: string) {
  console.log(`  ${PASS} ${message}`);
}

function fail(message: string) {
  console.log(`  ${FAIL} ${message}`);
  hasFailure = true;
}

function warn(message: string) {
  console.log(`  ${WARN} ${message}`);
  hasWarning = true;
}

console.log("\n=== Pre-Deploy Checks ===\n");

// -------------------------------------------------------
// 1. TypeScript compilation
// -------------------------------------------------------
console.log("1. TypeScript compilation");
try {
  const tsc = await $`tsc -b`.quiet();
  if (tsc.exitCode === 0) {
    pass("TypeScript compiles with no errors");
  } else {
    fail("TypeScript compilation failed");
    console.log(tsc.stderr.toString());
  }
} catch (e: any) {
  fail("TypeScript compilation failed");
  if (e.stderr) console.log(e.stderr.toString());
}

// -------------------------------------------------------
// 2. ESLint
// -------------------------------------------------------
console.log("\n2. ESLint");
try {
  const lint = await $`bunx eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0`.quiet();
  if (lint.exitCode === 0) {
    pass("ESLint passes with no errors or warnings");
  } else {
    fail("ESLint has errors or warnings (max-warnings 0)");
  }
} catch (e: any) {
  fail("ESLint has errors or warnings (max-warnings 0)");
  if (e.stderr) {
    const stderr = e.stderr.toString();
    if (stderr.includes("problems")) {
      console.log(`    ${stderr.split("\n").filter((l: string) => l.includes("problems")).join("")}`);
    }
  }
  if (e.stdout) {
    const stdout = e.stdout.toString();
    // Show summary line only
    const lines = stdout.split("\n");
    const summaryLine = lines.find((l: string) => l.includes("problems") || l.includes("warnings"));
    if (summaryLine) console.log(`    ${summaryLine.trim()}`);
  }
}

// -------------------------------------------------------
// 3. Vite build
// -------------------------------------------------------
console.log("\n3. Vite build");
try {
  const build = await $`bunx vite build`.quiet();
  if (build.exitCode === 0) {
    pass("Vite build succeeds");
  } else {
    fail("Vite build failed");
  }
} catch (e: any) {
  fail("Vite build failed");
  if (e.stderr) console.log(e.stderr.toString().slice(0, 500));
}

// -------------------------------------------------------
// 4. Check for console.log in Convex functions
// -------------------------------------------------------
console.log("\n4. console.log in Convex functions");
try {
  // Search for console.log (but not console.error or console.warn) in convex/ directory
  // Exclude _generated/ directory
  const grep = await $`grep -rn "console\.log" convex/ --include="*.ts" --exclude-dir="_generated"`.quiet();
  const output = grep.stdout.toString().trim();
  if (output) {
    const lines = output.split("\n");
    warn(`Found ${lines.length} console.log statement(s) in Convex functions:`);
    for (const line of lines.slice(0, 5)) {
      console.log(`    ${line}`);
    }
    if (lines.length > 5) {
      console.log(`    ... and ${lines.length - 5} more`);
    }
  } else {
    pass("No console.log statements in Convex functions");
  }
} catch {
  // grep returns exit code 1 when no matches found -- that is a pass
  pass("No console.log statements in Convex functions");
}

// -------------------------------------------------------
// 5. Check for filter() on Convex query builders (should use withIndex)
// -------------------------------------------------------
console.log("\n5. Convex query .filter() usage (should use .withIndex())");
try {
  // Look specifically for Convex query builder .filter() patterns:
  //   .query("table").filter(...)  or  .filter((q) => ...)
  // This avoids false positives from Array.filter() on in-memory arrays
  const grep = await $`grep -rn "\.filter((q)" convex/ --include="*.ts" --exclude-dir="_generated"`.quiet();
  const output = grep.stdout.toString().trim();
  if (output) {
    const lines = output.split("\n");
    warn(`Found ${lines.length} Convex query .filter() call(s) (should use .withIndex()):`);
    for (const line of lines.slice(0, 5)) {
      console.log(`    ${line}`);
    }
    if (lines.length > 5) {
      console.log(`    ... and ${lines.length - 5} more`);
    }
  } else {
    pass("No Convex query .filter() calls found (Array.filter is OK)");
  }
} catch {
  pass("No Convex query .filter() calls found (Array.filter is OK)");
}

// -------------------------------------------------------
// 6. Verify .env.example documents all required variables
// -------------------------------------------------------
console.log("\n6. Environment variable documentation");
const requiredFrontendVars = ["VITE_CONVEX_URL", "VITE_CLERK_PUBLISHABLE_KEY"];
const requiredConvexVars = ["CLERK_JWT_ISSUER_DOMAIN"];
const recommendedConvexVars = ["CLERK_WEBHOOK_SECRET", "ADMIN_EMAIL"];

try {
  const envExample = await Bun.file("./env.example").text().catch(() =>
    Bun.file("./.env.example").text()
  );

  for (const v of [...requiredFrontendVars, ...requiredConvexVars]) {
    if (envExample.includes(v)) {
      pass(`${v} documented in .env.example`);
    } else {
      fail(`${v} is NOT documented in .env.example`);
    }
  }

  for (const v of recommendedConvexVars) {
    if (envExample.includes(v)) {
      pass(`${v} documented in .env.example`);
    } else {
      warn(`${v} is NOT documented in .env.example (used in Convex functions, set via npx convex env set)`);
    }
  }
} catch {
  warn("Could not read .env.example file");
}

// -------------------------------------------------------
// Summary
// -------------------------------------------------------
console.log("\n=== Summary ===\n");
if (hasFailure) {
  console.log("  DEPLOYMENT BLOCKED: One or more checks failed. Fix the issues above before deploying.\n");
  process.exit(1);
} else if (hasWarning) {
  console.log("  DEPLOYMENT POSSIBLE WITH WARNINGS: Review the warnings above. Consider fixing before deploying.\n");
  process.exit(0);
} else {
  console.log("  ALL CHECKS PASSED: Ready to deploy.\n");
  process.exit(0);
}
