# Clean Slate CMS Architecture Guide

> A developer-first, zero-template, fully-manual CMS architecture built on Astro SSR with filesystem-backed content.

---

## Overview

This guide describes the current architecture, how to cleanly reset it, and how to build everything from scratch. Every page, section, schema, and component is created manually — nothing is preregistered.

---

## Current Architecture Summary

```
LearningAstro/
├── src/
│   ├── content/                  # Markdown-based content store
│   │   ├── blog/                 # Blog posts (.md with YAML frontmatter)
│   │   ├── pages/                # CMS-managed pages
│   │   ├── sections/             # Reusable section instances
│   │   └── revisions/            # Page revision history
│   ├── data/                     # JSON config files
│   │   ├── blog-meta.json        # Categories, tags, authors
│   │   ├── blog-comments.json    # Blog comments
│   │   ├── global-settings.json  # Site-wide settings
│   │   ├── menus.json            # Navigation menus
│   │   └── redirects.json        # URL redirects
│   ├── pages/
│   │   ├── api/                  # Backend API endpoints
│   │   │   ├── blog-crud.ts      # Blog CRUD API
│   │   │   ├── pages-crud.ts     # Pages CRUD API
│   │   │   ├── media-crud.ts     # Media library API
│   │   │   └── ...               # Other APIs
│   │   ├── admin/                # CMS Admin interface
│   │   │   ├── blog/             # Blog management pages
│   │   │   ├── editor.astro      # Page builder
│   │   │   ├── media.astro       # Media library
│   │   │   └── ...               # Other admin pages
│   │   └── blog/                 # Public blog pages
│   ├── layouts/
│   │   ├── MainLayout.astro      # Public site layout
│   │   └── admin/
│   │       └── AdminLayout.astro # Admin panel layout
│   ├── utils/
│   │   └── blog.ts               # Dynamic blog post loader
│   └── ...
├── public/
│   ├── uploads/                  # Media library uploads
│   └── ...
```

---

## Section 1: Clean Slate — Wiping Demo Content

> [!CAUTION]
> Run these steps only after explicit confirmation. They permanently delete all demo data.

### Step 1: Clear Blog Posts
```powershell
Remove-Item "src\content\blog\*.md" -Force
```

### Step 2: Clear CMS Pages
```powershell
Remove-Item "src\content\pages\*.md" -Force
```

### Step 3: Reset Blog Meta (Categories, Tags, Authors)
```powershell
$meta = @{
  categories = @(@{ id="cat-uncategorized"; name="Uncategorized"; slug="uncategorized"; description=""; color="#6366F1"; createdAt=(Get-Date -Format o) })
  tags = @()
  authors = @(@{ id="author-admin"; name="Admin"; slug="admin"; email=""; bio=""; avatar=""; role="Administrator"; website=""; twitter=""; linkedin=""; createdAt=(Get-Date -Format o) })
  settings = @{ postsPerPage=9; commentsEnabled=$true; commentsModeration=$true }
} | ConvertTo-Json -Depth 5
$meta | Out-File "src\data\blog-meta.json" -Encoding UTF8
```

### Step 4: Clear Comments
```powershell
"[]" | Out-File "src\data\blog-comments.json" -Encoding UTF8
```

### Step 5: Clear Menus
```powershell
"[]" | Out-File "src\data\menus.json" -Encoding UTF8
```

---

## Section 2: Content Storage Structure

### Blog Post Schema (Markdown Frontmatter)
```markdown
---
title: My Post Title
slug: my-post-slug
excerpt: Brief summary for SEO and listings
author: author-admin
category: uncategorized
tags:
  - tag-slug-1
  - tag-slug-2
featuredImage: /uploads/my-image.jpg
status: draft          # draft | published | scheduled | archived
publishDate: 2026-01-01T09:00:00Z
scheduledDate: ""
views: 0
headerScripts: ""      # Per-post <head> script injection
footerScripts: ""      # Per-post <body> end script injection
customCss: ""          # Per-post inline CSS
customJs: ""           # Per-post inline JS
seo:
  metaTitle: Custom SEO Title
  metaDescription: Custom meta description
  ogImage: /uploads/og-image.jpg
  focusKeyword: primary keyword
  canonicalUrl: ""
  robots: index, follow
  schemaType: none      # none | article | custom
  schemaMarkup: ""      # JSON-LD markup
updatedDate: 2026-01-01T09:00:00Z
---

Post content (HTML from Quill editor or raw Markdown)
```

### CMS Page Schema
```markdown
---
title: Page Title
slug: page-slug
status: published
seo:
  metaTitle: SEO Title
  metaDescription: SEO Description
  robots: index, follow
blocks: []             # Array of block definitions
headerScripts: ""
footerScripts: ""
customCss: ""
customJs: ""
updatedDate: 2026-01-01T09:00:00Z
---
```

---

## Section 3: Blog Module Workflow

### Creating a New Blog Post
1. Go to **Admin → Blog → New Post** (`/admin/blog/create`)
2. Set title, slug, content (Quill editor), category, tags
3. Upload/select featured image from media library
4. Fill in SEO fields (accordion panel)
5. Optionally add custom CSS/JS/Scripts
6. Click **Publish** or **Save Draft**

### Editing a Post
1. Go to **Admin → Blog → All Posts**
2. Click the edit (pencil) icon on any row
3. All fields load automatically from the markdown file
4. Make changes and click **Update**

### Status Flow
```
Draft → Published → Archived
  ↓
Scheduled (future publish date)
```

### Media in Posts
- Click the **Image button** in the Quill toolbar
- Media library picker opens
- Select an uploaded image — it inserts the URL (not base64!)
- Or paste an external image URL and click **Insert**

---

## Section 4: Media Library

### Upload Location
All media uploads are stored in: `public/uploads/`

### Media Catalog
A catalog is maintained at: `public/uploads/media-meta.json`

### How to Upload
1. Go to **Admin → Media Library** (`/admin/media`)
2. Drag & drop files or click to browse
3. Supported: JPEG, PNG, WebP, GIF, AVIF, SVG, MP4, PDF, etc.

### Image Variants (Automatic)
When uploading a raster image, Sharp automatically generates:
- `thumb` — 150px
- `small` — 400px
- `medium` — 800px
- `large` — 1600px
- `.webp` versions of each

---

## Section 5: SEO Best Practices (Already Implemented)

### Blog Post Level
- `metaTitle` → `<title>` tag
- `metaDescription` → `<meta name="description">`
- `ogImage` → `<meta property="og:image">`
- `robots` → `<meta name="robots">`
- `canonicalUrl` → `<link rel="canonical">`
- `schemaMarkup` → `<script type="application/ld+json">`
- Auto-generated Article Schema if `schemaType: article`
- Auto-generated Breadcrumb schema

### Global Level (Settings → SEO)
- Site name, description, OG image
- Organization JSON-LD schema
- Sitewide header/footer scripts

### Sitemap
Dynamic sitemap at `/sitemap.xml` — reads from filesystem, no rebuild needed.

---

## Section 6: Page Speed Optimization

### Already Implemented
- ✅ Lazy loading images (`loading="lazy"`)
- ✅ High priority on hero images (`fetchpriority="high"`)
- ✅ WebP variants generated on upload
- ✅ Font preconnect links
- ✅ `decoding="async"` on images
- ✅ No base64 images in content (now using media picker URLs)
- ✅ SSR (no static export) for always-fresh content

### Recommended Additions
- Use `srcset` with generated variants for responsive images
- Enable browser caching for `/uploads/` assets (server config)
- Use preload for above-the-fold images

---

## Section 7: Developer Workflow — Adding New Sections

The page builder (`/admin/editor`) supports custom block types. To add a new section:

### Step 1: Define the section in `src/block-registry/`
Create a schema definition file (e.g., `hero-banner.json`):
```json
{
  "id": "hero-banner",
  "name": "Hero Banner",
  "icon": "🖼️",
  "fields": [
    { "key": "headline", "label": "Headline", "type": "text" },
    { "key": "subtext", "label": "Subtext", "type": "textarea" },
    { "key": "backgroundImage", "label": "Background", "type": "image" },
    { "key": "ctaText", "label": "CTA Text", "type": "text" },
    { "key": "ctaUrl", "label": "CTA URL", "type": "url" }
  ]
}
```

### Step 2: Create the render component in `src/blocks/`
Create `HeroBanner.astro`:
```astro
---
interface Props {
  headline: string;
  subtext: string;
  backgroundImage: string;
  ctaText: string;
  ctaUrl: string;
}

const { headline, subtext, backgroundImage, ctaText, ctaUrl } = Astro.props;
---

<section class="hero-banner" style={`background-image: url(${backgroundImage})`}>
  <div class="container">
    <h1>{headline}</h1>
    <p>{subtext}</p>
    {ctaText && ctaUrl && (
      <a href={ctaUrl} class="btn">{ctaText}</a>
    )}
  </div>
</section>
```

### Step 3: Register in the page renderer
In `src/pages/[...slug].astro` (or your dynamic page renderer), add:
```astro
{block.type === 'hero-banner' && <HeroBanner {...block.data} />}
```

---

## Section 8: Authentication

The CMS uses a simple cookie-based session:

```
Cookie: cms_session=authenticated-admin-session-2026
```

To change this, update the `SESSION_TOKEN` constant in:
- `src/pages/api/blog-crud.ts`
- `src/pages/api/pages-crud.ts`
- `src/pages/api/media-crud.ts`
- `src/layouts/admin/AdminLayout.astro`
- `src/pages/admin/login.astro`

> [!WARNING]
> For production, replace this with a proper authentication system (JWT, OAuth, etc.).

---

## Section 9: Migration Strategy

### Moving to a Database
1. Extract all markdown files to a JSON/database structure
2. Replace filesystem API calls with database queries
3. Keep the same API interface (GET/POST/PUT/DELETE endpoints)

### Scaling Content
- Blog posts work well as markdown files up to ~1000 posts
- For larger scale, consider a headless CMS or database backend
- The API abstraction layer makes this migration straightforward

---

## Section 10: Admin Panel Routes Reference

| Route | Description |
|---|---|
| `/admin` | Dashboard |
| `/admin/blog` | All blog posts |
| `/admin/blog/create` | Create new post |
| `/admin/blog/edit?slug=XXX` | Edit existing post |
| `/admin/blog/categories` | Manage categories |
| `/admin/blog/tags` | Manage tags |
| `/admin/blog/authors` | Manage authors |
| `/admin/blog/comments` | Moderate comments |
| `/admin/blog/settings` | Blog settings |
| `/admin/pages` | All CMS pages |
| `/admin/editor?slug=XXX` | Page builder |
| `/admin/media` | Media library |
| `/admin/menus` | Menu builder |
| `/admin/seo` | SEO settings |
| `/admin/settings` | Global settings |
| `/admin/redirects` | URL redirects |
| `/admin/accounts` | User accounts |

---

## Section 11: Bug Fixes Applied (June 2026)

| Bug | Fix |
|---|---|
| Quill editor embeds base64 images | Overrode image handler to open media library picker |
| Preview opens live page | Added `?preview=true` to all preview links |
| Edit after creation not working | API session cookie fix + full page redirect |
| Duplicate post editing | Same as above |
| Feature image not loading in picker | Fixed API call to use `/api/media-crud` (not `?action=list`) |
| SEO/Scripts not saving | API was working; confirmed via API tests |

