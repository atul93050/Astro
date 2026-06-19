import type { APIRoute } from "astro";
import fs from "node:fs";
import path from "node:path";
import { parse, stringify } from "yaml";

export const prerender = false;

// ─── Paths ────────────────────────────────────────────────────────────────────
const BLOG_DIR = path.resolve("src/content/blog");
const META_FILE = path.resolve("src/data/blog-meta.json");
const COMMENTS_FILE = path.resolve("src/data/blog-comments.json");

// ─── Auth ─────────────────────────────────────────────────────────────────────
const SESSION_TOKEN = "authenticated-admin-session-2026";

function unauthorized() {
  return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// ─── Ensure dirs ──────────────────────────────────────────────────────────────
function ensureDirs() {
  if (!fs.existsSync(BLOG_DIR)) fs.mkdirSync(BLOG_DIR, { recursive: true });
  const dataDir = path.resolve("src/data");
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(META_FILE)) {
    const defaultMeta = {
      categories: [{ id: "cat-uncategorized", name: "Uncategorized", slug: "uncategorized", description: "", color: "#6366F1", createdAt: new Date().toISOString() }],
      tags: [],
      authors: [{ id: "author-admin", name: "Admin", slug: "admin", email: "", bio: "", avatar: "", role: "Administrator", website: "", twitter: "", linkedin: "", createdAt: new Date().toISOString() }],
      settings: { blogTitle: "Blog", blogDescription: "", postsPerPage: 9, showExcerpt: true, showAuthor: true, showDate: true, showTags: true, showReadingTime: true, showRelatedPosts: true, relatedPostsCount: 3, commentsEnabled: true, commentsModeration: true, rssEnabled: true, rssFeedTitle: "Blog RSS Feed", defaultAuthor: "author-admin", defaultCategory: "cat-uncategorized", featuredPostsCount: 1 }
    };
    fs.writeFileSync(META_FILE, JSON.stringify(defaultMeta, null, 2), "utf-8");
  }
  if (!fs.existsSync(COMMENTS_FILE)) {
    fs.writeFileSync(COMMENTS_FILE, "[]", "utf-8");
  }
}

// ─── Markdown helpers ─────────────────────────────────────────────────────────
function parseMarkdown(content: string) {
  const parts = content.split(/^---$/m);
  if (parts.length < 3) return { data: {}, body: content };
  const yamlStr = parts[1];
  const body = parts.slice(2).join("---").trim();
  try {
    return { data: parse(yamlStr) || {}, body };
  } catch (e) {
    console.error("YAML Parse error:", e);
    return { data: {}, body };
  }
}

function stringifyMarkdown(data: any, body = "") {
  data.updatedDate = new Date().toISOString();
  const yamlStr = stringify(data);
  return `---\n${yamlStr}---\n\n${body}`;
}

// ─── Meta helpers ─────────────────────────────────────────────────────────────
function getMeta(): any {
  ensureDirs();
  try {
    return JSON.parse(fs.readFileSync(META_FILE, "utf-8"));
  } catch {
    return { categories: [], tags: [], authors: [], settings: {} };
  }
}

function saveMeta(meta: any) {
  fs.writeFileSync(META_FILE, JSON.stringify(meta, null, 2), "utf-8");
}

// ─── Comments helpers ─────────────────────────────────────────────────────────
function getComments(): any[] {
  ensureDirs();
  try {
    return JSON.parse(fs.readFileSync(COMMENTS_FILE, "utf-8"));
  } catch {
    return [];
  }
}

function saveComments(comments: any[]) {
  fs.writeFileSync(COMMENTS_FILE, JSON.stringify(comments, null, 2), "utf-8");
}

// ─── Reading time ─────────────────────────────────────────────────────────────
function calcReadingTime(body: string): number {
  const words = body.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

// ─── List all posts (with filters) ───────────────────────────────────────────
function listPosts(filters: { status?: string; category?: string; tag?: string; author?: string; search?: string }): any[] {
  ensureDirs();
  if (!fs.existsSync(BLOG_DIR)) return [];
  const files = fs.readdirSync(BLOG_DIR).filter(f => f.endsWith(".md"));
  let posts = files.map(file => {
    const filePath = path.join(BLOG_DIR, file);
    const content = fs.readFileSync(filePath, "utf-8");
    const { data, body } = parseMarkdown(content);
    return {
      ...data,
      slug: data.slug || path.basename(file, ".md"),
      readingTime: calcReadingTime(body),
      wordCount: body.trim().split(/\s+/).length,
    };
  });

  if (filters.status && filters.status !== "all") {
    posts = posts.filter(p => p.status === filters.status);
  }
  if (filters.category) {
    posts = posts.filter(p => p.category === filters.category);
  }
  if (filters.tag) {
    posts = posts.filter(p => Array.isArray(p.tags) && p.tags.includes(filters.tag));
  }
  if (filters.author) {
    posts = posts.filter(p => p.author === filters.author);
  }
  if (filters.search) {
    const q = filters.search.toLowerCase();
    posts = posts.filter(p =>
      (p.title || "").toLowerCase().includes(q) ||
      (p.excerpt || "").toLowerCase().includes(q)
    );
  }

  // Sort by publishDate desc, then updatedDate
  posts.sort((a, b) => {
    const dateA = new Date(a.publishDate || a.updatedDate || 0).getTime();
    const dateB = new Date(b.publishDate || b.updatedDate || 0).getTime();
    return dateB - dateA;
  });

  return posts;
}

// ─── Slug validator ───────────────────────────────────────────────────────────
function isValidSlug(slug: string): boolean {
  return /^[a-z0-9][a-z0-9-_]*$/.test(slug);
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// ─── GET ──────────────────────────────────────────────────────────────────────
export const GET: APIRoute = async ({ url, cookies }) => {
  const session = cookies.get("cms_session")?.value;
  if (session !== SESSION_TOKEN) return unauthorized();
  ensureDirs();

  const action = url.searchParams.get("action") || "list";
  const slug = url.searchParams.get("slug") || "";

  try {
    // ── List posts ──────────────────────────────────────────────────────────
    if (action === "list") {
      const posts = listPosts({
        status: url.searchParams.get("status") || "all",
        category: url.searchParams.get("category") || "",
        tag: url.searchParams.get("tag") || "",
        author: url.searchParams.get("author") || "",
        search: url.searchParams.get("search") || "",
      });
      return jsonResponse({ success: true, posts });
    }

    // ── Get single post ─────────────────────────────────────────────────────
    if (action === "get") {
      if (!slug) return jsonResponse({ success: false, error: "slug required" }, 400);
      const filePath = path.join(BLOG_DIR, `${slug}.md`);
      if (!fs.existsSync(filePath)) return jsonResponse({ success: false, error: "Post not found" }, 404);
      const content = fs.readFileSync(filePath, "utf-8");
      const { data, body } = parseMarkdown(content);
      return jsonResponse({
        success: true,
        post: { ...data, slug: data.slug || slug },
        body,
        readingTime: calcReadingTime(body),
      });
    }

    // ── Categories ──────────────────────────────────────────────────────────
    if (action === "categories") {
      const meta = getMeta();
      // Attach post count
      const categories = (meta.categories || []).map((cat: any) => {
        const count = listPosts({}).filter(p => p.category === cat.slug).length;
        return { ...cat, postCount: count };
      });
      return jsonResponse({ success: true, categories });
    }

    // ── Tags ────────────────────────────────────────────────────────────────
    if (action === "tags") {
      const meta = getMeta();
      const allPosts = listPosts({});
      const tags = (meta.tags || []).map((tag: any) => {
        const count = allPosts.filter(p => Array.isArray(p.tags) && p.tags.includes(tag.slug)).length;
        return { ...tag, postCount: count };
      });
      return jsonResponse({ success: true, tags });
    }

    // ── Authors ─────────────────────────────────────────────────────────────
    if (action === "authors") {
      const meta = getMeta();
      const allPosts = listPosts({});
      const authors = (meta.authors || []).map((author: any) => {
        const count = allPosts.filter(p => p.author === author.id).length;
        return { ...author, postCount: count };
      });
      return jsonResponse({ success: true, authors });
    }

    // ── Comments ────────────────────────────────────────────────────────────
    if (action === "comments") {
      const comments = getComments();
      const filterStatus = url.searchParams.get("status") || "";
      const filterPost = url.searchParams.get("postSlug") || "";
      let filtered = comments;
      if (filterStatus) filtered = filtered.filter((c: any) => c.status === filterStatus);
      if (filterPost) filtered = filtered.filter((c: any) => c.postSlug === filterPost);
      filtered.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      const commentsWithTitles = filtered.map((c: any) => {
        let postTitle = "Untitled Post";
        try {
          const postPath = path.join(BLOG_DIR, `${c.postSlug}.md`);
          if (fs.existsSync(postPath)) {
            const content = fs.readFileSync(postPath, "utf-8");
            const parts = content.split(/^---$/m);
            if (parts.length >= 3) {
              const yamlStr = parts[1];
              const parsed = parse(yamlStr);
              if (parsed && parsed.title) {
                postTitle = parsed.title;
              }
            }
          }
        } catch {}
        return { ...c, postTitle };
      });

      return jsonResponse({ success: true, comments: commentsWithTitles });
    }

    // ── Settings ────────────────────────────────────────────────────────────
    if (action === "settings") {
      const meta = getMeta();
      return jsonResponse({ success: true, settings: meta.settings || {} });
    }

    // ── Stats ───────────────────────────────────────────────────────────────
    if (action === "stats") {
      const allPosts = listPosts({});
      const comments = getComments();
      const meta = getMeta();
      return jsonResponse({
        success: true,
        stats: {
          total: allPosts.length,
          published: allPosts.filter(p => p.status === "published").length,
          draft: allPosts.filter(p => p.status === "draft").length,
          scheduled: allPosts.filter(p => p.status === "scheduled").length,
          archived: allPosts.filter(p => p.status === "archived").length,
          totalComments: comments.length,
          pendingComments: comments.filter((c: any) => c.status === "pending").length,
          categories: (meta.categories || []).length,
          tags: (meta.tags || []).length,
          authors: (meta.authors || []).length,
          totalViews: allPosts.reduce((sum, p) => sum + (p.views || 0), 0),
          popularPosts: [...allPosts].filter(p => p.status === "published").sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5),
          recentPosts: allPosts.filter(p => p.status === "published").slice(0, 5),
        }
      });
    }

    return jsonResponse({ success: false, error: "Invalid action" }, 400);
  } catch (e: any) {
    return jsonResponse({ success: false, error: e.message }, 500);
  }
};

// ─── POST ─────────────────────────────────────────────────────────────────────
export const POST: APIRoute = async ({ request, cookies }) => {
  ensureDirs();

  try {
    const data = await request.json();
    const action = data.action || "create";

    // Public comment submission bypasses auth check
    if (action !== "comment") {
      const session = cookies.get("cms_session")?.value;
      if (session !== SESSION_TOKEN) return unauthorized();
    }

    // ── Create post ─────────────────────────────────────────────────────────
    if (action === "create") {
      if (!data.title?.trim()) return jsonResponse({ success: false, error: "Title is required" }, 400);
      const slug = data.slug?.trim() || generateSlug(data.title);
      if (!isValidSlug(slug)) return jsonResponse({ success: false, error: "Invalid slug" }, 400);

      const filePath = path.join(BLOG_DIR, `${slug}.md`);
      if (fs.existsSync(filePath)) return jsonResponse({ success: false, error: "A post with this slug already exists" }, 400);

      const now = new Date().toISOString();
      const frontmatter: any = {
        title: data.title.trim(),
        slug,
        excerpt: data.excerpt || "",
        author: data.author || "author-admin",
        category: data.category || "uncategorized",
        tags: Array.isArray(data.tags) ? data.tags : [],
        featuredImage: data.featuredImage || "",
        status: data.status || "draft",
        publishDate: data.status === "published" ? (data.publishDate || now) : (data.publishDate || ""),
        scheduledDate: data.scheduledDate || "",
        views: 0,
        headerScripts: data.headerScripts || "",
        footerScripts: data.footerScripts || "",
        customCss: data.customCss || "",
        customJs: data.customJs || "",
        seo: {
          metaTitle: data.seo?.metaTitle || data.title.trim(),
          metaDescription: data.seo?.metaDescription || data.excerpt || "",
          ogImage: data.seo?.ogImage || data.featuredImage || "",
          focusKeyword: data.seo?.focusKeyword || "",
          canonicalUrl: data.seo?.canonicalUrl || "",
          robots: data.seo?.robots || "index, follow",
          schemaMarkup: data.seo?.schemaMarkup || "",
          schemaType: data.seo?.schemaType || "none",
        }
      };

      const body = data.body || "";
      const fileContent = stringifyMarkdown(frontmatter, body);
      fs.writeFileSync(filePath, fileContent, "utf-8");

      return jsonResponse({ success: true, message: "Post created successfully!", slug }, 201);
    }

    // ── Duplicate post ──────────────────────────────────────────────────────
    if (action === "duplicate") {
      const origSlug = data.slug;
      if (!origSlug) return jsonResponse({ success: false, error: "slug required" }, 400);
      const origPath = path.join(BLOG_DIR, `${origSlug}.md`);
      if (!fs.existsSync(origPath)) return jsonResponse({ success: false, error: "Post not found" }, 404);

      const content = fs.readFileSync(origPath, "utf-8");
      const { data: origData, body } = parseMarkdown(content);

      let newSlug = `${origSlug}-copy`;
      let counter = 2;
      while (fs.existsSync(path.join(BLOG_DIR, `${newSlug}.md`))) {
        newSlug = `${origSlug}-copy-${counter++}`;
      }

      const newData = {
        ...origData,
        slug: newSlug,
        title: `${origData.title || "Untitled"} (Copy)`,
        status: "draft",
        publishDate: "",
        views: 0,
      };

      const fileContent = stringifyMarkdown(newData, body);
      fs.writeFileSync(path.join(BLOG_DIR, `${newSlug}.md`), fileContent, "utf-8");
      return jsonResponse({ success: true, message: "Post duplicated!", newSlug });
    }

    // ── Create category ─────────────────────────────────────────────────────
    if (action === "category") {
      if (!data.name?.trim()) return jsonResponse({ success: false, error: "Category name is required" }, 400);
      const meta = getMeta();
      const slug = data.slug?.trim() || generateSlug(data.name);
      if (meta.categories.some((c: any) => c.slug === slug)) {
        return jsonResponse({ success: false, error: "Category with this slug already exists" }, 400);
      }
      const newCat = {
        id: `cat-${slug}`,
        name: data.name.trim(),
        slug,
        description: data.description || "",
        color: data.color || "#6366F1",
        createdAt: new Date().toISOString(),
      };
      meta.categories.push(newCat);
      saveMeta(meta);
      return jsonResponse({ success: true, message: "Category created!", category: newCat }, 201);
    }

    // ── Create tag ──────────────────────────────────────────────────────────
    if (action === "tag") {
      if (!data.name?.trim()) return jsonResponse({ success: false, error: "Tag name is required" }, 400);
      const meta = getMeta();
      const slug = data.slug?.trim() || generateSlug(data.name);
      if (meta.tags.some((t: any) => t.slug === slug)) {
        return jsonResponse({ success: false, error: "Tag with this slug already exists" }, 400);
      }
      const newTag = {
        id: `tag-${slug}`,
        name: data.name.trim(),
        slug,
        description: data.description || "",
        color: data.color || "#10B981",
        createdAt: new Date().toISOString(),
      };
      meta.tags.push(newTag);
      saveMeta(meta);
      return jsonResponse({ success: true, message: "Tag created!", tag: newTag }, 201);
    }

    // ── Create author ───────────────────────────────────────────────────────
    if (action === "author") {
      if (!data.name?.trim()) return jsonResponse({ success: false, error: "Author name is required" }, 400);
      const meta = getMeta();
      const slug = data.slug?.trim() || generateSlug(data.name);
      const id = `author-${slug}`;
      if (meta.authors.some((a: any) => a.id === id)) {
        return jsonResponse({ success: false, error: "Author with this slug already exists" }, 400);
      }
      const newAuthor = {
        id,
        name: data.name.trim(),
        slug,
        email: data.email || "",
        bio: data.bio || "",
        avatar: data.avatar || "",
        role: data.role || "Author",
        website: data.website || "",
        twitter: data.twitter || "",
        linkedin: data.linkedin || "",
        createdAt: new Date().toISOString(),
      };
      meta.authors.push(newAuthor);
      saveMeta(meta);
      return jsonResponse({ success: true, message: "Author created!", author: newAuthor }, 201);
    }

    // ── Submit comment (public) ─────────────────────────────────────────────
    if (action === "comment") {
      if (!data.postSlug || !data.authorName || !data.authorEmail || !data.body) {
        return jsonResponse({ success: false, error: "Missing required comment fields" }, 400);
      }
      const comments = getComments();
      const meta = getMeta();
      const newComment: any = {
        id: `comment-${Date.now()}`,
        postSlug: data.postSlug,
        authorName: data.authorName.trim(),
        authorEmail: data.authorEmail.trim(),
        authorWebsite: data.authorWebsite || "",
        body: data.body.trim(),
        status: meta.settings?.commentsModeration !== false ? "pending" : "approved",
        createdAt: new Date().toISOString(),
        parentId: data.parentId || null,
      };
      comments.push(newComment);
      saveComments(comments);
      return jsonResponse({ success: true, message: "Comment submitted!", comment: newComment }, 201);
    }

    return jsonResponse({ success: false, error: "Invalid action" }, 400);
  } catch (e: any) {
    return jsonResponse({ success: false, error: e.message }, 500);
  }
};

// ─── PUT ──────────────────────────────────────────────────────────────────────
export const PUT: APIRoute = async ({ request, cookies }) => {
  ensureDirs();

  try {
    const data = await request.json();
    const action = data.action || "update";

    // Public view count increments bypass auth check
    if (action !== "view") {
      const session = cookies.get("cms_session")?.value;
      if (session !== SESSION_TOKEN) return unauthorized();
    }

    // ── Update post ─────────────────────────────────────────────────────────
    if (action === "update") {
      const origSlug = data.originalSlug || data.slug;
      if (!origSlug) return jsonResponse({ success: false, error: "originalSlug required" }, 400);

      const origPath = path.join(BLOG_DIR, `${origSlug}.md`);
      if (!fs.existsSync(origPath)) return jsonResponse({ success: false, error: "Post not found" }, 404);

      const newSlug = data.slug?.trim() || origSlug;
      if (!isValidSlug(newSlug)) return jsonResponse({ success: false, error: "Invalid slug" }, 400);

      const existingContent = fs.readFileSync(origPath, "utf-8");
      const { data: existingData, body: existingBody } = parseMarkdown(existingContent);

      const now = new Date().toISOString();
      const frontmatter: any = {
        ...existingData,
        title: data.title?.trim() || existingData.title,
        slug: newSlug,
        excerpt: data.excerpt ?? existingData.excerpt ?? "",
        author: data.author || existingData.author || "author-admin",
        category: data.category || existingData.category || "uncategorized",
        tags: Array.isArray(data.tags) ? data.tags : (existingData.tags || []),
        featuredImage: data.featuredImage ?? existingData.featuredImage ?? "",
        status: data.status || existingData.status || "draft",
        publishDate: data.status === "published" && !existingData.publishDate
          ? now
          : (data.publishDate ?? existingData.publishDate ?? ""),
        scheduledDate: data.scheduledDate ?? existingData.scheduledDate ?? "",
        views: existingData.views || 0,
        headerScripts: data.headerScripts ?? existingData.headerScripts ?? "",
        footerScripts: data.footerScripts ?? existingData.footerScripts ?? "",
        customCss: data.customCss ?? existingData.customCss ?? "",
        customJs: data.customJs ?? existingData.customJs ?? "",
        seo: {
          metaTitle: data.seo?.metaTitle ?? existingData.seo?.metaTitle ?? "",
          metaDescription: data.seo?.metaDescription ?? existingData.seo?.metaDescription ?? "",
          ogImage: data.seo?.ogImage ?? existingData.seo?.ogImage ?? "",
          focusKeyword: data.seo?.focusKeyword ?? existingData.seo?.focusKeyword ?? "",
          canonicalUrl: data.seo?.canonicalUrl ?? existingData.seo?.canonicalUrl ?? "",
          robots: data.seo?.robots ?? existingData.seo?.robots ?? "index, follow",
          schemaMarkup: data.seo?.schemaMarkup ?? existingData.seo?.schemaMarkup ?? "",
          schemaType: data.seo?.schemaType ?? existingData.seo?.schemaType ?? "none",
        }
      };

      const body = data.body !== undefined ? data.body : existingBody;
      const newPath = path.join(BLOG_DIR, `${newSlug}.md`);
      const fileContent = stringifyMarkdown(frontmatter, body);

      // If slug changed, delete old file
      if (newSlug !== origSlug) {
        fs.unlinkSync(origPath);
      }
      fs.writeFileSync(newPath, fileContent, "utf-8");

      return jsonResponse({ success: true, message: "Post updated!", slug: newSlug });
    }

    // ── Update category ─────────────────────────────────────────────────────
    if (action === "category") {
      const meta = getMeta();
      const idx = meta.categories.findIndex((c: any) => c.id === data.id);
      if (idx === -1) return jsonResponse({ success: false, error: "Category not found" }, 404);
      meta.categories[idx] = {
        ...meta.categories[idx],
        name: data.name || meta.categories[idx].name,
        slug: data.slug || meta.categories[idx].slug,
        description: data.description ?? meta.categories[idx].description,
        color: data.color ?? meta.categories[idx].color,
      };
      saveMeta(meta);
      return jsonResponse({ success: true, message: "Category updated!", category: meta.categories[idx] });
    }

    // ── Update tag ──────────────────────────────────────────────────────────
    if (action === "tag") {
      const meta = getMeta();
      const idx = meta.tags.findIndex((t: any) => t.id === data.id);
      if (idx === -1) return jsonResponse({ success: false, error: "Tag not found" }, 404);
      meta.tags[idx] = {
        ...meta.tags[idx],
        name: data.name || meta.tags[idx].name,
        slug: data.slug || meta.tags[idx].slug,
        description: data.description ?? meta.tags[idx].description,
        color: data.color ?? meta.tags[idx].color,
      };
      saveMeta(meta);
      return jsonResponse({ success: true, message: "Tag updated!", tag: meta.tags[idx] });
    }

    // ── Update author ───────────────────────────────────────────────────────
    if (action === "author") {
      const meta = getMeta();
      const idx = meta.authors.findIndex((a: any) => a.id === data.id);
      if (idx === -1) return jsonResponse({ success: false, error: "Author not found" }, 404);
      meta.authors[idx] = {
        ...meta.authors[idx],
        name: data.name || meta.authors[idx].name,
        slug: data.slug || meta.authors[idx].slug,
        email: data.email ?? meta.authors[idx].email,
        bio: data.bio ?? meta.authors[idx].bio,
        avatar: data.avatar ?? meta.authors[idx].avatar,
        role: data.role ?? meta.authors[idx].role,
        website: data.website ?? meta.authors[idx].website,
        twitter: data.twitter ?? meta.authors[idx].twitter,
        linkedin: data.linkedin ?? meta.authors[idx].linkedin,
      };
      saveMeta(meta);
      return jsonResponse({ success: true, message: "Author updated!", author: meta.authors[idx] });
    }

    // ── Update comment status ───────────────────────────────────────────────
    if (action === "comment") {
      const comments = getComments();
      const idx = comments.findIndex((c: any) => c.id === data.id);
      if (idx === -1) return jsonResponse({ success: false, error: "Comment not found" }, 404);
      comments[idx].status = data.status || comments[idx].status;
      saveComments(comments);
      return jsonResponse({ success: true, message: "Comment updated!" });
    }

    // ── Update settings ─────────────────────────────────────────────────────
    if (action === "settings") {
      const meta = getMeta();
      meta.settings = { ...meta.settings, ...data.settings };
      saveMeta(meta);
      return jsonResponse({ success: true, message: "Settings saved!" });
    }

    // ── Increment view count (public) ───────────────────────────────────────
    if (action === "view") {
      const slug = data.slug;
      if (!slug) return jsonResponse({ success: false, error: "slug required" }, 400);
      const filePath = path.join(BLOG_DIR, `${slug}.md`);
      if (!fs.existsSync(filePath)) return jsonResponse({ success: false, error: "Post not found" }, 404);
      const content = fs.readFileSync(filePath, "utf-8");
      const { data: postData, body } = parseMarkdown(content);
      postData.views = (postData.views || 0) + 1;
      // Don't update updatedDate for view increment
      const yamlStr = stringify(postData);
      fs.writeFileSync(filePath, `---\n${yamlStr}---\n\n${body}`, "utf-8");
      return jsonResponse({ success: true, views: postData.views });
    }

    return jsonResponse({ success: false, error: "Invalid action" }, 400);
  } catch (e: any) {
    return jsonResponse({ success: false, error: e.message }, 500);
  }
};

// ─── DELETE ───────────────────────────────────────────────────────────────────
export const DELETE: APIRoute = async ({ request, cookies }) => {
  const session = cookies.get("cms_session")?.value;
  if (session !== SESSION_TOKEN) return unauthorized();
  ensureDirs();

  try {
    const data = await request.json();
    const action = data.action || "post";

    if (action === "post") {
      const slug = data.slug;
      if (!slug) return jsonResponse({ success: false, error: "slug required" }, 400);
      const filePath = path.join(BLOG_DIR, `${slug}.md`);
      if (!fs.existsSync(filePath)) return jsonResponse({ success: false, error: "Post not found" }, 404);
      fs.unlinkSync(filePath);
      // Also delete any associated comments
      const comments = getComments().filter((c: any) => c.postSlug !== slug);
      saveComments(comments);
      return jsonResponse({ success: true, message: "Post deleted!" });
    }

    if (action === "category") {
      const meta = getMeta();
      const idx = meta.categories.findIndex((c: any) => c.id === data.id);
      if (idx === -1) return jsonResponse({ success: false, error: "Category not found" }, 404);
      if (meta.categories[idx].slug === "uncategorized") {
        return jsonResponse({ success: false, error: "Cannot delete the default category" }, 400);
      }
      meta.categories.splice(idx, 1);
      saveMeta(meta);
      return jsonResponse({ success: true, message: "Category deleted!" });
    }

    if (action === "tag") {
      const meta = getMeta();
      const idx = meta.tags.findIndex((t: any) => t.id === data.id);
      if (idx === -1) return jsonResponse({ success: false, error: "Tag not found" }, 404);
      meta.tags.splice(idx, 1);
      saveMeta(meta);
      return jsonResponse({ success: true, message: "Tag deleted!" });
    }

    if (action === "author") {
      const meta = getMeta();
      const idx = meta.authors.findIndex((a: any) => a.id === data.id);
      if (idx === -1) return jsonResponse({ success: false, error: "Author not found" }, 404);
      if (meta.authors[idx].id === "author-admin") {
        return jsonResponse({ success: false, error: "Cannot delete the default author" }, 400);
      }
      meta.authors.splice(idx, 1);
      saveMeta(meta);
      return jsonResponse({ success: true, message: "Author deleted!" });
    }

    if (action === "comment") {
      const comments = getComments();
      const idx = comments.findIndex((c: any) => c.id === data.id);
      if (idx === -1) return jsonResponse({ success: false, error: "Comment not found" }, 404);
      comments.splice(idx, 1);
      saveComments(comments);
      return jsonResponse({ success: true, message: "Comment deleted!" });
    }

    return jsonResponse({ success: false, error: "Invalid action" }, 400);
  } catch (e: any) {
    return jsonResponse({ success: false, error: e.message }, 500);
  }
};
