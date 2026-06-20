import type { APIRoute } from "astro";
import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";

export const prerender = false;

const DEFINITIONS_PATH = path.resolve("src/data/section-definitions.json");
const SCHEMAS_PATH = path.resolve("src/data/field-schemas.json");
const SECTIONS_DIR = path.resolve("src/content/sections");

function readDefinitions(): any[] {
  try {
    if (!fs.existsSync(DEFINITIONS_PATH)) return [];
    return JSON.parse(fs.readFileSync(DEFINITIONS_PATH, "utf-8"));
  } catch (e) {
    console.error("Failed to read section definitions:", e);
    return [];
  }
}

function writeDefinitions(defs: any[]): void {
  fs.writeFileSync(DEFINITIONS_PATH, JSON.stringify(defs, null, 2), "utf-8");
}

function readSchemas(): any[] {
  try {
    if (!fs.existsSync(SCHEMAS_PATH)) return [];
    return JSON.parse(fs.readFileSync(SCHEMAS_PATH, "utf-8"));
  } catch (e) {
    return [];
  }
}

// Scan section instances for those using a given definition key
function getInstancesUsingDefinition(defKey: string): string[] {
  if (!fs.existsSync(SECTIONS_DIR)) return [];
  const files = fs.readdirSync(SECTIONS_DIR).filter(f => f.endsWith(".md"));
  const instanceIds: string[] = [];

  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(SECTIONS_DIR, file), "utf-8");
      const parts = content.split(/^---$/m);
      if (parts.length >= 3) {
        const data = parse(parts[1]);
        if (data?.type === defKey) {
          instanceIds.push(path.basename(file, ".md"));
        }
      }
    } catch (e) {
      // skip unreadable files
    }
  }
  return instanceIds;
}

/**
 * Best-effort static check: read an Astro component file and extract the prop
 * names it expects. Works for two common patterns:
 *   1. `const { propA, propB } = Astro.props;`
 *   2. `interface Props { propA: ...; propB: ...; }`
 * Returns null if the file can't be read or the pattern isn't found.
 */
function extractAstroProps(componentPath: string): string[] | null {
  // componentPath may be relative to project root or an alias — try both
  const candidates = [
    path.resolve(componentPath),
    path.resolve("src", componentPath),
    path.resolve("src/components", path.basename(componentPath))
  ];
  let src: string | null = null;
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      try { src = fs.readFileSync(candidate, "utf-8"); } catch { /* skip */ }
      break;
    }
  }
  if (!src) return null;

  // Extract props from frontmatter (between first pair of ---)
  const fmMatch = src.match(/^---[\s\S]*?---/m);
  const fmText = fmMatch ? fmMatch[0] : src;

  const props: string[] = [];

  // Pattern 1: const { a, b, c } = Astro.props
  const destructureMatch = fmText.match(/const\s*\{([^}]+)\}\s*=\s*Astro\.props/);
  if (destructureMatch) {
    destructureMatch[1]
      .split(",")
      .map(p => p.trim().split(":")[0].split("=")[0].trim()) // handle aliases and defaults
      .filter(Boolean)
      .forEach(p => props.push(p));
  }

  // Pattern 2: interface Props { propA: ...; }
  const interfaceMatch = fmText.match(/interface\s+Props\s*\{([^}]+)\}/);
  if (interfaceMatch) {
    interfaceMatch[1]
      .split(";")
      .map(line => line.trim().split("?")[0].split(":")[0].trim())
      .filter(p => p && /^[a-zA-Z_]/.test(p))
      .forEach(p => props.push(p));
  }

  return props.length > 0 ? [...new Set(props)] : null;
}

function validateComponentPath(componentPath: string, schema: any): string | null {
  if (!componentPath || !schema?.fields?.length) return null;

  const astroProps = extractAstroProps(componentPath);
  if (!astroProps) return null; // can't validate — skip

  const schemaFieldNames = new Set((schema.fields as any[]).map(f => f.name).filter(Boolean));
  const missing = astroProps.filter(p => !schemaFieldNames.has(p));
  if (missing.length > 0) {
    return `Component expects prop(s) not in schema: ${missing.join(", ")}`;
  }
  return null;
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
  const definitions = readDefinitions();

  if (action === "list") {
    return new Response(JSON.stringify({ success: true, definitions }), {
      status: 200, headers: { "Content-Type": "application/json" }
    });
  }

  if (action === "get") {
    if (!key) {
      return new Response(JSON.stringify({ success: false, error: "Missing definition key" }), {
        status: 400, headers: { "Content-Type": "application/json" }
      });
    }
    const def = definitions.find(d => d.key === key);
    if (!def) {
      return new Response(JSON.stringify({ success: false, error: "Definition not found" }), {
        status: 404, headers: { "Content-Type": "application/json" }
      });
    }
    return new Response(JSON.stringify({ success: true, definition: def }), {
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
    const { key, name, schema_ref, componentPath, previewImage, description } = payload;

    if (!key || !name) {
      return new Response(JSON.stringify({ success: false, error: "Key and Name are required" }), {
        status: 400, headers: { "Content-Type": "application/json" }
      });
    }

    if (!/^[a-z0-9_]+$/.test(key)) {
      return new Response(JSON.stringify({ success: false, error: "Key must contain only lowercase letters, numbers, and underscores" }), {
        status: 400, headers: { "Content-Type": "application/json" }
      });
    }

    if (!schema_ref) {
      return new Response(JSON.stringify({ success: false, error: "schema_ref is required — select a Field Schema to link this definition to." }), {
        status: 400, headers: { "Content-Type": "application/json" }
      });
    }

    // Validate schema_ref exists
    const schemas = readSchemas();
    if (!schemas.some(s => s.schema_key === schema_ref)) {
      return new Response(JSON.stringify({ success: false, error: `Field Schema "${schema_ref}" does not exist. Create it first in the Field Schemas manager.` }), {
        status: 422, headers: { "Content-Type": "application/json" }
      });
    }

    const definitions = readDefinitions();

    if (definitions.some(d => d.key === key)) {
      return new Response(JSON.stringify({ success: false, error: `A definition with key "${key}" already exists.` }), {
        status: 409, headers: { "Content-Type": "application/json" }
      });
    }

    const newDef = {
      key,
      name,
      schema_ref,
      description: description || "",
      componentPath: componentPath || "",
      previewImage: previewImage || ""
    };

    definitions.push(newDef);
    writeDefinitions(definitions);

    // Best-effort componentPath prop validation (non-blocking)
    const linkedSchema = schemas.find(s => s.schema_key === schema_ref);
    const componentWarning = componentPath ? validateComponentPath(componentPath, linkedSchema) : null;

    const responseBody: any = { success: true, message: "Section definition created!", definition: newDef };
    if (componentWarning) responseBody.warning = componentWarning;

    return new Response(JSON.stringify(responseBody), {
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
    const { key, schema_ref, ...updates } = payload;

    if (!key) {
      return new Response(JSON.stringify({ success: false, error: "Definition key is required" }), {
        status: 400, headers: { "Content-Type": "application/json" }
      });
    }

    // If schema_ref is being updated, validate the new one exists
    if (schema_ref !== undefined) {
      const schemas = readSchemas();
      if (!schemas.some(s => s.schema_key === schema_ref)) {
        return new Response(JSON.stringify({ success: false, error: `Field Schema "${schema_ref}" does not exist.` }), {
          status: 422, headers: { "Content-Type": "application/json" }
        });
      }
    }

    const definitions = readDefinitions();
    const idx = definitions.findIndex(d => d.key === key);

    if (idx === -1) {
      return new Response(JSON.stringify({ success: false, error: "Definition not found" }), {
        status: 404, headers: { "Content-Type": "application/json" }
      });
    }

    // Strip legacy fields and category if they sneak in via PUT
    const { fields: _f, category: _c, ...safeUpdates } = updates;
    definitions[idx] = {
      ...definitions[idx],
      ...safeUpdates,
      ...(schema_ref !== undefined ? { schema_ref } : {}),
      key
    };
    writeDefinitions(definitions);

    // Best-effort componentPath prop validation (non-blocking)
    const effectiveComponentPath = safeUpdates.componentPath ?? definitions[idx].componentPath;
    const effectiveSchemaRef = schema_ref ?? definitions[idx].schema_ref;
    const allSchemas = readSchemas();
    const linkedSchema = allSchemas.find(s => s.schema_key === effectiveSchemaRef);
    const componentWarning = effectiveComponentPath ? validateComponentPath(effectiveComponentPath, linkedSchema) : null;

    const putResponseBody: any = { success: true, message: "Section definition updated!", definition: definitions[idx] };
    if (componentWarning) putResponseBody.warning = componentWarning;

    return new Response(JSON.stringify(putResponseBody), {
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
    const { key } = await request.json();
    if (!key) {
      return new Response(JSON.stringify({ success: false, error: "Definition key is required" }), {
        status: 400, headers: { "Content-Type": "application/json" }
      });
    }

    const definitions = readDefinitions();
    const idx = definitions.findIndex(d => d.key === key);

    if (idx === -1) {
      return new Response(JSON.stringify({ success: false, error: "Definition not found" }), {
        status: 404, headers: { "Content-Type": "application/json" }
      });
    }

    // Block deletion if any Section Instances use this definition key
    const instanceIds = getInstancesUsingDefinition(key);
    if (instanceIds.length > 0) {
      return new Response(JSON.stringify({
        success: false,
        error: `Cannot delete definition "${key}" — ${instanceIds.length} Section Instance(s) are still using it. Delete or reassign them first.`,
        dependentInstances: instanceIds
      }), {
        status: 409, headers: { "Content-Type": "application/json" }
      });
    }

    definitions.splice(idx, 1);
    writeDefinitions(definitions);

    return new Response(JSON.stringify({ success: true, message: "Section definition deleted!" }), {
      status: 200, headers: { "Content-Type": "application/json" }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500, headers: { "Content-Type": "application/json" }
    });
  }
};
