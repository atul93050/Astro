import type { APIRoute } from "astro";
import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

export const prerender = false;

const SCHEMAS_PATH = path.resolve("src/data/field-schemas.json");
const DEFINITIONS_PATH = path.resolve("src/data/section-definitions.json");
const SECTIONS_DIR = path.resolve("src/content/sections");

function readSchemas(): any[] {
  try {
    if (!fs.existsSync(SCHEMAS_PATH)) return [];
    return JSON.parse(fs.readFileSync(SCHEMAS_PATH, "utf-8"));
  } catch (e) {
    console.error("Failed to read field schemas:", e);
    return [];
  }
}

function writeSchemas(schemas: any[]): void {
  fs.writeFileSync(SCHEMAS_PATH, JSON.stringify(schemas, null, 2), "utf-8");
}

function readDefinitions(): any[] {
  try {
    if (!fs.existsSync(DEFINITIONS_PATH)) return [];
    return JSON.parse(fs.readFileSync(DEFINITIONS_PATH, "utf-8"));
  } catch (e) {
    return [];
  }
}

/**
 * Detect field renames by comparing old vs new fields arrays positionally.
 * A rename is defined as: same array index, same `type`, different `name`.
 * Returns a map of { oldName → newName } for renamed fields only.
 */
function detectRenames(oldFields: any[], newFields: any[]): Record<string, string> {
  const renames: Record<string, string> = {};
  const minLen = Math.min(oldFields.length, newFields.length);
  for (let i = 0; i < minLen; i++) {
    const o = oldFields[i];
    const n = newFields[i];
    if (o?.name && n?.name && o.name !== n.name && o.type === n.type) {
      renames[o.name] = n.name;
    }
  }
  return renames;
}

/**
 * Recursively rename keys inside a data object.
 * `renames` maps oldKey → newKey; applied at any depth including inside arrays.
 */
function applyRenames(obj: any, renames: Record<string, string>): { changed: boolean; data: any } {
  if (Array.isArray(obj)) {
    let changed = false;
    const arr = obj.map(item => {
      const r = applyRenames(item, renames);
      if (r.changed) changed = true;
      return r.data;
    });
    return { changed, data: arr };
  }
  if (obj !== null && typeof obj === "object") {
    let changed = false;
    const out: any = {};
    for (const [k, v] of Object.entries(obj)) {
      const newKey = renames[k] ?? k;
      if (newKey !== k) changed = true;
      const r = applyRenames(v, renames);
      if (r.changed) changed = true;
      out[newKey] = r.data;
    }
    return { changed, data: out };
  }
  return { changed: false, data: obj };
}

/**
 * Scan all section .md files that belong to definitions using `schemaKey`,
 * apply field renames to their YAML data, and write back any changed files.
 * Returns a report of what was migrated.
 */
function migrateInstanceRenames(
  schemaKey: string,
  renames: Record<string, string>,
  definitions: any[]
): { migratedFiles: string[]; skippedFiles: string[] } {
  const migratedFiles: string[] = [];
  const skippedFiles: string[] = [];

  if (!fs.existsSync(SECTIONS_DIR)) return { migratedFiles, skippedFiles };

  // Find which definition keys use this schema
  const defKeys = new Set(
    definitions.filter((d: any) => d.schema_ref === schemaKey).map((d: any) => d.key)
  );
  if (defKeys.size === 0) return { migratedFiles, skippedFiles };

  const files = fs.readdirSync(SECTIONS_DIR).filter(f => f.endsWith(".md"));

  for (const file of files) {
    const filePath = path.join(SECTIONS_DIR, file);
    try {
      const raw = fs.readFileSync(filePath, "utf-8");
      const parts = raw.split(/^---$/m);
      if (parts.length < 3) { skippedFiles.push(file); continue; }

      const frontmatter = parseYaml(parts[1]) ?? {};
      if (!defKeys.has(frontmatter?.type)) { continue; }

      const { changed, data: updatedFrontmatter } = applyRenames(frontmatter, renames);
      if (!changed) { skippedFiles.push(file); continue; }

      const body = parts.slice(2).join("---");
      const newContent = `---\n${stringifyYaml(updatedFrontmatter)}---${body}`;
      fs.writeFileSync(filePath, newContent, "utf-8");
      migratedFiles.push(path.basename(file, ".md"));
    } catch (e) {
      skippedFiles.push(file);
    }
  }

  return { migratedFiles, skippedFiles };
}

function isAuthenticated(cookies: any): boolean {
  return cookies.get("cms_session")?.value === "authenticated-admin-session-2026";
}

export const GET: APIRoute = async ({ url, cookies }) => {
  if (!isAuthenticated(cookies)) {
    return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
      status: 401, headers: { "Content-Type": "application/json" }
    });
  }

  const action = url.searchParams.get("action") || "list";
  const key = url.searchParams.get("key") || "";
  const schemas = readSchemas();

  if (action === "list") {
    // Annotate each schema with which definitions reference it
    const definitions = readDefinitions();
    const annotated = schemas.map(s => {
      const dependentDefs = definitions
        .filter((d: any) => d.schema_ref === s.schema_key)
        .map((d: any) => d.key);
      return { ...s, usedBy: dependentDefs };
    });
    return new Response(JSON.stringify({ success: true, schemas: annotated }), {
      status: 200, headers: { "Content-Type": "application/json" }
    });
  }

  if (action === "get") {
    if (!key) {
      return new Response(JSON.stringify({ success: false, error: "Missing schema key" }), {
        status: 400, headers: { "Content-Type": "application/json" }
      });
    }
    const schema = schemas.find(s => s.schema_key === key);
    if (!schema) {
      return new Response(JSON.stringify({ success: false, error: "Schema not found" }), {
        status: 404, headers: { "Content-Type": "application/json" }
      });
    }
    return new Response(JSON.stringify({ success: true, schema }), {
      status: 200, headers: { "Content-Type": "application/json" }
    });
  }

  return new Response(JSON.stringify({ success: false, error: "Invalid action" }), {
    status: 400, headers: { "Content-Type": "application/json" }
  });
};

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!isAuthenticated(cookies)) {
    return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
      status: 401, headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const payload = await request.json();
    const { schema_key, schema_name, fields } = payload;

    if (!schema_key || !schema_name) {
      return new Response(JSON.stringify({ success: false, error: "Schema key and name are required" }), {
        status: 400, headers: { "Content-Type": "application/json" }
      });
    }

    if (!/^[a-z0-9_]+$/.test(schema_key)) {
      return new Response(JSON.stringify({ success: false, error: "Schema key must contain only lowercase letters, numbers, and underscores" }), {
        status: 400, headers: { "Content-Type": "application/json" }
      });
    }

    const schemas = readSchemas();

    if (schemas.some(s => s.schema_key === schema_key)) {
      return new Response(JSON.stringify({ success: false, error: `A schema with key "${schema_key}" already exists.` }), {
        status: 409, headers: { "Content-Type": "application/json" }
      });
    }

    const newSchema = {
      schema_key,
      schema_name,
      fields: Array.isArray(fields) ? fields : []
    };

    schemas.push(newSchema);
    writeSchemas(schemas);

    return new Response(JSON.stringify({ success: true, message: "Field schema created!", schema: newSchema }), {
      status: 201, headers: { "Content-Type": "application/json" }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500, headers: { "Content-Type": "application/json" }
    });
  }
};

export const PUT: APIRoute = async ({ request, cookies }) => {
  if (!isAuthenticated(cookies)) {
    return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
      status: 401, headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const payload = await request.json();
    const { schema_key, ...updates } = payload;

    if (!schema_key) {
      return new Response(JSON.stringify({ success: false, error: "Schema key is required" }), {
        status: 400, headers: { "Content-Type": "application/json" }
      });
    }

    const schemas = readSchemas();
    const idx = schemas.findIndex(s => s.schema_key === schema_key);

    if (idx === -1) {
      return new Response(JSON.stringify({ success: false, error: "Schema not found" }), {
        status: 404, headers: { "Content-Type": "application/json" }
      });
    }

    const oldSchema = schemas[idx];

    // Detect field renames before overwriting
    let migrationReport: { migratedFiles: string[]; skippedFiles: string[]; renames: Record<string, string> } | null = null;
    if (Array.isArray(updates.fields) && Array.isArray(oldSchema.fields)) {
      const renames = detectRenames(oldSchema.fields, updates.fields);
      if (Object.keys(renames).length > 0) {
        const definitions = readDefinitions();
        const { migratedFiles, skippedFiles } = migrateInstanceRenames(schema_key, renames, definitions);
        migrationReport = { migratedFiles, skippedFiles, renames };
      }
    }

    // Prevent renaming schema_key after creation
    schemas[idx] = { ...oldSchema, ...updates, schema_key };
    writeSchemas(schemas);

    const responseBody: any = { success: true, message: "Field schema updated!", schema: schemas[idx] };
    if (migrationReport) {
      responseBody.migrationReport = migrationReport;
      responseBody.message = `Field schema updated! ${migrationReport.migratedFiles.length} section instance(s) migrated for field renames.`;
    }

    return new Response(JSON.stringify(responseBody), {
      status: 200, headers: { "Content-Type": "application/json" }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500, headers: { "Content-Type": "application/json" }
    });
  }
};

export const DELETE: APIRoute = async ({ request, cookies }) => {
  if (!isAuthenticated(cookies)) {
    return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
      status: 401, headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const { schema_key } = await request.json();
    if (!schema_key) {
      return new Response(JSON.stringify({ success: false, error: "Schema key is required" }), {
        status: 400, headers: { "Content-Type": "application/json" }
      });
    }

    const schemas = readSchemas();
    const idx = schemas.findIndex(s => s.schema_key === schema_key);

    if (idx === -1) {
      return new Response(JSON.stringify({ success: false, error: "Schema not found" }), {
        status: 404, headers: { "Content-Type": "application/json" }
      });
    }

    // Block deletion if any Section Definitions still reference this schema
    const definitions = readDefinitions();
    const dependentDefs = definitions
      .filter((d: any) => d.schema_ref === schema_key)
      .map((d: any) => d.key);

    if (dependentDefs.length > 0) {
      return new Response(JSON.stringify({
        success: false,
        error: `Cannot delete schema "${schema_key}" — it is referenced by ${dependentDefs.length} Section Definition(s). Remove or reassign these definitions first.`,
        dependentDefinitions: dependentDefs
      }), {
        status: 409, headers: { "Content-Type": "application/json" }
      });
    }

    schemas.splice(idx, 1);
    writeSchemas(schemas);

    return new Response(JSON.stringify({ success: true, message: "Field schema deleted!" }), {
      status: 200, headers: { "Content-Type": "application/json" }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500, headers: { "Content-Type": "application/json" }
    });
  }
};
