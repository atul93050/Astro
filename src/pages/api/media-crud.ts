import type { APIRoute } from "astro";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";

export const prerender = false;

const UPLOAD_DIR = path.resolve("public/uploads");
const META_FILE = path.join(UPLOAD_DIR, "media-meta.json");

// ─── Upload validation policy ──────────────────────────────────────────────────
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
const ALLOWED_EXT = new Set([
  ".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif", ".svg",
  ".mp4", ".webm", ".ogg", ".mov",
  ".mp3", ".wav", ".m4a", ".aac",
  ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".zip", ".csv", ".txt",
]);

const MIME_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".gif": "image/gif",
  ".webp": "image/webp", ".avif": "image/avif", ".svg": "image/svg+xml",
  ".mp4": "video/mp4", ".webm": "video/webm", ".ogg": "video/ogg", ".mov": "video/quicktime",
  ".mp3": "audio/mpeg", ".wav": "audio/wav", ".m4a": "audio/mp4", ".aac": "audio/aac",
  ".pdf": "application/pdf", ".zip": "application/zip", ".csv": "text/csv", ".txt": "text/plain",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

function ensureMediaCatalog() {
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  if (!fs.existsSync(META_FILE)) fs.writeFileSync(META_FILE, JSON.stringify([], null, 2), "utf-8");
}

function getCatalog(): any[] {
  ensureMediaCatalog();
  try {
    return JSON.parse(fs.readFileSync(META_FILE, "utf-8"));
  } catch (e) {
    console.error("Error reading media-meta.json:", e);
    return [];
  }
}

function saveCatalog(catalog: any[]) {
  ensureMediaCatalog();
  fs.writeFileSync(META_FILE, JSON.stringify(catalog, null, 2), "utf-8");
}

function detectMediaType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const imageExts = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif"];
  const videoExts = [".mp4", ".webm", ".ogg", ".avi", ".mov", ".mkv"];
  const audioExts = [".mp3", ".wav", ".aac", ".flac", ".m4a"];
  if (ext === ".svg") return "svg";
  if (ext === ".pdf") return "pdf";
  if (imageExts.includes(ext)) return "image";
  if (videoExts.includes(ext)) return "video";
  if (audioExts.includes(ext)) return "audio";
  return "document";
}

function mimeForExt(ext: string): string {
  return MIME_BY_EXT[ext.toLowerCase()] || "application/octet-stream";
}

function sha256(buf: Buffer): string {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

// ─── Responsive variant + WebP generation (sharp) ───────────────────────────────
const VARIANT_SIZES: Record<string, number> = { thumb: 150, small: 400, medium: 800, large: 1600 };
const RASTER_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);

async function generateVariants(buffer: Buffer, fileBase: string, ext: string): Promise<Record<string, string>> {
  const variants: Record<string, string> = {};
  if (!RASTER_EXT.has(ext.toLowerCase())) return variants;
  try {
    // Full-size WebP (metadata stripped by default)
    const webpName = `${fileBase}.webp`;
    await sharp(buffer).webp({ quality: 82 }).toFile(path.join(UPLOAD_DIR, webpName));
    variants.webp = `/uploads/${webpName}`;

    // Responsive resized WebP variants (never upscale)
    for (const [key, width] of Object.entries(VARIANT_SIZES)) {
      const name = `${fileBase}-${key}.webp`;
      await sharp(buffer).resize(width, null, { withoutEnlargement: true }).webp({ quality: 80 }).toFile(path.join(UPLOAD_DIR, name));
      variants[key] = `/uploads/${name}`;
    }
  } catch (e) {
    console.error("Variant generation failed:", e);
  }
  return variants;
}

function deleteVariantFiles(item: any) {
  const v = item?.variants || {};
  for (const url of Object.values(v) as string[]) {
    if (typeof url !== "string") continue;
    const fp = path.join(UPLOAD_DIR, path.basename(url));
    if (fs.existsSync(fp)) { try { fs.unlinkSync(fp); } catch { /* ignore */ } }
  }
}

// ─── SVG sanitizer (XSS prevention) ─────────────────────────────────────────────
// Strips scripts, event handlers, and javascript: URIs from uploaded SVG markup.
function sanitizeSvg(svg: string): string {
  let out = svg;
  out = out.replace(/<script[\s\S]*?<\/script>/gi, "");
  out = out.replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, "");
  out = out.replace(/\son\w+\s*=\s*"[^"]*"/gi, "");
  out = out.replace(/\son\w+\s*=\s*'[^']*'/gi, "");
  out = out.replace(/\son\w+\s*=\s*[^\s>]+/gi, "");
  out = out.replace(/(href|xlink:href)\s*=\s*("|')\s*javascript:[^"']*\2/gi, "");
  out = out.replace(/<!ENTITY[\s\S]*?>/gi, "");
  return out;
}

// ─── Best-effort image dimensions (no native deps) ──────────────────────────────
function getImageDimensions(buf: Buffer, ext: string): { width: number; height: number } | null {
  try {
    const e = ext.toLowerCase();
    if (e === ".png" && buf.length > 24) {
      return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
    }
    if (e === ".gif" && buf.length > 10) {
      return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
    }
    if ((e === ".jpg" || e === ".jpeg") && buf.length > 4) {
      let i = 2;
      while (i < buf.length) {
        if (buf[i] !== 0xff) { i++; continue; }
        const marker = buf[i + 1];
        // SOF markers carry frame dimensions
        if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
          return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
        }
        const len = buf.readUInt16BE(i + 2);
        i += 2 + len;
      }
    }
  } catch { /* ignore */ }
  return null;
}

// ─── Catalog normalization / self-healing ───────────────────────────────────────
function normalizeItem(item: any): any {
  const filename = path.basename(item.url || "");
  const ext = path.extname(filename).toLowerCase();
  return {
    id: item.id || crypto.randomUUID(),
    url: item.url,
    filename,
    originalFilename: item.originalFilename || item.title || filename,
    title: item.title || filename,
    alt: item.alt || "",
    caption: item.caption || "",
    description: item.description || "",
    tags: Array.isArray(item.tags) ? item.tags : [],
    category: item.category || "",
    focusKeyword: item.focusKeyword || "",
    credits: item.credits || "",
    copyright: item.copyright || "",
    folder: item.folder || "",
    mimeType: item.mimeType || mimeForExt(ext),
    type: item.type || detectMediaType(filename),
    hash: item.hash || "",
    dimensions: item.dimensions || null,
    variants: item.variants || {},
    size: item.size || 0,
    uploadedBy: item.uploadedBy || "admin",
    uploadedAt: item.uploadedAt || new Date().toISOString(),
    lastModified: item.lastModified || item.uploadedAt || new Date().toISOString(),
  };
}

function syncCatalog() {
  ensureMediaCatalog();
  const catalog = getCatalog();
  const filesOnDisk = fs.readdirSync(UPLOAD_DIR).filter(file => {
    const fp = path.join(UPLOAD_DIR, file);
    return fs.statSync(fp).isFile() && file !== "media-meta.json";
  });

  const updatedCatalog: any[] = [];
  const processed = new Set<string>();

  for (const item of catalog) {
    const filename = path.basename(item.url || "");
    if (filesOnDisk.includes(filename)) {
      const stats = fs.statSync(path.join(UPLOAD_DIR, filename));
      const norm = normalizeItem(item);
      norm.size = stats.size;
      updatedCatalog.push(norm);
      processed.add(filename);
    }
  }

  for (const filename of filesOnDisk) {
    if (!processed.has(filename)) {
      const stats = fs.statSync(path.join(UPLOAD_DIR, filename));
      updatedCatalog.push(normalizeItem({
        url: `/uploads/${filename}`,
        title: filename,
        alt: filename.split("-").join(" ").split(".")[0],
        uploadedAt: stats.mtime.toISOString(),
        size: stats.size,
      }));
    }
  }

  saveCatalog(updatedCatalog);
  return updatedCatalog;
}

// ─── Usage tracking across content + data stores ────────────────────────────────
function getMediaUsage(): Record<string, Array<{ title: string; file: string; count: number }>> {
  const usageMap: Record<string, Array<{ title: string; file: string; count: number }>> = {};
  const add = (url: string, title: string, file: string) => {
    if (!usageMap[url]) usageMap[url] = [];
    const existing = usageMap[url].find(u => u.file === file);
    if (existing) existing.count++;
    else usageMap[url].push({ title, file, count: 1 });
  };

  const scanText = (text: string, title: string, file: string) => {
    const matches = text.match(/\/uploads\/[a-zA-Z0-9_\-.]+/g);
    if (matches) for (const m of matches) add(m, title, file);
  };

  // 1. Markdown content (pages, sections, blog, etc.)
  const contentDir = path.resolve("src/content");
  const scanDir = (dir: string) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) { scanDir(fullPath); continue; }
      if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
      try {
        const content = fs.readFileSync(fullPath, "utf-8");
        let title = entry.name;
        const ym = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
        if (ym) {
          const tm = ym[1].match(/^title\s*:\s*(.*)$/m);
          if (tm) title = tm[1].replace(/['"]/g, "").trim();
        }
        const displayPath = path.relative(path.resolve("."), fullPath).replace(/\\/g, "/");
        scanText(content, title, displayPath);
      } catch (e) { /* skip */ }
    }
  };
  scanDir(contentDir);

  // 2. JSON data stores (global settings = logos/menus, blog-meta = author avatars)
  const jsonSources = [
    { file: "src/data/global-settings.json", title: "Global Settings (Logos / Menus)" },
    { file: "src/data/blog-meta.json", title: "Blog Authors / Categories" },
    { file: "src/data/section-definitions.json", title: "Section Definitions (Preview Images)" },
  ];
  for (const src of jsonSources) {
    const p = path.resolve(src.file);
    if (fs.existsSync(p)) {
      try { scanText(fs.readFileSync(p, "utf-8"), src.title, src.file); } catch { /* skip */ }
    }
  }

  return usageMap;
}

function unauthorized() {
  return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
    status: 401, headers: { "Content-Type": "application/json" },
  });
}
function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}
function isAuthed(cookies: any) {
  return cookies.get("cms_session")?.value === "authenticated-admin-session-2026";
}

// ─── GET: catalog + usage + duplicate flags ─────────────────────────────────────
export const GET: APIRoute = async ({ cookies }) => {
  if (!isAuthed(cookies)) return unauthorized();
  try {
    const catalog = syncCatalog();
    const usage = getMediaUsage();

    // Duplicate detection: group by content hash
    const byHash: Record<string, string[]> = {};
    for (const item of catalog) {
      if (item.hash) (byHash[item.hash] ||= []).push(item.url);
    }

    const media = catalog.map(item => {
      const dupGroup = item.hash ? (byHash[item.hash] || []) : [];
      return {
        ...item,
        usage: usage[item.url] || [],
        usageCount: (usage[item.url] || []).reduce((s, u) => s + u.count, 0),
        isDuplicate: dupGroup.length > 1,
        duplicateOf: dupGroup.filter(u => u !== item.url),
      };
    });

    return json({ success: true, media });
  } catch (error: any) {
    return json({ success: false, error: error.message }, 500);
  }
};

// ─── POST: upload (validated + sanitized + hashed) ──────────────────────────────
export const POST: APIRoute = async ({ request, cookies }) => {
  if (!isAuthed(cookies)) return unauthorized();
  ensureMediaCatalog();
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const get = (k: string) => formData.get(k)?.toString().trim() || "";
    const action = get("action");

    if (!file || typeof file !== "object" || !("size" in file) || !("name" in file) || (file as any).size === 0) {
      return json({ success: false, error: "No valid file uploaded" }, 400);
    }
    const uploadedFile = file as any;

    // Validation: extension allowlist + size cap
    const ext = (path.extname(uploadedFile.name) || "").toLowerCase();
    if (!ALLOWED_EXT.has(ext)) {
      return json({ success: false, error: `File type "${ext || "unknown"}" is not allowed.` }, 400);
    }
    if (uploadedFile.size > MAX_FILE_SIZE) {
      return json({ success: false, error: `File exceeds the ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB limit.` }, 400);
    }

    let buffer = Buffer.from(await uploadedFile.arrayBuffer());

    // Sanitize SVG to prevent stored XSS
    if (ext === ".svg") {
      buffer = Buffer.from(sanitizeSvg(buffer.toString("utf-8")), "utf-8");
    }

    const hash = sha256(buffer);
    const catalog = getCatalog();

    // ── Replace action: overwrite the file at an existing URL (keeps the URL) ──
    if (action === "replace") {
      const targetUrl = get("url");
      const idx = catalog.findIndex((i: any) => i.url === targetUrl);
      if (idx === -1) return json({ success: false, error: "Target asset not found" }, 404);

      const existingFilename = path.basename(targetUrl);
      const existingExt = path.extname(existingFilename).toLowerCase();
      if (existingExt !== ext) {
        return json({ success: false, error: `Replacement must be the same file type (${existingExt}).` }, 400);
      }
      // Overwrite physical file + regenerate variants under the same base name
      fs.writeFileSync(path.join(UPLOAD_DIR, existingFilename), buffer);
      deleteVariantFiles(catalog[idx]);
      const fileBase = path.basename(existingFilename, existingExt);
      const variants = await generateVariants(buffer, fileBase, existingExt);

      const updated = normalizeItem({
        ...catalog[idx],
        hash,
        size: buffer.length,
        dimensions: getImageDimensions(buffer, existingExt) || catalog[idx].dimensions,
        variants,
        lastModified: new Date().toISOString(),
      });
      catalog[idx] = updated;
      saveCatalog(catalog);
      return json({ success: true, replaced: true, media: updated });
    }

    // Duplicate detection by hash (reuse existing asset instead of re-uploading)
    const existingDup = catalog.find((i: any) => i.hash === hash);
    if (existingDup && get("allowDuplicate") !== "true") {
      return json({
        success: true,
        duplicate: true,
        message: "An identical file already exists in the library.",
        media: normalizeItem(existingDup),
      });
    }

    const baseName = path.basename(uploadedFile.name, ext).replace(/[^a-z0-9-_]/gi, "_").toLowerCase();
    const uniqueName = `${baseName}-${Date.now()}${ext}`;
    const fileBase = path.basename(uniqueName, ext);
    const filePath = path.join(UPLOAD_DIR, uniqueName);
    fs.writeFileSync(filePath, buffer);

    // Generate WebP + responsive variants (raster images only)
    const variants = await generateVariants(buffer, fileBase, ext);

    const now = new Date().toISOString();
    const newMedia = normalizeItem({
      url: `/uploads/${uniqueName}`,
      variants,
      originalFilename: uploadedFile.name,
      title: get("title") || uploadedFile.name,
      alt: get("alt") || get("title") || uploadedFile.name.split(".")[0],
      caption: get("caption"),
      description: get("description"),
      category: get("category"),
      focusKeyword: get("focusKeyword"),
      credits: get("credits"),
      copyright: get("copyright"),
      tags: get("tags") ? get("tags").split(",").map(t => t.trim()).filter(Boolean) : [],
      folder: get("folder"),
      mimeType: mimeForExt(ext),
      hash,
      dimensions: getImageDimensions(buffer, ext),
      size: buffer.length,
      uploadedBy: "admin",
      uploadedAt: now,
      lastModified: now,
    });

    catalog.push(newMedia);
    saveCatalog(catalog);
    return json({ success: true, media: newMedia }, 201);
  } catch (error: any) {
    return json({ success: false, error: error.message }, 500);
  }
};

// ─── PUT: edit metadata / bulk move / bulk tag ──────────────────────────────────
export const PUT: APIRoute = async ({ request, cookies }) => {
  if (!isAuthed(cookies)) return unauthorized();
  ensureMediaCatalog();
  try {
    const data = await request.json();
    const { url, urls, folder, addTags } = data;
    const catalog = getCatalog();

    // Bulk folder move
    if (urls && Array.isArray(urls) && folder !== undefined) {
      let moved = 0;
      for (const item of catalog) {
        if (urls.includes(item.url)) { item.folder = String(folder).trim(); item.lastModified = new Date().toISOString(); moved++; }
      }
      saveCatalog(catalog);
      return json({ success: true, message: `Moved ${moved} item(s) to "${folder || "root"}"` });
    }

    // Bulk tag
    if (urls && Array.isArray(urls) && Array.isArray(addTags)) {
      let tagged = 0;
      for (const item of catalog) {
        if (urls.includes(item.url)) {
          item.tags = Array.from(new Set([...(item.tags || []), ...addTags.map((t: string) => t.trim()).filter(Boolean)]));
          item.lastModified = new Date().toISOString();
          tagged++;
        }
      }
      saveCatalog(catalog);
      return json({ success: true, message: `Tagged ${tagged} item(s)` });
    }

    if (!url) return json({ success: false, error: "Media URL is required" }, 400);
    const idx = catalog.findIndex(item => item.url === url);
    if (idx === -1) return json({ success: false, error: "Media catalog record not found" }, 404);

    const item = normalizeItem(catalog[idx]);
    const fields = ["title", "alt", "caption", "description", "category", "focusKeyword", "credits", "copyright", "folder"];
    for (const f of fields) if (data[f] !== undefined) item[f] = typeof data[f] === "string" ? data[f] : item[f];
    if (data.tags !== undefined) {
      item.tags = Array.isArray(data.tags)
        ? data.tags
        : String(data.tags).split(",").map((t: string) => t.trim()).filter(Boolean);
    }
    item.lastModified = new Date().toISOString();
    catalog[idx] = item;
    saveCatalog(catalog);
    return json({ success: true, media: item });
  } catch (error: any) {
    return json({ success: false, error: error.message }, 500);
  }
};

// ─── DELETE: dependency-guarded ─────────────────────────────────────────────────
export const DELETE: APIRoute = async ({ request, cookies }) => {
  if (!isAuthed(cookies)) return unauthorized();
  ensureMediaCatalog();
  try {
    const data = await request.json();
    const { url, urls, force } = data;
    const catalog = getCatalog();
    const usage = getMediaUsage();

    const targets: string[] = urls && Array.isArray(urls) ? urls : (url ? [url] : []);
    if (targets.length === 0) return json({ success: false, error: "Media URL is required" }, 400);

    // Dependency guard: block unless force=true when any target is in use
    if (!force) {
      const inUse = targets
        .map(u => ({ url: u, usage: usage[u] || [] }))
        .filter(t => t.usage.length > 0);
      if (inUse.length > 0) {
        return json({
          success: false,
          requiresConfirmation: true,
          error: "Some assets are still in use.",
          inUse,
        }, 409);
      }
    }

    let deleted = 0;
    const newCatalog = catalog.filter(item => {
      if (targets.includes(item.url)) {
        const fp = path.join(UPLOAD_DIR, path.basename(item.url));
        if (fs.existsSync(fp)) fs.unlinkSync(fp);
        deleteVariantFiles(item); // remove generated WebP/responsive variants too
        deleted++;
        return false;
      }
      return true;
    });
    // Also remove physical files for targets not in catalog
    for (const t of targets) {
      if (!catalog.some(i => i.url === t)) {
        const fp = path.join(UPLOAD_DIR, path.basename(t));
        if (fs.existsSync(fp)) { fs.unlinkSync(fp); deleted++; }
      }
    }
    saveCatalog(newCatalog);
    return json({ success: true, message: `Deleted ${deleted} media file(s).` });
  } catch (error: any) {
    return json({ success: false, error: error.message }, 500);
  }
};
