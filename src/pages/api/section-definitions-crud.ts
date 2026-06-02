import type { APIRoute } from "astro";
import fs from "node:fs";
import path from "node:path";

export const prerender = false;

const DEFINITIONS_PATH = path.resolve("src/data/section-definitions.json");

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
    const { key, name, category, description, componentPath, previewImage, fields } = payload;

    if (!key || !name) {
      return new Response(JSON.stringify({ success: false, error: "Key and Name are required" }), {
        status: 400, headers: { "Content-Type": "application/json" }
      });
    }

    // Validate key format: lowercase letters, numbers, underscores only
    if (!/^[a-z0-9_]+$/.test(key)) {
      return new Response(JSON.stringify({ success: false, error: "Key must contain only lowercase letters, numbers, and underscores" }), {
        status: 400, headers: { "Content-Type": "application/json" }
      });
    }

    const definitions = readDefinitions();

    // Check duplicate key
    if (definitions.some(d => d.key === key)) {
      return new Response(JSON.stringify({ success: false, error: `A definition with key "${key}" already exists.` }), {
        status: 409, headers: { "Content-Type": "application/json" }
      });
    }

    const newDef = {
      key,
      name,
      category: category || "other",
      description: description || "",
      componentPath: componentPath || "",
      previewImage: previewImage || "",
      fields: Array.isArray(fields) ? fields : []
    };

    definitions.push(newDef);
    writeDefinitions(definitions);

    return new Response(JSON.stringify({ success: true, message: "Section definition created!", definition: newDef }), {
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
    const { key, ...updates } = payload;

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

    definitions[idx] = { ...definitions[idx], ...updates, key };
    writeDefinitions(definitions);

    return new Response(JSON.stringify({ success: true, message: "Section definition updated!", definition: definitions[idx] }), {
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
