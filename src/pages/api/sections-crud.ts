import type { APIRoute } from "astro";
import fs from "node:fs";
import path from "node:path";
import { parse, stringify } from "yaml";

export const prerender = false;

// Load section definitions (developer-managed blueprints)
function loadDefinitions(): any[] {
  try {
    const p = path.resolve("src/data/section-definitions.json");
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch (e) {}
  return [];
}
function parseMarkdown(content: string) {
  const parts = content.split(/^---$/m);
  if (parts.length < 3) {
    return { data: {}, body: content };
  }
  const yamlStr = parts[1];
  const body = parts.slice(2).join("---").trim();
  try {
    const data = parse(yamlStr);
    return { data, body };
  } catch (e) {
    console.error("YAML Parse error:", e);
    return { data: {}, body };
  }
}

// Get all pages and find section usages
function getSectionUsages() {
  const pagesDir = path.resolve("src/content/pages");
  const usages: Record<string, Array<{ title: string; slug: string }>> = {};

  if (fs.existsSync(pagesDir)) {
    const files = fs.readdirSync(pagesDir).filter(f => f.endsWith(".md"));
    files.forEach(file => {
      try {
        const filePath = path.join(pagesDir, file);
        const content = fs.readFileSync(filePath, "utf-8");
        const { data } = parseMarkdown(content);
        const slug = data.slug || path.basename(file, ".md");
        const title = data.title || slug;

        if (data && Array.isArray(data.blocks)) {
          data.blocks.forEach((block: any) => {
            if (block.sectionId) {
              if (!usages[block.sectionId]) {
                usages[block.sectionId] = [];
              }
              if (!usages[block.sectionId].some(p => p.slug === slug)) {
                usages[block.sectionId].push({ title, slug });
              }
            }
          });
        }
      } catch (e) {
        console.error("Error checking section usages for file:", file, e);
      }
    });
  }
  return usages;
}

export const GET: APIRoute = async ({ url, cookies }) => {
  const session = cookies.get("cms_session")?.value;
  if (session !== "authenticated-admin-session-2026") {
    return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }

  const action = url.searchParams.get("action") || "list";
  const id = url.searchParams.get("id") || "";
  const sectionsDir = path.resolve("src/content/sections");

  try {
    if (!fs.existsSync(sectionsDir)) {
      fs.mkdirSync(sectionsDir, { recursive: true });
    }

    if (action === "list") {
      const usages = getSectionUsages();
      const files = fs.readdirSync(sectionsDir).filter(f => f.endsWith(".md"));

      const definitions = loadDefinitions();
      const sections = files.map(file => {
        const filePath = path.join(sectionsDir, file);
        const content = fs.readFileSync(filePath, "utf-8");
        const { data } = parseMarkdown(content);
        const sectionId = path.basename(file, ".md");
        const type = data.type || "";
        const definition = definitions.find((d: any) => d.key === type);

        return {
          id: sectionId,
          name: data.name || sectionId.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
          type,
          typeName: definition ? definition.name : (type || "Unknown Type"),
          status: data.status || "published",
          lastUpdated: fs.statSync(filePath).mtime.toISOString(),
          usedIn: usages[sectionId] || [],
          previewImage: data.previewImage || definition?.previewImage || ""
        };
      });

      return new Response(JSON.stringify({ success: true, sections }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (action === "get") {
      if (!id) {
        return new Response(JSON.stringify({ success: false, error: "Missing section ID" }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
      const filePath = path.join(sectionsDir, `${id}.md`);
      if (!fs.existsSync(filePath)) {
        return new Response(JSON.stringify({ success: false, error: "Section not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" }
        });
      }
      const content = fs.readFileSync(filePath, "utf-8");
      const { data } = parseMarkdown(content);
      return new Response(JSON.stringify({ success: true, section: data }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ success: false, error: "Invalid action" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const session = cookies.get("cms_session")?.value;
  if (session !== "authenticated-admin-session-2026") {
    return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }

  const sectionsDir = path.resolve("src/content/sections");

  try {
    const payload = await request.json();
    const { id, type, name, status, _update, ...fields } = payload;

    if (!id || !type) {
      return new Response(JSON.stringify({ success: false, error: "Section ID and Type are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Validate ID format
    if (!/^[a-z0-9-_]+$/.test(id)) {
      return new Response(JSON.stringify({ success: false, error: "Section ID must contain only lowercase letters, numbers, dashes, and underscores" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (!fs.existsSync(sectionsDir)) {
      fs.mkdirSync(sectionsDir, { recursive: true });
    }

    const sectionFilePath = path.join(sectionsDir, `${id}.md`);

    // Prevent accidental overwrites on CREATE (not update)
    if (!_update && fs.existsSync(sectionFilePath)) {
      return new Response(JSON.stringify({ success: false, error: `A section with ID "${id}" already exists. Use a different ID.` }), {
        status: 409,
        headers: { "Content-Type": "application/json" }
      });
    }

    const sectionContentData = {
      type,
      name: name || id,
      status: status || "published",
      ...fields
    };

    const sectionFileContent = `---\n${stringify(sectionContentData)}---\n`;
    fs.writeFileSync(sectionFilePath, sectionFileContent, "utf-8");

    return new Response(JSON.stringify({ success: true, message: _update ? "Section updated successfully!" : "Section created successfully!" }), {
      status: _update ? 200 : 201,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};

// PUT: Explicit update endpoint for section editor saves
export const PUT: APIRoute = async ({ request, cookies }) => {
  const session = cookies.get("cms_session")?.value;
  if (session !== "authenticated-admin-session-2026") {
    return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }

  const sectionsDir = path.resolve("src/content/sections");

  try {
    const payload = await request.json();
    const { id, type, name, status, ...fields } = payload;

    if (!id) {
      return new Response(JSON.stringify({ success: false, error: "Section ID is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (!fs.existsSync(sectionsDir)) {
      fs.mkdirSync(sectionsDir, { recursive: true });
    }

    const sectionFilePath = path.join(sectionsDir, `${id}.md`);
    if (!fs.existsSync(sectionFilePath)) {
      return new Response(JSON.stringify({ success: false, error: "Section not found. Cannot update." }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Read existing data and merge
    const existingContent = fs.readFileSync(sectionFilePath, "utf-8");
    const parts = existingContent.split(/^---$/m);
    let existingData: any = {};
    if (parts.length >= 3) {
      try { existingData = parse(parts[1]); } catch (e) {}
    }

    const sectionContentData = {
      ...existingData,
      ...(type ? { type } : {}),
      ...(name !== undefined ? { name } : {}),
      ...(status !== undefined ? { status } : {}),
      ...fields
    };

    const sectionFileContent = `---\n${stringify(sectionContentData)}---\n`;
    fs.writeFileSync(sectionFilePath, sectionFileContent, "utf-8");

    return new Response(JSON.stringify({ success: true, message: "Section updated successfully!" }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};

export const DELETE: APIRoute = async ({ request, cookies }) => {
  const session = cookies.get("cms_session")?.value;
  if (session !== "authenticated-admin-session-2026") {
    return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }

  const sectionsDir = path.resolve("src/content/sections");
  const pagesDir = path.resolve("src/content/pages");

  try {
    const { id } = await request.json();
    if (!id) {
      return new Response(JSON.stringify({ success: false, error: "Section ID is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const filePath = path.join(sectionsDir, `${id}.md`);
    if (!fs.existsSync(filePath)) {
      return new Response(JSON.stringify({ success: false, error: "Section not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Clean up references from all pages
    if (fs.existsSync(pagesDir)) {
      const files = fs.readdirSync(pagesDir).filter(f => f.endsWith(".md"));
      files.forEach(file => {
        try {
          const pagePath = path.join(pagesDir, file);
          const pageContent = fs.readFileSync(pagePath, "utf-8");
          const { data, body } = parseMarkdown(pageContent);

          if (data && Array.isArray(data.blocks)) {
            const originalLength = data.blocks.length;
            data.blocks = data.blocks.filter((b: any) => b.sectionId !== id);

            if (data.blocks.length !== originalLength) {
              const updatedContent = `---\n${stringify(data)}---\n\n${body}`;
              fs.writeFileSync(pagePath, updatedContent, "utf-8");
            }
          }
        } catch (e) {
          console.error("Error removing section reference from page:", file, e);
        }
      });
    }

    // Delete section file
    fs.unlinkSync(filePath);

    return new Response(JSON.stringify({ success: true, message: "Section deleted successfully and references removed from all pages!" }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
