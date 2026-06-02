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

function detectMediaType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const imageExts = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif", ".svg"];
  const videoExts = [".mp4", ".webm", ".ogg", ".avi", ".mov", ".mkv"];
  const audioExts = [".mp3", ".wav", ".aac", ".flac", ".m4a"];
  
  if (ext === ".svg") return "svg";
  if (ext === ".pdf") return "pdf";
  if (imageExts.includes(ext)) return "image";
  if (videoExts.includes(ext)) return "video";
  if (audioExts.includes(ext)) return "audio";
  return "document";
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
      
      // Update fields
      item.size = stats.size;
      item.type = detectMediaType(filename);
      item.folder = item.folder || ""; // default folder is root
      updatedCatalog.push(item);
      processedDiskFiles.add(filename);
    }
  }

  // 2. Discover and add untracked disk files
  for (const filename of filesOnDisk) {
    if (!processedDiskFiles.has(filename)) {
      const filePath = path.join(UPLOAD_DIR, filename);
      const stats = fs.statSync(filePath);
      
      updatedCatalog.push({
        url: `/uploads/${filename}`,
        title: filename,
        alt: filename.split("-").join(" ").split(".")[0],
        caption: "",
        folder: "",
        uploadedAt: stats.mtime.toISOString(),
        size: stats.size,
        type: detectMediaType(filename),
      });
    }
  }

  saveCatalog(updatedCatalog);
  return updatedCatalog;
}

// Scan all markdown files in src/content for occurrences of uploaded media URL
function getMediaUsage(): Record<string, Array<{ title: string; file: string; count: number }>> {
  const usageMap: Record<string, Array<{ title: string; file: string; count: number }>> = {};
  const contentDir = path.resolve("src/content");
  if (!fs.existsSync(contentDir)) return usageMap;

  function scanDir(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        try {
          const fileContent = fs.readFileSync(fullPath, "utf-8");
          // Read title from frontmatter
          let title = entry.name;
          const yamlMatch = fileContent.match(/^---\r?\n([\s\S]*?)\r?\n---/);
          if (yamlMatch) {
            const titleMatch = yamlMatch[1].match(/^title\s*:\s*(.*)$/m);
            if (titleMatch) {
              title = titleMatch[1].replace(/['"]/g, "").trim();
            }
          }

          // Search for occurrences of uploads URL
          const matches = fileContent.match(/\/uploads\/[a-zA-Z0-9_\-\.]+/g);
          if (matches) {
            for (const match of matches) {
              if (!usageMap[match]) {
                usageMap[match] = [];
              }
              const existing = usageMap[match].find(u => u.file === fullPath);
              if (existing) {
                existing.count++;
              } else {
                const displayPath = path.relative(path.resolve("."), fullPath).replace(/\\/g, "/");
                usageMap[match].push({ title, file: displayPath, count: 1 });
              }
            }
          }
        } catch (e) {
          console.error("Error reading file during usage scan:", fullPath, e);
        }
      }
    }
  }

  scanDir(contentDir);
  return usageMap;
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
    const usage = getMediaUsage();
    
    // Attach usage count to each item
    const mediaWithUsage = catalog.map(item => ({
      ...item,
      usage: usage[item.url] || []
    }));

    return new Response(JSON.stringify({ success: true, media: mediaWithUsage }), {
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
    const folder = formData.get("folder")?.toString().trim() || "";

    if (!file || typeof file !== "object" || !("size" in file) || !("name" in file) || (file as any).size === 0) {
      return new Response(JSON.stringify({ success: false, error: "No valid file uploaded" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const uploadedFile = file as any;

    // Prepare unique name
    const ext = path.extname(uploadedFile.name) || ".png";
    const baseName = path.basename(uploadedFile.name, ext).replace(/[^a-z0-9-_]/gi, "_").toLowerCase();
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
      title: title || uploadedFile.name,
      alt: alt || title || uploadedFile.name.split(".")[0],
      caption,
      folder,
      uploadedAt: new Date().toISOString(),
      size: stats.size,
      type: detectMediaType(uniqueName),
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
    const { url, urls, title, alt, caption, folder } = data;

    const catalog = getCatalog();

    // Check if bulk folder move is requested
    if (urls && Array.isArray(urls) && folder !== undefined) {
      const movedUrls: string[] = [];
      for (const item of catalog) {
        if (urls.includes(item.url)) {
          item.folder = String(folder).trim();
          movedUrls.push(item.url);
        }
      }
      saveCatalog(catalog);
      return new Response(JSON.stringify({ success: true, message: `Bulk moved ${movedUrls.length} items to folder "${folder}"` }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!url) {
      return new Response(JSON.stringify({ success: false, error: "Media URL is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

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
    catalog[index].folder = folder !== undefined ? String(folder).trim() : catalog[index].folder;

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
    const data = await request.json();
    const { url, urls } = data;

    const catalog = getCatalog();

    // Check if bulk deletion is requested
    if (urls && Array.isArray(urls)) {
      let deletedCount = 0;
      const newCatalog = catalog.filter(item => {
        if (urls.includes(item.url)) {
          const filename = path.basename(item.url);
          const filePath = path.join(UPLOAD_DIR, filename);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
          deletedCount++;
          return false;
        }
        return true;
      });

      saveCatalog(newCatalog);
      return new Response(JSON.stringify({ success: true, message: `Successfully deleted ${deletedCount} media files.` }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!url) {
      return new Response(JSON.stringify({ success: false, error: "Media URL is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

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

