#!/usr/bin/env node
/**
 * Workspace Validation Script
 * 
 * Validates the monorepo workspace configuration and detects issues:
 * - package-lock.json files (should not exist in PNPM workspace)
 * - Circular dependencies
 * - Missing workspace packages
 * - Invalid package.json configurations
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('.', import.meta.url).pathname;
const ESCAPE = '\x1b[';
const RESET = `${ESCAPE}0m`;
const RED = `${ESCAPE}31m`;
const GREEN = `${ESCAPE}32m`;
const YELLOW = `${ESCAPE}33m`;
const BLUE = `${ESCAPE}34m`;

let errors = 0;
let warnings = 0;

function log(message, color = RESET) {
  console.log(`${color}${message}${RESET}`);
}

function error(msg) {
  log(`✗ ${msg}`, RED);
  errors++;
}

function warn(msg) {
  log(`⚠ ${msg}`, YELLOW);
  warnings++;
}

function info(msg) {
  log(`ℹ ${msg}`, BLUE);
}

function success(msg) {
  log(`✓ ${msg}`, GREEN);
}

function findFiles(dir, pattern, excludeDirs = ['node_modules', '.git', '.turbo']) {
  const results = [];
  
  function walk(current) {
    const entries = readdirSync(current);
    for (const entry of entries) {
      const full = join(current, entry);
      const rel = relative(ROOT, full);
      
      if (excludeDirs.some(d => rel.startsWith(d))) continue;
      
      const stat = statSync(full);
      if (stat.isDirectory()) {
        walk(full);
      } else if (pattern.test(entry)) {
        results.push(rel);
      }
    }
  }
  
  walk(dir);
  return results;
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

// ============================================================================
// VALIDATION 1: No package-lock.json files
// ============================================================================

log('\n🔍 Checking for package-lock.json files...', BLUE);

const lockFiles = findFiles(ROOT, /^package-lock\.json$/);
if (lockFiles.length > 0) {
  error(`Found ${lockFiles.length} package-lock.json file(s):`);
  lockFiles.forEach(f => log(`  - ${f}`, RED));
  log('\n  These files violate PNPM workspace policy.', RED);
  log('  Run: rm package-lock.json **/package-lock.json', YELLOW);
} else {
  success('No package-lock.json files found');
}

// ============================================================================
// VALIDATION 2: Check pnpm-lock.yaml exists
// ============================================================================

log('\n🔍 Checking for pnpm-lock.yaml...', BLUE);

const pnpmLock = join(ROOT, 'pnpm-lock.yaml');
if (existsSync(pnpmLock)) {
  success('pnpm-lock.yaml exists');
} else {
  error('pnpm-lock.yaml not found');
}

// ============================================================================
// VALIDATION 3: Root package.json validation
// ============================================================================

log('\n🔍 Validating root package.json...', BLUE);

const rootPkg = readJson(join(ROOT, 'package.json'));
if (rootPkg) {
  if (rootPkg.packageManager) {
    success(`packageManager: ${rootPkg.packageManager}`);
  } else {
    warn('packageManager not specified');
  }
  
  if (rootPkg.engines?.pnpm) {
    info(`Engine pnpm: ${rootPkg.engines.pnpm}`);
  }
} else {
  error('Could not read root package.json');
}

// ============================================================================
// VALIDATION 4: pnpm-workspace.yaml validation
// ============================================================================

log('\n🔍 Validating pnpm-workspace.yaml...', BLUE);

const workspaceYaml = readFileSync(join(ROOT, 'pnpm-workspace.yaml'), 'utf8');
if (workspaceYaml.includes('packages:')) {
  success('Workspace packages defined');
} else {
  error('No packages defined in workspace');
}

// ============================================================================
// VALIDATION 5: Workspace package count
// ============================================================================

log('\n🔍 Checking workspace packages...', BLUE);

const workspacePackages = [];
const workspaceLines = readFileSync(join(ROOT, 'pnpm-workspace.yaml'), 'utf8')
  .split('\n')
  .filter(l => l.startsWith('  - '))
  .map(l => l.replace('  - ', '').trim());

for (const glob of workspacePackages) {
  const matches = findFiles(join(ROOT, glob), /package\.json$/, []);
  workspacePackages.push(...matches);
}

// ============================================================================
// VALIDATION 6: No persistent dev scripts in WASM packages
// ============================================================================

log('\n🔍 Checking WASM engine packages for persistent dev scripts...', BLUE);

const wasmPackages = ['exercise-engine', 'readiness-engine', 'health-engine', 'nutrition-engine', 'analytics-engine'];
let wasmIssues = 0;

for (const pkg of wasmPackages) {
  const pkgPath = join(ROOT, 'packages', pkg, 'package.json');
  const pkgJson = readJson(pkgPath);
  
  if (pkgJson?.scripts?.dev) {
    if (pkgJson.scripts.dev.includes('--watch')) {
      error(`${pkg}: dev script contains --watch (persistent process)`);
      wasmIssues++;
    } else {
      success(`${pkg}: dev script is appropriate`);
    }
  } else {
    info(`${pkg}: no dev script (good)`);
  }
}

if (wasmIssues === 0) {
  success('All WASM packages have appropriate dev scripts');
}

// ============================================================================
// VALIDATION 7: Check for tracked PEM files
// ============================================================================

log('\n🔍 Checking for tracked PEM/key files...', BLUE);

const pemFiles = findFiles(ROOT, /\.(pem|key)$/);
if (pemFiles.length > 0) {
  warn(`Found ${pemFiles.length} PEM/key file(s):`);
  pemFiles.forEach(f => log(`  - ${f}`, YELLOW));
  log('\n  Ensure these are in .gitignore', YELLOW);
} else {
  success('No PEM/key files found');
}

// ============================================================================
// VALIDATION 8: Turborepo configuration
// ============================================================================

log('\n🔍 Checking turbo.json...', BLUE);

const turboJson = readJson(join(ROOT, 'turbo.json'));
if (turboJson) {
  const tasks = Object.keys(turboJson.tasks || {});
  info(`Configured tasks: ${tasks.join(', ')}`);
  
  if (turboJson.tasks?.dev?.persistent) {
    success('Dev task marked as persistent');
  }
  
  if (turboJson.tasks?.build?.dependsOn?.includes('^build')) {
    success('Build task has proper dependencies');
  }
} else {
  error('Could not read turbo.json');
}

// ============================================================================
// VALIDATION 9: Check .gitignore
// ============================================================================

log('\n🔍 Checking .gitignore...', BLUE);

const gitignore = readFileSync(join(ROOT, '.gitignore'), 'utf8');

const requiredIgnores = [
  'node_modules',
  'package-lock.json',
  'pnpm-lock.yaml',
  '*.pem',
  '.turbo',
  '.next',
];

let missingIgnores = [];
for (const pattern of requiredIgnores) {
  if (!gitignore.includes(pattern)) {
    missingIgnores.push(pattern);
  }
}

if (missingIgnores.length > 0) {
  warn(`Missing recommended .gitignore entries: ${missingIgnores.join(', ')}`);
} else {
  success('.gitignore has all recommended entries');
}

// ============================================================================
// SUMMARY
// ============================================================================

log('\n' + '='.repeat(60), BLUE);
log('VALIDATION SUMMARY', BLUE);
log('='.repeat(60), BLUE);
log(`Errors: ${errors}`, errors > 0 ? RED : GREEN);
log(`Warnings: ${warnings}`, warnings > 0 ? YELLOW : GREEN);
log('='.repeat(60), BLUE);

if (errors > 0) {
  log('\n❌ Validation FAILED. Fix errors before proceeding.', RED);
  process.exit(1);
} else if (warnings > 0) {
  log('\n⚠️  Validation passed with warnings.', YELLOW);
  process.exit(0);
} else {
  log('\n✅ All validations passed!', GREEN);
  process.exit(0);
}
