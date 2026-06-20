/**
 * Migration script: 2-layer → 3-layer CMS model
 *
 * What it does:
 *   1. Reads src/data/section-definitions.json
 *   2. For each definition, extracts its `fields[]` into a standalone Field Schema
 *      (stored in src/data/field-schemas.json) with key `{def.key}_schema`
 *   3. Rewrites each definition to reference its schema via `schema_ref`
 *      and removes the inline `fields[]` and `category` properties
 *
 * Usage:
 *   node scripts/migrate-to-3-layer.mjs          → dry-run (no writes)
 *   node scripts/migrate-to-3-layer.mjs --apply  → write changes to disk
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const DEFINITIONS_PATH = path.join(ROOT, "src/data/section-definitions.json");
const SCHEMAS_PATH = path.join(ROOT, "src/data/field-schemas.json");
const BACKUP_PATH = path.join(ROOT, "src/data/section-definitions.backup.json");

const APPLY = process.argv.includes("--apply");

// ─── Helpers ────────────────────────────────────────────────────────────────

function readJson(filePath, fallback = []) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch (e) {
    console.error(`  ERROR reading ${filePath}:`, e.message);
    return fallback;
  }
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

function hr(char = "─", width = 64) {
  return char.repeat(width);
}

/**
 * Canonical fingerprint for a fields[] array.
 * Sort keys within each field object, then sort the array by field name so
 * order differences don't produce spurious unique schemas.
 */
function fingerprintFields(fields) {
  if (!Array.isArray(fields) || fields.length === 0) return "[]";
  const normalised = fields
    .map(f => {
      const sorted = {};
      Object.keys(f).sort().forEach(k => { sorted[k] = f[k]; });
      return sorted;
    })
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  return JSON.stringify(normalised);
}

// ─── Main ────────────────────────────────────────────────────────────────────

const existingDefs = readJson(DEFINITIONS_PATH);
const existingSchemas = readJson(SCHEMAS_PATH);

if (existingDefs.length === 0) {
  console.log("No section definitions found — nothing to migrate.");
  process.exit(0);
}

// Build a set of already-migrated schema keys so we don't duplicate
const existingSchemaKeys = new Set(existingSchemas.map(s => s.schema_key));

const newSchemas = [...existingSchemas];
const newDefinitions = [];
const report = [];

// ── Deduplication pass ──────────────────────────────────────────────────────
// Group definitions that share identical fields[] into a single schema.
// Key: fingerprint string → { schemaKey, schemaName, fields, defKeys[] }
const fingerprintMap = new Map();

// Seed with already-existing schemas so we don't re-create them
for (const s of existingSchemas) {
  const fp = fingerprintFields(s.fields);
  if (!fingerprintMap.has(fp)) {
    fingerprintMap.set(fp, { schemaKey: s.schema_key, schemaName: s.schema_name, fields: s.fields, defKeys: [], isExisting: true });
  }
}

// First pass: assign each definition to a fingerprint bucket
for (const def of existingDefs) {
  const fields = Array.isArray(def.fields) ? def.fields : [];
  const fp = fingerprintFields(fields);

  if (!fingerprintMap.has(fp)) {
    // New unique field set — derive a schema key from the first def that owns it
    const schemaKey = `${def.key}_schema`;
    const schemaName = `${def.name} Fields`;
    fingerprintMap.set(fp, { schemaKey, schemaName, fields, defKeys: [def.key], isExisting: false });
  } else {
    const bucket = fingerprintMap.get(fp);
    if (!bucket.isExisting) {
      bucket.defKeys.push(def.key);
    }
  }
}

// Second pass: build schemas and rewritten definitions
for (const def of existingDefs) {
  const fields = Array.isArray(def.fields) ? def.fields : [];
  const fp = fingerprintFields(fields);
  const bucket = fingerprintMap.get(fp);

  const schemaKey = bucket.schemaKey;
  let schemaAction;

  if (bucket.isExisting) {
    schemaAction = `SKIP (already exists as ${schemaKey})`;
  } else if (existingSchemaKeys.has(schemaKey)) {
    schemaAction = `SKIP (already exists)`;
  } else {
    // Only create the schema once (on first encounter)
    if (!existingSchemaKeys.has(schemaKey)) {
      newSchemas.push({ schema_key: schemaKey, schema_name: bucket.schemaName, fields });
      existingSchemaKeys.add(schemaKey);
      const sharedBy = bucket.defKeys.length;
      schemaAction = sharedBy > 1
        ? `CREATE  →  ${fields.length} field(s)  [SHARED by ${sharedBy} defs: ${bucket.defKeys.join(", ")}]`
        : `CREATE  →  ${fields.length} field(s)`;
    } else {
      schemaAction = `SKIP (already queued)`;
    }
  }

  // Build new definition — drop `fields` and `category`, add `schema_ref`
  const {
    fields: _removedFields,
    category: _removedCategory,
    ...restDef
  } = def;

  newDefinitions.push({ ...restDef, schema_ref: schemaKey });

  report.push({
    defKey: def.key,
    defName: def.name,
    category: def.category || "(none)",
    fieldCount: fields.length,
    schemaKey,
    schemaAction
  });
}

// ─── Print dry-run report ────────────────────────────────────────────────────

console.log("\n" + hr("═"));
console.log("  3-LAYER MIGRATION REPORT" + (APPLY ? " — APPLYING CHANGES" : " — DRY RUN (no writes)"));
console.log(hr("═"));

console.log(`\n  Source:  ${DEFINITIONS_PATH}`);
console.log(`  Schemas: ${SCHEMAS_PATH}`);
if (APPLY) {
  console.log(`  Backup:  ${BACKUP_PATH}`);
}

console.log("\n" + hr());
console.log("  DEFINITIONS TO MIGRATE");
console.log(hr());

for (const r of report) {
  console.log(`\n  [${r.defKey}]  "${r.defName}"  (was category: ${r.category})`);
  console.log(`    Schema key  →  ${r.schemaKey}`);
  console.log(`    Fields      →  ${r.fieldCount} field(s)`);
  console.log(`    Schema op   →  ${r.schemaAction}`);
}

console.log("\n" + hr());
console.log("  SUMMARY");
console.log(hr());

const schemasCreated = report.filter(r => r.schemaAction.startsWith("CREATE")).length;
const schemasSkipped = report.filter(r => r.schemaAction.startsWith("SKIP")).length;

console.log(`\n  Definitions processed : ${report.length}`);
console.log(`  Field Schemas created : ${schemasCreated}`);
console.log(`  Field Schemas skipped : ${schemasSkipped} (already exist)`);
console.log(`  Fields removed from   : ${report.length} definition(s) (category + fields[])`);

if (!APPLY) {
  console.log(`\n  ⚠  DRY RUN — no files were modified.`);
  console.log(`     Re-run with --apply to write changes:\n`);
  console.log(`       node scripts/migrate-to-3-layer.mjs --apply\n`);
  process.exit(0);
}

// ─── Apply changes ───────────────────────────────────────────────────────────

// 1. Back up original definitions
writeJson(BACKUP_PATH, existingDefs);
console.log(`\n  ✔  Backup saved to: ${BACKUP_PATH}`);

// 2. Write updated field-schemas.json
writeJson(SCHEMAS_PATH, newSchemas);
console.log(`  ✔  Field schemas written: ${SCHEMAS_PATH} (${newSchemas.length} total)`);

// 3. Write updated section-definitions.json
writeJson(DEFINITIONS_PATH, newDefinitions);
console.log(`  ✔  Section definitions updated: ${DEFINITIONS_PATH} (${newDefinitions.length} entries)`);

console.log("\n" + hr("═"));
console.log("  MIGRATION COMPLETE");
console.log(hr("═") + "\n");
