/**
 * Environment variable validation script.
 *
 * Validates that all required environment variables are set for the
 * current environment. Checks local .env files for development and
 * Convex CLI for production.
 *
 * Usage:
 *   bun run scripts/env-check.ts          # Check local dev environment
 *   bun run scripts/env-check.ts --prod   # Check production Convex env vars
 */

const PASS = "[PASS]";
const FAIL = "[FAIL]";
const WARN = "[WARN]";

let hasFailure = false;

function pass(message: string) {
  console.log(`  ${PASS} ${message}`);
}

function fail(message: string) {
  console.log(`  ${FAIL} ${message}`);
  hasFailure = true;
}

function warn(message: string) {
  console.log(`  ${WARN} ${message}`);
}

const isProd = process.argv.includes("--prod");

console.log(`\n=== Environment Check (${isProd ? "PRODUCTION" : "DEVELOPMENT"}) ===\n`);

// -------------------------------------------------------
// Frontend variables (from .env files or process.env)
// -------------------------------------------------------
console.log("Frontend variables (VITE_*):");

const frontendVars: { name: string; required: boolean; description: string }[] = [
  { name: "VITE_CONVEX_URL", required: true, description: "Convex deployment cloud URL" },
  { name: "VITE_CLERK_PUBLISHABLE_KEY", required: true, description: "Clerk publishable key" },
];

if (!isProd) {
  // In development, check .env.local and .env.development files
  let envContent = "";
  try {
    envContent += await Bun.file(".env.local").text();
  } catch { /* file may not exist */ }
  try {
    envContent += "\n" + await Bun.file(".env.development").text();
  } catch { /* file may not exist */ }

  for (const v of frontendVars) {
    const regex = new RegExp(`^${v.name}=.+`, "m");
    if (regex.test(envContent)) {
      pass(`${v.name} is set (${v.description})`);
    } else if (v.required) {
      fail(`${v.name} is NOT set (${v.description})`);
    } else {
      warn(`${v.name} is NOT set (${v.description})`);
    }
  }

  // Check CONVEX_DEPLOYMENT
  console.log("\nConvex CLI variables:");
  const convexDeploymentRegex = /^CONVEX_DEPLOYMENT=.+/m;
  if (convexDeploymentRegex.test(envContent)) {
    pass("CONVEX_DEPLOYMENT is set");
  } else {
    fail("CONVEX_DEPLOYMENT is NOT set (required for npx convex dev)");
  }
} else {
  console.log("  (Frontend vars must be configured in your hosting platform build settings)");
  for (const v of frontendVars) {
    warn(`Verify ${v.name} is set in your hosting platform's environment settings`);
  }
}

// -------------------------------------------------------
// Convex server-side environment variables
// -------------------------------------------------------
console.log("\nConvex server-side variables:");

const convexVars: { name: string; required: boolean; description: string }[] = [
  { name: "CLERK_JWT_ISSUER_DOMAIN", required: true, description: "Clerk JWT issuer domain" },
  { name: "CLERK_WEBHOOK_SECRET", required: true, description: "Svix signing secret for Clerk webhooks" },
  { name: "ADMIN_EMAIL", required: false, description: "Admin user email" },
];

if (isProd) {
  // In production mode, check via Convex CLI
  console.log("  Checking via `npx convex env list --prod`...\n");
  try {
    const { $: shell } = await import("bun");
    const result = await shell`npx convex env list --prod`.quiet();
    const envOutput = result.stdout.toString();

    for (const v of convexVars) {
      if (envOutput.includes(v.name)) {
        pass(`${v.name} is set on production deployment (${v.description})`);
      } else if (v.required) {
        fail(`${v.name} is NOT set on production deployment (${v.description})`);
      } else {
        warn(`${v.name} is NOT set on production deployment (${v.description})`);
      }
    }
  } catch (e: any) {
    fail("Could not list Convex environment variables. Are you logged in? Run `npx convex login`.");
    if (e.stderr) console.log(`    ${e.stderr.toString().trim()}`);
  }
} else {
  // In development, Convex env vars are set on the dev deployment
  console.log("  (Convex env vars for dev are set via `npx convex env set VAR value`)");
  for (const v of convexVars) {
    if (v.required) {
      warn(`Verify ${v.name} is set on your dev deployment: npx convex env list`);
    }
  }
}

// -------------------------------------------------------
// Summary
// -------------------------------------------------------
console.log("\n=== Summary ===\n");
if (hasFailure) {
  console.log("  ISSUES FOUND: One or more required environment variables are missing.\n");
  process.exit(1);
} else {
  console.log("  All checked environment variables look good.\n");
  process.exit(0);
}
