import type { APIRoute } from "astro";
import fs from "node:fs";
import path from "node:path";
import { parse, stringify } from "yaml";

export const prerender = false;

// Ensure directories exist
function ensureDirs() {
  const pagesDir = path.resolve("src/content/pages");
  const revisionsDir = path.resolve("src/content/revisions");
  if (!fs.existsSync(pagesDir)) {
    fs.mkdirSync(pagesDir, { recursive: true });
  }
  if (!fs.existsSync(revisionsDir)) {
    fs.mkdirSync(revisionsDir, { recursive: true });
  }
}

// Parse markdown file with YAML frontmatter
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

// Stringify to markdown with YAML frontmatter
function stringifyMarkdown(data: any, body: string = "") {
  // Format dates consistently
  data.lastUpdated = new Date().toISOString();
  const yamlStr = stringify(data);
  return `---\n${yamlStr}---\n\n${body}`;
}

// Load section definitions dynamically (replaces BLOCK_REGISTRY)
function loadDefinitions(): any[] {
  try {
    const p = path.resolve("src/data/section-definitions.json");
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch (e) {}
  return [];
}

// Backend validation for page builder fields (Dynamically driven by definitions)
function validatePageData(data: any): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!data.title || typeof data.title !== "string" || !data.title.trim()) {
    errors.title = "Page Title is required";
  }

  if (!data.slug || typeof data.slug !== "string" || !data.slug.trim()) {
    errors.slug = "Page Slug is required";
  } else if (!/^[a-z0-9-_]+$/.test(data.slug)) {
    errors.slug = "Page Slug must contain only lowercase letters, numbers, dashes, and underscores";
  }

  if (!data.status || !["draft", "published"].includes(data.status)) {
    errors.status = "Status must be either 'draft' or 'published'";
  }

  // SEO validations
  if (!data.seo) {
    errors["seo.global"] = "SEO settings are required";
  } else {
    if (!data.seo.metaTitle || !data.seo.metaTitle.trim()) {
      errors["seo.metaTitle"] = "SEO Meta Title is required";
    }
    if (!data.seo.metaDescription || !data.seo.metaDescription.trim()) {
      errors["seo.metaDescription"] = "SEO Meta Description is required";
    }
  }

  // Dynamic blocks validation driven by central registry
  if (data.blocks && Array.isArray(data.blocks)) {
    data.blocks.forEach((block: any, idx: number) => {
      const prefix = `blocks.${idx}`;
      if (!block.type || typeof block.type !== "string") {
        errors[`${prefix}.type`] = `Block #${idx + 1} has an invalid or missing type`;
        return;
      }

      const definitions = loadDefinitions();
      const config = definitions.find((d: any) => d.key === block.type);
      if (!config) {
        // Don't block save for unknown types — definitions may have been deleted
        // errors[`${prefix}.type`] = `Block #${idx + 1} has an unsupported block type '${block.type}'`;
        return;
      }

      // Skip field-level required validations to allow partial data saves.
      // If data exists, the frontend component will render it, else it will skip gracefully.
    });
  }

  return errors;
}

// Decompose block content and save it to sections files
function splitBlocksToSections(data: any) {
  if (data.blocks && Array.isArray(data.blocks)) {
    const pageSlug = data.slug || "index";
    const compiledBlocks = [] as any[];
    const sectionsDir = path.resolve("src/content/sections");
    if (!fs.existsSync(sectionsDir)) {
      fs.mkdirSync(sectionsDir, { recursive: true });
    }

    for (let idx = 0; idx < data.blocks.length; idx++) {
      const block = data.blocks[idx];
      let sectionId = block.sectionId;

      if (!sectionId) {
        sectionId = `${block.type}-${pageSlug}`;
        let count = 1;
        let testId = sectionId;
        while (
          compiledBlocks.some(b => b.sectionId === testId) ||
          fs.existsSync(path.join(sectionsDir, `${testId}.md`))
        ) {
          testId = `${sectionId}-${count}`;
          count++;
        }
        sectionId = testId;
      }

      // Compile block content properties based on definitions fields
      const definitions = loadDefinitions();
      const blockConfig = definitions.find((d: any) => d.key === block.type);
      const sectionContentData = {
        type: block.type
      } as any;

      if (blockConfig) {
        blockConfig.fields.forEach(field => {
          if (block[field.name] !== undefined) {
            sectionContentData[field.name] = block[field.name];
          }
        });
      } else {
        // No matching definition (e.g. it was deleted): preserve ALL field data
        // rather than silently dropping it, so saving never destroys content.
        for (const [k, v] of Object.entries(block)) {
          if (k === "type" || k === "sectionId") continue;
          sectionContentData[k] = v;
        }
      }

      // Write section file
      const sectionFilePath = path.join(sectionsDir, `${sectionId}.md`);
      const sectionFileContent = `---\n${stringify(sectionContentData)}---\n`;
      fs.writeFileSync(sectionFilePath, sectionFileContent, "utf-8");

      compiledBlocks.push({
        type: block.type,
        sectionId: sectionId
      });
    }

    data.blocks = compiledBlocks;
  }
}

// API Routes
export const GET: APIRoute = async ({ url, cookies }) => {
  const session = cookies.get("cms_session")?.value;
  if (session !== "authenticated-admin-session-2026") {
    return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }

  ensureDirs();
  const action = url.searchParams.get("action") || "list";
  const slug = url.searchParams.get("slug") || "";

  const pagesDir = path.resolve("src/content/pages");
  const revisionsDir = path.resolve("src/content/revisions");

  try {
    if (action === "list") {
      const files = fs.readdirSync(pagesDir).filter(f => f.endsWith(".md"));
      const pages = files.map(file => {
        const filePath = path.join(pagesDir, file);
        const content = fs.readFileSync(filePath, "utf-8");
        const { data } = parseMarkdown(content);
        return {
          title: data.title || "Untitled Page",
          slug: data.slug || path.basename(file, ".md"),
          status: data.status || "draft",
          lastUpdated: data.lastUpdated || fs.statSync(filePath).mtime.toISOString(),
          seo: data.seo || {},
        };
      });
      return new Response(JSON.stringify({ success: true, pages }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (action === "get") {
      if (!slug) {
        return new Response(JSON.stringify({ success: false, error: "Slug parameter is required" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      let targetSlug = slug;
      if (slug === "home") targetSlug = "index";
      if (slug === "about") targetSlug = "about-us";
      const filePath = path.join(pagesDir, `${targetSlug}.md`);
      
      if (!fs.existsSync(filePath)) {
        return new Response(JSON.stringify({ success: false, error: "Page not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }
      const content = fs.readFileSync(filePath, "utf-8");
      const { data, body } = parseMarkdown(content);

      // Resolve section blocks content for the editor client
      if (data && Array.isArray(data.blocks)) {
        const definitions = loadDefinitions();
        data.blocks = data.blocks.map((block: any) => {
          const config = definitions.find((d: any) => d.key === block.type);
          const defaultValues = config ? Object.fromEntries(
            (config.fields || []).map((f: any) => [f.name, f.default !== undefined ? f.default : ""])
          ) : {};

          if (block.sectionId) {
            const secPath = path.resolve("src/content/sections", `${block.sectionId}.md`);
            let secData = {};
            if (fs.existsSync(secPath)) {
              const secContent = fs.readFileSync(secPath, "utf-8");
              secData = parseMarkdown(secContent).data || {};
            }
            return {
              ...defaultValues,
              ...block,
              ...secData
            };
          }
          return {
            ...defaultValues,
            ...block
          };
        });
      }

      return new Response(JSON.stringify({ success: true, page: data, body }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (action === "revisions") {
      if (!slug) {
        return new Response(JSON.stringify({ success: false, error: "Slug parameter is required" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      const pageRevDir = path.join(revisionsDir, slug);
      if (!fs.existsSync(pageRevDir)) {
        return new Response(JSON.stringify({ success: true, revisions: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      const files = fs.readdirSync(pageRevDir).filter(f => f.endsWith(".md")).sort().reverse();
      const revisions = files.map(file => {
        const timestamp = path.basename(file, ".md");
        const formattedDate = new Date(parseInt(timestamp)).toLocaleString();
        return {
          timestamp,
          date: formattedDate,
        };
      });
      return new Response(JSON.stringify({ success: true, revisions }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (action === "rollback") {
      const timestamp = url.searchParams.get("timestamp");
      if (!slug || !timestamp) {
        return new Response(JSON.stringify({ success: false, error: "Slug and timestamp are required" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      const revFilePath = path.join(revisionsDir, slug, `${timestamp}.md`);
      if (!fs.existsSync(revFilePath)) {
        return new Response(JSON.stringify({ success: false, error: "Revision not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }
      const content = fs.readFileSync(revFilePath, "utf-8");
      // Write back to main file
      const mainFilePath = path.join(pagesDir, `${slug}.md`);
      fs.writeFileSync(mainFilePath, content, "utf-8");
      return new Response(JSON.stringify({ success: true, message: "Page rolled back successfully!" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: false, error: "Invalid action" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
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

  ensureDirs();
  const pagesDir = path.resolve("src/content/pages");

  try {
    const data = await request.json();
    const errors = validatePageData(data);

    if (Object.keys(errors).length > 0) {
      return new Response(JSON.stringify({ success: false, errors }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const filePath = path.join(pagesDir, `${data.slug}.md`);
    if (fs.existsSync(filePath)) {
      return new Response(
        JSON.stringify({ success: false, errors: { slug: "A page with this slug already exists" } }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Split page builder blocks into separate sections contents
    splitBlocksToSections(data);

    const fileContent = stringifyMarkdown(data, data.body || "");
    fs.writeFileSync(filePath, fileContent, "utf-8");

    return new Response(JSON.stringify({ success: true, message: "Page created successfully!" }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const PUT: APIRoute = async ({ request, cookies }) => {
  const session = cookies.get("cms_session")?.value;
  if (session !== "authenticated-admin-session-2026") {
    return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }

  ensureDirs();
  const pagesDir = path.resolve("src/content/pages");
  const revisionsDir = path.resolve("src/content/revisions");

  try {
    const data = await request.json();
    const originalSlug = data.originalSlug || data.slug;
    const errors = validatePageData(data);

    if (Object.keys(errors).length > 0) {
      return new Response(JSON.stringify({ success: false, errors }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const originalFilePath = path.join(pagesDir, `${originalSlug}.md`);
    const newFilePath = path.join(pagesDir, `${data.slug}.md`);

    if (!fs.existsSync(originalFilePath)) {
      return new Response(JSON.stringify({ success: false, error: "Page not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Backup revision of original page structure
    const existingContent = fs.readFileSync(originalFilePath, "utf-8");
    const pageRevDir = path.join(revisionsDir, originalSlug);
    if (!fs.existsSync(pageRevDir)) {
      fs.mkdirSync(pageRevDir, { recursive: true });
    }
    const timestamp = Date.now().toString();
    fs.writeFileSync(path.join(pageRevDir, `${timestamp}.md`), existingContent, "utf-8");

    // Clean up data to avoid storing originalSlug
    const { originalSlug: _, ...cleanedData } = data;

    // Split page builder blocks into separate sections contents
    splitBlocksToSections(cleanedData);

    const fileContent = stringifyMarkdown(cleanedData, data.body || "");

    if (originalSlug !== data.slug) {
      // Slug changed. Delete old file, rename revision folder, create new file.
      fs.unlinkSync(originalFilePath);
      if (fs.existsSync(pageRevDir)) {
        const newRevDir = path.join(revisionsDir, data.slug);
        fs.renameSync(pageRevDir, newRevDir);
      }
    }

    fs.writeFileSync(newFilePath, fileContent, "utf-8");

    return new Response(JSON.stringify({ success: true, message: "Page updated and revision saved!" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
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

  ensureDirs();
  const pagesDir = path.resolve("src/content/pages");
  const revisionsDir = path.resolve("src/content/revisions");

  try {
    const { slug } = await request.json();
    if (!slug) {
      return new Response(JSON.stringify({ success: false, error: "Slug is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const filePath = path.join(pagesDir, `${slug}.md`);
    if (!fs.existsSync(filePath)) {
      return new Response(JSON.stringify({ success: false, error: "Page not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Read page to find associated blocks and delete their sections
    const pageContent = fs.readFileSync(filePath, "utf-8");
    const { data } = parseMarkdown(pageContent);

    // Helper to check if sectionId is referenced in any other page
    const isSectionUsedElsewhere = (sectionId: string, currentSlug: string) => {
      if (!fs.existsSync(pagesDir)) return false;
      const files = fs.readdirSync(pagesDir).filter(f => f.endsWith(".md"));
      for (const file of files) {
        const fileSlug = path.basename(file, ".md");
        if (fileSlug === currentSlug) continue; // skip page currently being deleted
        try {
          const pagePath = path.join(pagesDir, file);
          const pageContentCheck = fs.readFileSync(pagePath, "utf-8");
          const { data: pageData } = parseMarkdown(pageContentCheck);
          if (pageData && Array.isArray(pageData.blocks)) {
            if (pageData.blocks.some((b: any) => b.sectionId === sectionId)) {
              return true;
            }
          }
        } catch (e) {
          console.error("Error checking section usage in file:", file, e);
        }
      }
      return false;
    };

    if (data && Array.isArray(data.blocks)) {
      data.blocks.forEach((block: any) => {
        if (block.sectionId) {
          if (!isSectionUsedElsewhere(block.sectionId, slug)) {
            const secFilePath = path.resolve("src/content/sections", `${block.sectionId}.md`);
            if (fs.existsSync(secFilePath)) {
              fs.unlinkSync(secFilePath);
            }
          }
        }
      });
    }

    // Delete main page file
    fs.unlinkSync(filePath);

    // Clean up revision folder if exists
    const pageRevDir = path.join(revisionsDir, slug);
    if (fs.existsSync(pageRevDir)) {
      fs.rmSync(pageRevDir, { recursive: true, force: true });
    }

    return new Response(JSON.stringify({ success: true, message: "Page deleted successfully!" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
