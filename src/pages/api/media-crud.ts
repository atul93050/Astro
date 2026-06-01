import type { APIRoute } from "astro";
import fs from "node:fs";
import path from "node:path";

export const prerender = false;

const UPLOAD_DIR = path.resolve("public/uploads");
const META_FILE = path.join(UPLOAD_DIR, "media-meta.json");

// Ensure upload directory and metadata catalog exist
function ensureMediaCatalog() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
  if (!fs.existsSync(META_FILE)) {
    fs.writeFileSync(META_FILE, JSON.stringify([], null, 2), "utf-8");
  }
}

// Retrieve catalog list
function getCatalog(): any[] {
  ensureMediaCatalog();
  try {
    const data = fs.readFileSync(META_FILE, "utf-8");
    return JSON.parse(data);
  } catch (e) {
    console.error("Error reading media-meta.json:", e);
    return [];
  }
}

// Save catalog list
function saveCatalog(catalog: any[]) {
  ensureMediaCatalog();
  fs.writeFileSync(META_FILE, JSON.stringify(catalog, null, 2), "utf-8");
}

// Sync catalog with physical files (Self-Healing)
function syncCatalog() {
  ensureMediaCatalog();
  const catalog = getCatalog();
  
  // List files on disk (excluding media-meta.json)
  const filesOnDisk = fs.readdirSync(UPLOAD_DIR).filter(file => {
    const filePath = path.join(UPLOAD_DIR, file);
    return fs.statSync(filePath).isFile() && file !== "media-meta.json";
  });

  const updatedCatalog: any[] = [];
  const processedDiskFiles = new Set<string>();

  // 1. Validate existing catalog items
  for (const item of catalog) {
    const filename = path.basename(item.url);
    if (filesOnDisk.includes(filename)) {
      const filePath = path.join(UPLOAD_DIR, filename);
      const stats = fs.statSync(filePath);
      
      // Update sizes and keep item
      item.size = stats.size;
      updatedCatalog.push(item);
      processedDiskFiles.add(filename);
    }
  }

  // 2. Discover and add untracked disk files
  for (const filename of filesOnDisk) {
    if (!processedDiskFiles.has(filename)) {
      const filePath = path.join(UPLOAD_DIR, filename);
      const stats = fs.statSync(filePath);
      const ext = path.extname(filename).toLowerCase();
      
      updatedCatalog.push({
        url: `/uploads/${filename}`,
        title: filename,
        alt: filename.split("-").join(" ").split(".")[0],
        caption: "",
        uploadedAt: stats.mtime.toISOString(),
        size: stats.size,
        type: ext.match(/\.(jpg|jpeg|png|gif|webp|svg)/) ? "image" : "file",
      });
    }
  }

  saveCatalog(updatedCatalog);
  return updatedCatalog;
}

export const GET: APIRoute = async ({ cookies }) => {
  const session = cookies.get("cms_session")?.value;
  if (session !== "authenticated-admin-session-2026") {
    return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  try {
    const catalog = syncCatalog();
    return new Response(JSON.stringify({ success: true, media: catalog }), {
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

export const POST: APIRoute = async ({ request, cookies }) => {
  const session = cookies.get("cms_session")?.value;
  if (session !== "authenticated-admin-session-2026") {
    return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }

  ensureMediaCatalog();
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const alt = formData.get("alt")?.toString().trim() || "";
    const title = formData.get("title")?.toString().trim() || "";
    const caption = formData.get("caption")?.toString().trim() || "";

    if (!file || !(file instanceof File) || file.size === 0) {
      return new Response(JSON.stringify({ success: false, error: "No valid file uploaded" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Prepare unique name
    const ext = path.extname(file.name) || ".png";
    const baseName = path.basename(file.name, ext).replace(/[^a-z0-9-_]/gi, "_").toLowerCase();
    const uniqueName = `${baseName}-${Date.now()}${ext}`;
    const filePath = path.join(UPLOAD_DIR, uniqueName);

    // Save physical file
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(filePath, buffer);

    // Append to catalog
    const catalog = getCatalog();
    const relativeUrl = `/uploads/${uniqueName}`;
    const stats = fs.statSync(filePath);
    
    const newMedia = {
      url: relativeUrl,
      title: title || file.name,
      alt: alt || title || file.name.split(".")[0],
      caption,
      uploadedAt: new Date().toISOString(),
      size: stats.size,
      type: ext.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp|svg)/) ? "image" : "file",
    };
    
    catalog.push(newMedia);
    saveCatalog(catalog);

    return new Response(JSON.stringify({ success: true, media: newMedia }), {
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

  ensureMediaCatalog();
  try {
    const data = await request.json();
    const { url, title, alt, caption } = data;

    if (!url) {
      return new Response(JSON.stringify({ success: false, error: "Media URL is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const catalog = getCatalog();
    const index = catalog.findIndex(item => item.url === url);

    if (index === -1) {
      return new Response(JSON.stringify({ success: false, error: "Media catalog record not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    catalog[index].title = title || catalog[index].title;
    catalog[index].alt = alt !== undefined ? alt : catalog[index].alt;
    catalog[index].caption = caption !== undefined ? caption : catalog[index].caption;

    saveCatalog(catalog);

    return new Response(JSON.stringify({ success: true, media: catalog[index] }), {
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

  ensureMediaCatalog();
  try {
    const { url } = await request.json();
    if (!url) {
      return new Response(JSON.stringify({ success: false, error: "Media URL is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const catalog = getCatalog();
    const index = catalog.findIndex(item => item.url === url);

    // Delete physical file if exists
    const filename = path.basename(url);
    const filePath = path.join(UPLOAD_DIR, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    if (index !== -1) {
      catalog.splice(index, 1);
      saveCatalog(catalog);
    }

    return new Response(JSON.stringify({ success: true, message: "Media deleted successfully" }), {
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
