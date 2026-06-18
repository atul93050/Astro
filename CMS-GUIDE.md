# Clean CMS Implementation Guide
## Astro SSR · Filesystem Storage · Zero Demo Content

> **Stack**: Astro 6 (SSR/server mode) · Node.js adapter · YAML frontmatter · Sharp · Quill
> **Philosophy**: Filesystem is the database. Markdown is the schema. No migrations, no ORM, no demo bloat.

---

## Table of Contents

1. [Clean CMS Architecture](#1-clean-cms-architecture)
2. [Initial Project Structure](#2-initial-project-structure)
3. [Section Definition System](#3-section-definition-system)
4. [Dynamic Schema Builder](#4-dynamic-schema-builder)
5. [Section Library Workflow](#5-section-library-workflow)
6. [Page Builder Workflow](#6-page-builder-workflow)
7. [Media Library Setup](#7-media-library-setup)
8. [Menu Management](#8-menu-management)
9. [SEO Management](#9-seo-management)
10. [Blog System](#10-blog-system)
11. [Reusable Section Architecture](#11-reusable-section-architecture)
12. [Custom HTML/Astro Block Registration](#12-custom-htmlastro-block-registration)
13. [Dynamic Form Field Generation](#13-dynamic-form-field-generation)
14. [Content Storage Structure](#14-content-storage-structure)
15. [Frontend Rendering Flow](#15-frontend-rendering-flow)
16. [CSS/JS Organization](#16-cssjs-organization)
17. [Developer Workflow for Adding New Sections](#17-developer-workflow-for-adding-new-sections)
18. [Migration Strategy for Future Templates](#18-migration-strategy-for-future-templates)
19. [Best Practices for Scalability and Maintainability](#19-best-practices-for-scalability-and-maintainability)

---

## 1. Clean CMS Architecture

### The Three-Layer Model

```
┌─────────────────────────────────────────────────────┐
│  CONTENT LAYER  (src/content/)                      │
│  .md files with YAML frontmatter — the source of    │
│  truth for every page, section, blog post, and menu │
└───────────────────────┬─────────────────────────────┘
                        │ read/write via Node fs
┌───────────────────────▼─────────────────────────────┐
│  API LAYER  (src/pages/api/)                        │
│  Astro SSR endpoints — CRUD operations on files.    │
│  Auth-gated. Returns JSON. Never touches DOM.       │
└───────────────────────┬─────────────────────────────┘
                        │ fetch()
┌───────────────────────▼─────────────────────────────┐
│  PRESENTATION LAYER                                 │
│  Admin UI  →  /admin/*   (Astro pages)              │
│  Public site →  [...slug].astro  (BlockRenderer)    │
└─────────────────────────────────────────────────────┘
```

### Core Principles

| Principle | Why |
|-----------|-----|
| Filesystem = database | Zero infrastructure, version-controllable, editor-friendly |
| YAML frontmatter = schema | Human-readable, diff-friendly, no migrations |
| Blocks = composable units | Pages become arrays of typed blocks, never monoliths |
| Section Definitions = contracts | A definition describes *shape*; an instance *fills* that shape |
| Admin writes files, frontend reads files | Clean read/write separation, SSR renders fresh each request |

### Data Flow (Clean Slate)

```
Developer defines section type
        ↓
Developer creates .astro block component
        ↓
Block registered in block-registry/blocks.ts
        ↓
Admin creates section instance (fills fields)
        ↓
Admin builds page (drops section onto page)
        ↓
[...slug].astro resolves page → BlockRenderer loops blocks → renders HTML
```

---

## 2. Initial Project Structure

### Clean-Slate Folder Layout

```
src/
├── block-registry/
│   └── blocks.ts               ← ALL block type definitions live here
├── blocks/                     ← One .astro file per block type
│   └── (empty on day 1)
├── components/
│   ├── BlockRenderer.astro     ← Dynamic renderer — import all blocks here
│   ├── Header.astro
│   └── Footer.astro
├── content/
│   ├── pages/                  ← CMS pages (.md with YAML blocks array)
│   ├── sections/               ← Section instances (.md)
│   ├── blog/                   ← Blog posts (.md)
│   ├── contacts/               ← Form submissions (.md)
│   └── revisions/              ← Auto-saved page revisions
├── data/
│   ├── global-settings.json    ← Logo, social links, GA tag, etc.
│   ├── menus.json              ← Navigation menus
│   ├── blog-meta.json          ← Authors, categories, tags
│   ├── admin-users.json        ← CMS users (hashed passwords)
│   └── section-definitions.json← Field schema definitions per block type
├── layouts/
│   ├── MainLayout.astro
│   └── admin/
│       └── AdminLayout.astro
├── middleware.ts               ← Session auth guard
├── pages/
│   ├── [...slug].astro         ← Catch-all public router
│   ├── 404.astro
│   ├── blog/                   ← Blog archive routes
│   ├── admin/                  ← Every admin screen
│   └── api/                    ← All CRUD endpoints
├── styles/
│   ├── admin/
│   ├── pages/
│   └── sections/
└── utils/
    ├── content.ts              ← File read/write helpers
    ├── auth.ts                 ← Session helpers
    ├── slug.ts                 ← Slug generation
    └── image.ts                ← Sharp resize helpers
```

### `src/content.config.ts` — Minimal Clean-Slate Schema

```typescript
import { defineCollection, z } from 'astro:content';

// Block shape: { type: string, sectionId?: string, ...fields }
const blockSchema = z.object({
  type: z.string(),
  sectionId: z.string().optional(),
}).catchall(z.any());

const pages = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    status: z.enum(['draft', 'published']).default('draft'),
    blocks: z.array(blockSchema).default([]),
    seo: z.object({
      title: z.string().optional(),
      description: z.string().optional(),
      ogImage: z.string().optional(),
      robots: z.string().default('index,follow'),
    }).optional(),
    customCss: z.string().optional(),
    customJs: z.string().optional(),
    lastUpdated: z.string().optional(),
  }),
});

const sections = defineCollection({
  type: 'content',
  schema: z.record(z.any()),   // fully dynamic — shape is driven by block type
});

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    excerpt: z.string().optional(),
    author: z.string().optional(),
    category: z.string().optional(),
    tags: z.array(z.string()).default([]),
    status: z.enum(['draft', 'published', 'scheduled', 'archived']).default('draft'),
    publishedAt: z.string().optional(),
    scheduledAt: z.string().optional(),
    updatedAt: z.string().optional(),
    featuredImage: z.string().optional(),
    seo: z.object({
      title: z.string().optional(),
      description: z.string().optional(),
      ogImage: z.string().optional(),
      focusKeyword: z.string().optional(),
    }).optional(),
  }),
});

const contacts = defineCollection({
  type: 'content',
  schema: z.object({
    name: z.string(),
    email: z.string(),
    subject: z.string().optional(),
    message: z.string(),
    submittedAt: z.string(),
    read: z.boolean().default(false),
  }),
});

export const collections = { pages, sections, blog, contacts };
```

### Bootstrap Files (start empty)

```bash
# Create these empty files on first run
echo '{}' > src/data/global-settings.json
echo '{"mainNav":[],"footerNav":[]}' > src/data/menus.json
echo '{"authors":[],"categories":[],"tags":[]}' > src/data/blog-meta.json
echo '[]' > src/data/admin-users.json
echo '{}' > src/data/section-definitions.json
```

---

## 3. Section Definition System

A **Section Definition** is the blueprint for a block type. It describes:
- What fields the block has
- What type each field is
- Default values
- Display metadata (label, icon, category)

### `src/data/section-definitions.json` — Structure

```json
{
  "hero-banner": {
    "type": "hero-banner",
    "label": "Hero Banner",
    "category": "hero",
    "icon": "🏆",
    "fields": [
      { "key": "badge",        "label": "Badge Text",       "type": "text",     "default": "" },
      { "key": "heading",      "label": "Heading",          "type": "text",     "default": "" },
      { "key": "subheading",   "label": "Sub Heading",      "type": "textarea", "default": "" },
      { "key": "ctaLabel",     "label": "CTA Button Text",  "type": "text",     "default": "" },
      { "key": "ctaLink",      "label": "CTA Button Link",  "type": "text",     "default": "#" },
      { "key": "image",        "label": "Hero Image",       "type": "image",    "default": "" },
      { "key": "bullets",      "label": "Bullet Points",    "type": "list",     "default": [] }
    ]
  },
  "stats-grid": {
    "type": "stats-grid",
    "label": "Stats Grid",
    "category": "marketing",
    "icon": "📊",
    "fields": [
      { "key": "heading", "label": "Section Heading", "type": "text", "default": "" },
      {
        "key": "stats",
        "label": "Stats",
        "type": "repeater",
        "default": [],
        "subFields": [
          { "key": "value",  "label": "Value",  "type": "text" },
          { "key": "label",  "label": "Label",  "type": "text" },
          { "key": "prefix", "label": "Prefix", "type": "text" },
          { "key": "suffix", "label": "Suffix", "type": "text" }
        ]
      }
    ]
  }
}
```

### Field Types Reference

| `type` | Editor UI | Value Type |
|--------|-----------|------------|
| `text` | `<input type="text">` | `string` |
| `textarea` | `<textarea>` | `string` |
| `richtext` | Quill editor | `string` (HTML) |
| `number` | `<input type="number">` | `number` |
| `boolean` | `<input type="checkbox">` | `boolean` |
| `select` | `<select>` | `string` |
| `image` | Media picker | `string` (URL path) |
| `list` | Add/remove text items | `string[]` |
| `repeater` | Add/remove sub-object rows | `object[]` |
| `color` | `<input type="color">` | `string` (hex) |
| `url` | `<input type="url">` | `string` |
| `date` | `<input type="date">` | `string` (ISO) |

### API: Section Definitions CRUD

**File**: `src/pages/api/section-definitions-crud.ts`

```typescript
import type { APIRoute } from 'astro';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const DEFS_PATH = join(process.cwd(), 'src/data/section-definitions.json');

function readDefs() {
  return JSON.parse(readFileSync(DEFS_PATH, 'utf-8'));
}

function writeDefs(data: object) {
  writeFileSync(DEFS_PATH, JSON.stringify(data, null, 2));
}

export const GET: APIRoute = async () => {
  return new Response(JSON.stringify(readDefs()), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  const { type, label, category, icon, fields } = body;

  if (!type || !label) {
    return new Response(JSON.stringify({ error: 'type and label are required' }), { status: 400 });
  }

  const defs = readDefs();
  defs[type] = { type, label, category: category || 'general', icon: icon || '📦', fields: fields || [] };
  writeDefs(defs);

  return new Response(JSON.stringify({ success: true, definition: defs[type] }));
};

export const DELETE: APIRoute = async ({ request }) => {
  const { type } = await request.json();
  const defs = readDefs();
  delete defs[type];
  writeDefs(defs);
  return new Response(JSON.stringify({ success: true }));
};
```

---

## 4. Dynamic Schema Builder

The Schema Builder is an **admin UI** where you define new block types without touching code. It generates a new entry in `section-definitions.json` and creates the `.astro` block file stub.

### Admin Page: `/admin/section-definitions`

```html
<!-- Conceptual UI layout -->
<form id="schema-builder">
  <!-- Block Identity -->
  <input name="type"     placeholder="kebab-case-type-id" />
  <input name="label"    placeholder="Display Name" />
  <input name="category" placeholder="hero | content | marketing | other" />
  <input name="icon"     placeholder="Emoji icon" />

  <!-- Field Builder -->
  <div id="fields-list">
    <!-- Each row: key, label, type, default, required -->
  </div>
  <button type="button" id="add-field">+ Add Field</button>

  <!-- For repeater fields: sub-field builder -->
  <div id="sub-fields-container" hidden>...</div>

  <button type="submit">Save Definition</button>
</form>
```

### JavaScript: Add Field Row

```javascript
function addFieldRow(container, prefix = '') {
  const row = document.createElement('div');
  row.className = 'field-row';
  row.innerHTML = `
    <input type="text"   name="${prefix}key"      placeholder="fieldKey (camelCase)" />
    <input type="text"   name="${prefix}label"    placeholder="Field Label" />
    <select              name="${prefix}type">
      <option value="text">Text</option>
      <option value="textarea">Textarea</option>
      <option value="richtext">Rich Text</option>
      <option value="number">Number</option>
      <option value="boolean">Boolean</option>
      <option value="select">Select</option>
      <option value="image">Image</option>
      <option value="list">List</option>
      <option value="repeater">Repeater</option>
      <option value="color">Color</option>
      <option value="url">URL</option>
      <option value="date">Date</option>
    </select>
    <input type="text"   name="${prefix}default"  placeholder="Default value" />
    <label>
      <input type="checkbox" name="${prefix}required" /> Required
    </label>
    <button type="button" class="remove-field">✕</button>
  `;
  // When type = "repeater", show sub-fields panel
  row.querySelector(`[name="${prefix}type"]`).addEventListener('change', (e) => {
    if (e.target.value === 'repeater') showSubFieldBuilder(row);
  });
  row.querySelector('.remove-field').addEventListener('click', () => row.remove());
  container.appendChild(row);
}
```

### POST handler collects form data and saves definition

```javascript
document.getElementById('schema-builder').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fields = [];
  document.querySelectorAll('.field-row').forEach(row => {
    const field = {
      key: row.querySelector('[name="key"]').value,
      label: row.querySelector('[name="label"]').value,
      type: row.querySelector('[name="type"]').value,
      default: parseDefault(row.querySelector('[name="default"]').value, row.querySelector('[name="type"]').value),
      required: row.querySelector('[name="required"]').checked,
    };
    if (field.type === 'repeater') {
      field.subFields = collectSubFields(row);
    }
    if (field.type === 'select') {
      field.options = row.querySelector('[name="options"]').value.split(',').map(s => s.trim());
    }
    fields.push(field);
  });

  const payload = {
    type: document.querySelector('[name="type"]').value,
    label: document.querySelector('[name="label"]').value,
    category: document.querySelector('[name="category"]').value,
    icon: document.querySelector('[name="icon"]').value,
    fields,
  };

  const res = await fetch('/api/section-definitions-crud', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (data.success) showToast('Definition saved ✓');
});
```

---

## 5. Section Library Workflow

A **Section** is an *instance* of a block type with actual content. Think of it as "hero-banner filled with data for the homepage".

### Section Instance File (`src/content/sections/hero-home.md`)

```markdown
---
type: hero-banner
label: Home Hero
badge: "Award-Winning Agency"
heading: "We Turn Clicks Into Clients"
subheading: "Performance marketing that delivers measurable ROI."
ctaLabel: "Get a Free Audit"
ctaLink: "/contact"
image: "/uploads/hero-bg.webp"
bullets:
  - "Google Partner certified"
  - "Meta Business Partner"
  - "20+ years experience"
---
```

The frontmatter key `type` tells `BlockRenderer` which `.astro` file to import.

### Section CRUD API (`src/pages/api/sections-crud.ts`)

```typescript
import type { APIRoute } from 'astro';
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import matter from 'gray-matter';   // parse YAML frontmatter

const SECTIONS_DIR = join(process.cwd(), 'src/content/sections');

export const GET: APIRoute = async ({ url }) => {
  const id = url.searchParams.get('id');
  if (id) {
    const filePath = join(SECTIONS_DIR, `${id}.md`);
    if (!existsSync(filePath)) return new Response('Not found', { status: 404 });
    const raw = readFileSync(filePath, 'utf-8');
    const { data } = matter(raw);
    return new Response(JSON.stringify({ id, ...data }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // List all sections
  const { readdirSync } = await import('fs');
  const files = readdirSync(SECTIONS_DIR).filter(f => f.endsWith('.md'));
  const sections = files.map(f => {
    const raw = readFileSync(join(SECTIONS_DIR, f), 'utf-8');
    const { data } = matter(raw);
    return { id: f.replace('.md', ''), ...data };
  });
  return new Response(JSON.stringify(sections), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  const { id, ...fields } = body;
  const slug = id || generateSlug(fields.label || fields.type);
  const content = matter.stringify('', fields);
  writeFileSync(join(SECTIONS_DIR, `${slug}.md`), content);
  return new Response(JSON.stringify({ success: true, id: slug }));
};

export const PUT: APIRoute = async ({ request }) => {
  const body = await request.json();
  const { id, ...fields } = body;
  const filePath = join(SECTIONS_DIR, `${id}.md`);
  writeFileSync(filePath, matter.stringify('', fields));
  return new Response(JSON.stringify({ success: true }));
};

export const DELETE: APIRoute = async ({ request }) => {
  const { id } = await request.json();
  const filePath = join(SECTIONS_DIR, `${id}.md`);
  if (existsSync(filePath)) unlinkSync(filePath);
  return new Response(JSON.stringify({ success: true }));
};

function generateSlug(label: string) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}
```

### Section Library Admin Page (`/admin/sections`)

The UI should show:
1. **Filter by block type** (dropdown from section-definitions.json)
2. **Search by label**
3. **Cards grid** — each card shows type badge, label, last modified
4. **Actions**: Edit, Duplicate, Delete, Preview
5. **+ New Section** button → opens section editor with empty form for chosen type

---

## 6. Page Builder Workflow

A **Page** is a `.md` file whose frontmatter contains a `blocks` array. Each block entry is either:
- **An embedded block**: All fields inline in the page frontmatter
- **A section reference**: Only `{ type: "...", sectionId: "hero-home" }` — fields pulled from the section instance at render time

### Page File (`src/content/pages/home.md`)

```markdown
---
title: "Home"
slug: ""
status: published
seo:
  title: "Home | Tangence"
  description: "Performance marketing agency."
blocks:
  - type: hero-banner
    sectionId: hero-home           # reference — fields loaded from sections/hero-home.md

  - type: stats-grid
    heading: "Our Numbers"         # embedded — fields inline
    stats:
      - { value: "20+", label: "Years", suffix: "yrs" }
      - { value: "500", label: "Clients", suffix: "+" }

  - type: custom-html
    html: "<div class='custom'>Hello</div>"
lastUpdated: "2026-06-18T00:00:00Z"
---
```

### Page Builder Editor Logic

The editor at `/admin/editor` must:

1. **Load page** → parse `blocks` array from YAML
2. **Render block list** → draggable sortable list (use SortableJS)
3. **Each block row** → shows type icon + label + expand/collapse
4. **Expand block** → loads field UI from `section-definitions.json[block.type].fields`
5. **"Add Block" panel** → shows all registered block types grouped by category
6. **Save** → serialize updated blocks array back to YAML frontmatter, POST to `/api/pages-crud`

### Page CRUD API (`src/pages/api/pages-crud.ts`)

```typescript
import type { APIRoute } from 'astro';
import { readFileSync, writeFileSync, existsSync, unlinkSync, readdirSync } from 'fs';
import { join } from 'path';
import matter from 'gray-matter';

const PAGES_DIR = join(process.cwd(), 'src/content/pages');
const REVISIONS_DIR = join(process.cwd(), 'src/content/revisions');

export const GET: APIRoute = async ({ url }) => {
  const slug = url.searchParams.get('slug');
  if (slug) {
    const filePath = join(PAGES_DIR, `${slug || 'index'}.md`);
    if (!existsSync(filePath)) return new Response('Not found', { status: 404 });
    const raw = readFileSync(filePath, 'utf-8');
    const { data, content } = matter(raw);
    return new Response(JSON.stringify({ slug, ...data, body: content }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const files = readdirSync(PAGES_DIR).filter(f => f.endsWith('.md'));
  const pages = files.map(f => {
    const { data } = matter(readFileSync(join(PAGES_DIR, f), 'utf-8'));
    return { id: f.replace('.md', ''), ...data };
  });
  return new Response(JSON.stringify(pages), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  const { slug, ...pageData } = body;
  const fileSlug = slug === '' ? 'index' : slug;
  pageData.lastUpdated = new Date().toISOString();

  // Save revision before overwrite
  saveRevision(fileSlug, readFileSync(join(PAGES_DIR, `${fileSlug}.md`), 'utf-8'));

  const content = matter.stringify('', pageData);
  writeFileSync(join(PAGES_DIR, `${fileSlug}.md`), content);
  return new Response(JSON.stringify({ success: true }));
};

export const PUT: APIRoute = async ({ request }) => {
  const body = await request.json();
  const { slug, ...pageData } = body;
  const fileSlug = slug === '' ? 'index' : slug;
  pageData.lastUpdated = new Date().toISOString();
  const existing = join(PAGES_DIR, `${fileSlug}.md`);
  if (existsSync(existing)) saveRevision(fileSlug, readFileSync(existing, 'utf-8'));
  writeFileSync(existing, matter.stringify('', pageData));
  return new Response(JSON.stringify({ success: true }));
};

export const DELETE: APIRoute = async ({ request }) => {
  const { slug } = await request.json();
  const filePath = join(PAGES_DIR, `${slug}.md`);
  if (existsSync(filePath)) unlinkSync(filePath);
  return new Response(JSON.stringify({ success: true }));
};

function saveRevision(slug: string, content: string) {
  const { mkdirSync } = require('fs');
  const dir = join(REVISIONS_DIR, slug);
  mkdirSync(dir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  writeFileSync(join(dir, `${ts}.md`), content);
}
```

---

## 7. Media Library Setup

### Upload API (`src/pages/api/media-crud.ts`)

```typescript
import type { APIRoute } from 'astro';
import { writeFileSync, readFileSync, existsSync, unlinkSync, mkdirSync } from 'fs';
import { join, extname, basename } from 'path';
import sharp from 'sharp';

const UPLOADS_DIR = join(process.cwd(), 'public/uploads');
const META_PATH = join(UPLOADS_DIR, 'media-meta.json');

function readMeta() {
  if (!existsSync(META_PATH)) return [];
  return JSON.parse(readFileSync(META_PATH, 'utf-8'));
}

function writeMeta(data: any[]) {
  writeFileSync(META_PATH, JSON.stringify(data, null, 2));
}

export const POST: APIRoute = async ({ request }) => {
  mkdirSync(UPLOADS_DIR, { recursive: true });
  const formData = await request.formData();
  const file = formData.get('file') as File;
  if (!file) return new Response(JSON.stringify({ error: 'No file' }), { status: 400 });

  const ext = extname(file.name).toLowerCase();
  const allowedExts = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.pdf'];
  if (!allowedExts.includes(ext)) {
    return new Response(JSON.stringify({ error: 'File type not allowed' }), { status: 400 });
  }

  const ts = Date.now();
  const safeName = `${ts}-${file.name.replace(/[^a-z0-9.-]/gi, '-').toLowerCase()}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const fullPath = join(UPLOADS_DIR, safeName);
  writeFileSync(fullPath, buffer);

  const meta: any = {
    id: ts.toString(),
    filename: safeName,
    originalName: file.name,
    url: `/uploads/${safeName}`,
    size: buffer.length,
    mimeType: file.type,
    uploadedAt: new Date().toISOString(),
    variants: {},
  };

  // Generate responsive variants for images
  if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
    const sizes = { thumb: 150, small: 480, medium: 800, large: 1400 };
    for (const [label, width] of Object.entries(sizes)) {
      const variantName = safeName.replace(ext, `-${label}.webp`);
      await sharp(buffer).resize({ width }).webp({ quality: 80 }).toFile(join(UPLOADS_DIR, variantName));
      meta.variants[label] = `/uploads/${variantName}`;
    }
    const imgMeta = await sharp(buffer).metadata();
    meta.width = imgMeta.width;
    meta.height = imgMeta.height;
  }

  const allMeta = readMeta();
  allMeta.unshift(meta);
  writeMeta(allMeta);

  return new Response(JSON.stringify({ success: true, file: meta }));
};

export const DELETE: APIRoute = async ({ request }) => {
  const { id } = await request.json();
  const allMeta = readMeta();
  const item = allMeta.find(m => m.id === id);
  if (!item) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });

  // Delete all variants
  const pathsToDelete = [item.filename, ...Object.values(item.variants || {}).map((v: any) => basename(v))];
  for (const fname of pathsToDelete) {
    const p = join(UPLOADS_DIR, fname);
    if (existsSync(p)) unlinkSync(p);
  }

  writeMeta(allMeta.filter(m => m.id !== id));
  return new Response(JSON.stringify({ success: true }));
};

export const GET: APIRoute = async ({ url }) => {
  const page = parseInt(url.searchParams.get('page') || '1');
  const type = url.searchParams.get('type'); // 'image' | 'pdf' | all
  let allMeta = readMeta();
  if (type === 'image') allMeta = allMeta.filter(m => m.mimeType?.startsWith('image/'));
  const PAGE_SIZE = 24;
  const start = (page - 1) * PAGE_SIZE;
  return new Response(JSON.stringify({
    files: allMeta.slice(start, start + PAGE_SIZE),
    total: allMeta.length,
    page,
  }), { headers: { 'Content-Type': 'application/json' } });
};
```

### Media Picker Component (reusable in admin forms)

```html
<!-- Used in any block field of type="image" -->
<div class="media-picker" data-field="image">
  <img class="preview" src="" alt="Preview" hidden />
  <input type="hidden" name="image" value="" />
  <button type="button" class="open-media-modal">Select Image</button>
  <button type="button" class="clear-image" hidden>Remove</button>
</div>

<!-- Media Modal (shared across all pickers) -->
<dialog id="media-modal">
  <div class="modal-header">
    <input type="search" placeholder="Search media..." id="media-search" />
    <label class="upload-btn">
      Upload <input type="file" id="media-upload" accept="image/*,.pdf" hidden />
    </label>
    <button onclick="this.closest('dialog').close()">✕</button>
  </div>
  <div id="media-grid" class="media-grid">
    <!-- populated by JS from GET /api/media-crud -->
  </div>
  <div class="modal-footer">
    <button id="media-select-btn" disabled>Select</button>
  </div>
</dialog>
```

---

## 8. Menu Management

### Data File (`src/data/menus.json`)

```json
{
  "mainNav": [
    { "id": "1", "label": "Home",     "url": "/",        "target": "_self", "children": [] },
    { "id": "2", "label": "Services", "url": "/services","target": "_self", "children": [
      { "id": "2-1", "label": "SEO",       "url": "/services/seo", "target": "_self" },
      { "id": "2-2", "label": "PPC",       "url": "/services/ppc", "target": "_self" }
    ]},
    { "id": "3", "label": "Blog",     "url": "/blog",    "target": "_self", "children": [] }
  ],
  "footerNav": [
    { "id": "f1", "label": "Privacy Policy", "url": "/privacy", "target": "_self" }
  ]
}
```

### Menus API (`src/pages/api/menus-crud.ts`)

```typescript
import type { APIRoute } from 'astro';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const MENUS_PATH = join(process.cwd(), 'src/data/menus.json');

function readMenus() { return JSON.parse(readFileSync(MENUS_PATH, 'utf-8')); }
function writeMenus(data: object) { writeFileSync(MENUS_PATH, JSON.stringify(data, null, 2)); }

export const GET: APIRoute  = async () => new Response(JSON.stringify(readMenus()), { headers: { 'Content-Type': 'application/json' } });
export const PUT: APIRoute  = async ({ request }) => { writeMenus(await request.json()); return new Response(JSON.stringify({ success: true })); };
```

### Rendering Menus in Header.astro

```astro
---
import menusData from '../data/menus.json';
const { mainNav } = menusData;
---
<nav>
  <ul>
    {mainNav.map(item => (
      <li class={item.children?.length ? 'has-children' : ''}>
        <a href={item.url} target={item.target}>{item.label}</a>
        {item.children?.length > 0 && (
          <ul class="dropdown">
            {item.children.map(child => (
              <li><a href={child.url}>{child.label}</a></li>
            ))}
          </ul>
        )}
      </li>
    ))}
  </ul>
</nav>
```

---

## 9. SEO Management

### Per-Page SEO (in page frontmatter)

Every page `.md` file supports:
```yaml
seo:
  title: "Custom Page Title | Site Name"
  description: "150-character description for Google"
  ogImage: "/uploads/og-home.webp"
  robots: "index,follow"
  canonical: "https://example.com/page"
  schemaType: "WebPage"        # WebPage | BlogPosting | FAQPage | LocalBusiness
  focusKeyword: "target keyword"
```

### Global SEO Defaults (`src/data/global-settings.json`)

```json
{
  "site": {
    "name": "Your Site",
    "url": "https://example.com",
    "defaultOgImage": "/uploads/og-default.webp",
    "twitterHandle": "@handle",
    "facebookAppId": ""
  },
  "analytics": {
    "googleTagId": "",
    "googleSearchConsole": "",
    "facebookPixelId": ""
  },
  "robots": "User-agent: *\nAllow: /\nDisallow: /admin/",
  "schema": {
    "type": "Organization",
    "name": "Your Company",
    "url": "https://example.com",
    "logo": "/uploads/logo.png",
    "address": "",
    "phone": "",
    "email": ""
  }
}
```

### SEO Head Component (`src/components/SeoHead.astro`)

```astro
---
interface Props {
  title?: string;
  description?: string;
  ogImage?: string;
  robots?: string;
  canonical?: string;
  schemaType?: string;
}

import settings from '../data/global-settings.json';

const {
  title = settings.site.name,
  description = '',
  ogImage = settings.site.defaultOgImage,
  robots = 'index,follow',
  canonical,
  schemaType = 'WebPage',
} = Astro.props;

const fullTitle = title.includes(settings.site.name) ? title : `${title} | ${settings.site.name}`;
const fullOg = ogImage.startsWith('http') ? ogImage : `${settings.site.url}${ogImage}`;
const fullCanonical = canonical || `${settings.site.url}${Astro.url.pathname}`;

const schema = {
  '@context': 'https://schema.org',
  '@type': schemaType,
  name: fullTitle,
  description,
  url: fullCanonical,
};
---
<title>{fullTitle}</title>
<meta name="description" content={description} />
<meta name="robots" content={robots} />
<link rel="canonical" href={fullCanonical} />

<!-- Open Graph -->
<meta property="og:title"       content={fullTitle} />
<meta property="og:description" content={description} />
<meta property="og:image"       content={fullOg} />
<meta property="og:url"         content={fullCanonical} />
<meta property="og:type"        content="website" />

<!-- Twitter -->
<meta name="twitter:card"  content="summary_large_image" />
<meta name="twitter:title" content={fullTitle} />
<meta name="twitter:image" content={fullOg} />
{settings.site.twitterHandle && <meta name="twitter:site" content={settings.site.twitterHandle} />}

<!-- Schema.org -->
<script type="application/ld+json" set:html={JSON.stringify(schema)} />
```

### Sitemap (`src/pages/sitemap.xml.ts`)

```typescript
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import settings from '../data/global-settings.json';

export const GET: APIRoute = async () => {
  const pages = (await getCollection('pages')).filter(p => p.data.status === 'published');
  const posts = (await getCollection('blog')).filter(p => p.data.status === 'published');

  const urls = [
    ...pages.map(p => ({ loc: `${settings.site.url}/${p.data.slug}`, lastmod: p.data.lastUpdated || new Date().toISOString() })),
    ...posts.map(p => ({ loc: `${settings.site.url}/blog/${p.data.slug}`, lastmod: p.data.updatedAt || p.data.publishedAt || new Date().toISOString() })),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${u.loc}</loc><lastmod>${u.lastmod?.split('T')[0]}</lastmod></url>`).join('\n')}
</urlset>`;

  return new Response(xml, { headers: { 'Content-Type': 'application/xml' } });
};
```

---

## 10. Blog System

### Blog Post File (`src/content/blog/my-first-post.md`)

```markdown
---
title: "My First Post"
slug: "my-first-post"
excerpt: "A short summary shown in listings."
author: "atul-verma"         # matches author id in blog-meta.json
category: "marketing"       # matches category id in blog-meta.json
tags: ["seo", "growth"]
status: published
publishedAt: "2026-06-18T10:00:00Z"
updatedAt: "2026-06-18T10:00:00Z"
featuredImage: "/uploads/post-hero.webp"
seo:
  title: "My First Post | Blog"
  description: "SEO-optimised description for this post."
  focusKeyword: "target keyword"
---

Your post content goes here. This is the Markdown body — full HTML is also supported.
```

### Blog Meta (`src/data/blog-meta.json`)

```json
{
  "authors": [
    { "id": "atul-verma", "name": "Atul Verma", "bio": "Founder", "avatar": "/uploads/atul.webp" }
  ],
  "categories": [
    { "id": "marketing", "label": "Marketing", "slug": "marketing" }
  ],
  "tags": [
    { "id": "seo", "label": "SEO" }
  ],
  "settings": {
    "postsPerPage": 10,
    "allowComments": false,
    "showAuthorBox": true
  }
}
```

### Blog Archive Routes

| Route | File |
|-------|------|
| `/blog` | `src/pages/blog/index.astro` |
| `/blog/[slug]` | `src/pages/blog/[slug].astro` |
| `/blog/category/[slug]` | `src/pages/blog/category/[slug].astro` |
| `/blog/tag/[slug]` | `src/pages/blog/tag/[slug].astro` |
| `/blog/author/[slug]` | `src/pages/blog/author/[slug].astro` |

### Blog Post Page (`src/pages/blog/[slug].astro`)

```astro
---
import { getCollection } from 'astro:content';
import MainLayout from '../../layouts/MainLayout.astro';
import blogMeta from '../../data/blog-meta.json';

const { slug } = Astro.params;
const posts = await getCollection('blog');
const post = posts.find(p => p.data.slug === slug && p.data.status === 'published');

if (!post) return Astro.redirect('/404');

const { Content } = await post.render();
const author = blogMeta.authors.find(a => a.id === post.data.author);
---
<MainLayout seo={post.data.seo} title={post.data.title}>
  <article>
    {post.data.featuredImage && <img src={post.data.featuredImage} alt={post.data.title} />}
    <h1>{post.data.title}</h1>
    {author && <div class="author">By {author.name}</div>}
    <time>{post.data.publishedAt}</time>
    <div class="post-content"><Content /></div>
  </article>
</MainLayout>
```

---

## 11. Reusable Section Architecture

### Two usage patterns

**Pattern A — Section Reference** (reuse same content on multiple pages):
```yaml
# In page frontmatter
blocks:
  - type: hero-banner
    sectionId: hero-home    # loads content from src/content/sections/hero-home.md
```

**Pattern B — Embedded Block** (page-specific, not reused):
```yaml
blocks:
  - type: stats-grid
    heading: "Page-specific stats"
    stats:
      - { value: "42", label: "Clients" }
```

### BlockRenderer resolves the reference at render time

```astro
---
// src/components/BlockRenderer.astro
import { getEntry } from 'astro:content';
import type { CollectionEntry } from 'astro:content';

// Lazy-loaded block imports — add entry here when you create a new block
const blockComponents: Record<string, any> = {};
const modules = import.meta.glob('../blocks/*.astro', { eager: false });

interface Props {
  blocks: any[];
}

const { blocks } = Astro.props;
---
{blocks.map(async (block) => {
  // Resolve section reference if present
  let data = { ...block };
  if (block.sectionId) {
    const section = await getEntry('sections', block.sectionId);
    if (section) data = { ...section.data, type: block.type };
  }

  // Dynamically import the block component
  const modulePath = `../blocks/${toPascalCase(data.type)}Block.astro`;
  if (modules[modulePath]) {
    const { default: Block } = await modules[modulePath]();
    return <Block {...data} />;
  }
  return <div class="unknown-block">Unknown block type: {data.type}</div>;
})}
```

### Helper: toPascalCase

```typescript
// src/utils/strings.ts
export function toPascalCase(str: string): string {
  return str.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join('');
}
// "hero-banner" → "HeroBanner"  →  imports HeroBannerBlock.astro
```

---

## 12. Custom HTML/Astro Block Registration

### Step 1 — Create the Block Component

```astro
// src/blocks/CustomHtmlBlock.astro
---
interface Props {
  html?: string;
  wrapperClass?: string;
}
const { html = '', wrapperClass = '' } = Astro.props;
---
{html && (
  <div class={`custom-html-block ${wrapperClass}`} set:html={html} />
)}
```

### Step 2 — Register in Block Registry

```typescript
// src/block-registry/blocks.ts
export const BLOCK_REGISTRY: BlockDefinition[] = [
  // ... other blocks
  {
    type: 'custom-html',
    label: 'Custom HTML',
    category: 'developer',
    icon: '⌨️',
    fields: [
      { key: 'html',         label: 'HTML Content',  type: 'richtext', default: '' },
      { key: 'wrapperClass', label: 'Wrapper Class', type: 'text',     default: '' },
    ],
  },
];

export interface BlockDefinition {
  type: string;
  label: string;
  category: 'hero' | 'content' | 'marketing' | 'social' | 'developer' | 'other';
  icon: string;
  fields: FieldDefinition[];
}

export interface FieldDefinition {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'richtext' | 'number' | 'boolean' | 'select' | 'image' | 'list' | 'repeater' | 'color' | 'url' | 'date';
  default: any;
  required?: boolean;
  options?: string[];     // for select fields
  subFields?: FieldDefinition[];  // for repeater fields
  placeholder?: string;
  hint?: string;
}
```

### Step 3 — Add to Section Definitions

Either via the admin UI or directly in `section-definitions.json`:
```json
"custom-html": {
  "type": "custom-html",
  "label": "Custom HTML",
  "category": "developer",
  "icon": "⌨️",
  "fields": [
    { "key": "html",         "label": "HTML Content",  "type": "richtext", "default": "" },
    { "key": "wrapperClass", "label": "Wrapper Class", "type": "text",     "default": "" }
  ]
}
```

That's it — the block is now available in the Page Builder's "Add Block" panel.

---

## 13. Dynamic Form Field Generation

The admin editor generates the correct form controls automatically by reading field definitions.

### Field Renderer Function (`src/styles/admin/js/field-renderer.js`)

```javascript
function renderField(field, currentValue) {
  const { key, label, type, default: defaultVal, options, subFields, placeholder, hint } = field;
  const value = currentValue !== undefined ? currentValue : defaultVal;
  const id = `field-${key}`;

  const hint_html = hint ? `<small class="field-hint">${hint}</small>` : '';

  switch (type) {
    case 'text':
    case 'url':
      return `
        <div class="form-field">
          <label for="${id}">${label}</label>
          <input id="${id}" type="${type}" name="${key}" value="${escapeHtml(value || '')}" placeholder="${placeholder || ''}" />
          ${hint_html}
        </div>`;

    case 'textarea':
      return `
        <div class="form-field">
          <label for="${id}">${label}</label>
          <textarea id="${id}" name="${key}" rows="4" placeholder="${placeholder || ''}">${escapeHtml(value || '')}</textarea>
          ${hint_html}
        </div>`;

    case 'richtext':
      return `
        <div class="form-field">
          <label>${label}</label>
          <div id="${id}-quill" class="quill-editor" data-field="${key}">${value || ''}</div>
          <input type="hidden" name="${key}" id="${id}" value="${escapeHtml(value || '')}" />
          ${hint_html}
        </div>`;

    case 'number':
      return `
        <div class="form-field">
          <label for="${id}">${label}</label>
          <input id="${id}" type="number" name="${key}" value="${value || 0}" />
          ${hint_html}
        </div>`;

    case 'boolean':
      return `
        <div class="form-field form-field--inline">
          <input id="${id}" type="checkbox" name="${key}" ${value ? 'checked' : ''} />
          <label for="${id}">${label}</label>
          ${hint_html}
        </div>`;

    case 'select':
      const opts = (options || []).map(o => `<option value="${o}" ${o === value ? 'selected' : ''}>${o}</option>`).join('');
      return `
        <div class="form-field">
          <label for="${id}">${label}</label>
          <select id="${id}" name="${key}">${opts}</select>
          ${hint_html}
        </div>`;

    case 'image':
      return `
        <div class="form-field">
          <label>${label}</label>
          <div class="media-picker" data-field="${key}">
            <img class="picker-preview" src="${value || ''}" alt="" ${value ? '' : 'hidden'} />
            <input type="hidden" name="${key}" value="${value || ''}" />
            <button type="button" class="btn-secondary open-media-picker">${value ? 'Change Image' : 'Select Image'}</button>
            ${value ? '<button type="button" class="btn-danger clear-image">Remove</button>' : ''}
          </div>
          ${hint_html}
        </div>`;

    case 'list':
      const listItems = (value || []).map((item, i) => `
        <div class="list-item">
          <input type="text" name="${key}[]" value="${escapeHtml(item)}" />
          <button type="button" class="remove-list-item">✕</button>
        </div>`).join('');
      return `
        <div class="form-field">
          <label>${label}</label>
          <div class="list-field" data-field="${key}">
            ${listItems}
            <button type="button" class="add-list-item">+ Add Item</button>
          </div>
          ${hint_html}
        </div>`;

    case 'repeater':
      const rows = (value || []).map((row, i) => renderRepeaterRow(subFields, row, key, i)).join('');
      return `
        <div class="form-field">
          <label>${label}</label>
          <div class="repeater-field" data-field="${key}" data-sub-fields='${JSON.stringify(subFields)}'>
            <div class="repeater-rows">${rows}</div>
            <button type="button" class="add-repeater-row btn-secondary">+ Add Row</button>
          </div>
          ${hint_html}
        </div>`;

    case 'color':
      return `
        <div class="form-field">
          <label for="${id}">${label}</label>
          <input id="${id}" type="color" name="${key}" value="${value || '#000000'}" />
          ${hint_html}
        </div>`;

    case 'date':
      return `
        <div class="form-field">
          <label for="${id}">${label}</label>
          <input id="${id}" type="date" name="${key}" value="${value || ''}" />
          ${hint_html}
        </div>`;

    default:
      return `<div class="form-field"><label>${label}</label><input type="text" name="${key}" value="${value || ''}" /></div>`;
  }
}

function renderRepeaterRow(subFields, values = {}, parentKey, index) {
  const subFieldsHtml = subFields.map(sf => renderField(
    { ...sf, key: `${parentKey}[${index}][${sf.key}]` },
    values[sf.key]
  )).join('');
  return `
    <div class="repeater-row" data-index="${index}">
      ${subFieldsHtml}
      <button type="button" class="remove-repeater-row">✕ Remove Row</button>
    </div>`;
}

function escapeHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
```

### Collecting Form Values Back to JSON

```javascript
function collectBlockData(blockContainer) {
  const data = {};

  // Text, textarea, number, color, url, date, select
  blockContainer.querySelectorAll('input:not([type=checkbox]):not([type=hidden]), textarea, select').forEach(el => {
    if (!el.name || el.name.includes('[')) return; // skip array fields
    data[el.name] = el.value;
  });

  // Booleans
  blockContainer.querySelectorAll('input[type=checkbox]').forEach(el => {
    data[el.name] = el.checked;
  });

  // Hidden (image URLs from media picker, richtext from Quill)
  blockContainer.querySelectorAll('input[type=hidden]').forEach(el => {
    if (el.name) data[el.name] = el.value;
  });

  // List fields
  blockContainer.querySelectorAll('.list-field').forEach(listEl => {
    const field = listEl.dataset.field;
    data[field] = Array.from(listEl.querySelectorAll('input[type=text]')).map(i => i.value);
  });

  // Repeater fields
  blockContainer.querySelectorAll('.repeater-field').forEach(repEl => {
    const field = repEl.dataset.field;
    const subFields = JSON.parse(repEl.dataset.subFields);
    data[field] = Array.from(repEl.querySelectorAll('.repeater-row')).map(row => {
      const rowData = {};
      subFields.forEach(sf => {
        const input = row.querySelector(`[name*="${sf.key}"]`);
        if (input) rowData[sf.key] = input.type === 'checkbox' ? input.checked : input.value;
      });
      return rowData;
    });
  });

  return data;
}
```

---

## 14. Content Storage Structure

### Directory Map

```
src/content/
├── pages/
│   └── {slug}.md            # "index.md" = home page (slug: "")
│
├── sections/
│   └── {section-id}.md      # e.g., "hero-home.md", "cta-contact.md"
│
├── blog/
│   └── {post-slug}.md
│
├── contacts/
│   └── {timestamp}-{name}.md   # auto-named on form submit
│
└── revisions/
    └── {page-slug}/
        └── {ISO-timestamp}.md   # auto-saved on every page save

src/data/
├── global-settings.json
├── menus.json
├── blog-meta.json               # authors, categories, tags
├── admin-users.json             # { id, username, passwordHash, role }
└── section-definitions.json     # block type schemas

public/uploads/
├── media-meta.json              # index of all uploaded files
├── {timestamp}-{filename}.webp  # original upload
├── {timestamp}-{filename}-thumb.webp
├── {timestamp}-{filename}-small.webp
├── {timestamp}-{filename}-medium.webp
└── {timestamp}-{filename}-large.webp
```

### Page Frontmatter Schema (Full)

```yaml
title: string           # Page title (required)
slug: string            # URL slug — empty string = homepage
status: draft|published
blocks: []              # Array of block objects
seo:
  title: string
  description: string
  ogImage: string
  robots: string
  canonical: string
  schemaType: string
customCss: string       # <style> injected in <head>
customJs: string        # <script> injected before </body>
lastUpdated: ISO string
```

### Section Frontmatter Schema (Varies by type)

Minimum required keys:
```yaml
type: string    # must match a registered block type
label: string   # human-readable name for the section library
```

All other keys are block-type-specific fields as defined in `section-definitions.json`.

---

## 15. Frontend Rendering Flow

### Request lifecycle for a public page

```
Browser → GET /about-us
         ↓
src/pages/[...slug].astro
  getCollection('pages') → find page where slug === 'about-us'
  if status !== 'published' → 404
         ↓
  pass page.data.blocks to <BlockRenderer blocks={blocks} />
         ↓
  BlockRenderer loops blocks:
    if block.sectionId → getEntry('sections', block.sectionId) → merge data
    import('../blocks/{TypePascalCase}Block.astro')
    render <Block {...data} />
         ↓
  wrap in <MainLayout seo={...}>
         ↓
HTML response
```

### `src/pages/[...slug].astro`

```astro
---
import { getCollection } from 'astro:content';
import MainLayout from '../layouts/MainLayout.astro';
import BlockRenderer from '../components/BlockRenderer.astro';

const { slug } = Astro.params;
const urlSlug = slug || '';   // empty = home

const pages = await getCollection('pages');
const page = pages.find(p => p.data.slug === urlSlug);

if (!page || page.data.status !== 'published') {
  return Astro.redirect('/404');
}

const { title, blocks = [], seo, customCss, customJs } = page.data;
---
<MainLayout title={seo?.title || title} seo={seo} customCss={customCss} customJs={customJs}>
  <BlockRenderer blocks={blocks} />
</MainLayout>
```

### `src/layouts/MainLayout.astro`

```astro
---
import SeoHead from '../components/SeoHead.astro';
import Header from '../components/Header.astro';
import Footer from '../components/Footer.astro';
import settings from '../data/global-settings.json';

interface Props {
  title?: string;
  seo?: any;
  customCss?: string;
  customJs?: string;
}
const { title, seo, customCss, customJs } = Astro.props;
---
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <SeoHead title={seo?.title || title} {...(seo || {})} />
  {customCss && <style set:html={customCss} />}
  {settings.analytics?.googleTagId && (
    <script async src={`https://www.googletagmanager.com/gtag/js?id=${settings.analytics.googleTagId}`}></script>
  )}
</head>
<body>
  <Header />
  <main>
    <slot />
  </main>
  <Footer />
  {customJs && <script set:html={customJs} />}
</body>
</html>
```

---

## 16. CSS/JS Organization

### Folder Convention

```
src/styles/
├── admin/
│   ├── css/
│   │   ├── dashboard.css
│   │   ├── editor.css        ← page builder + section editor
│   │   ├── media.css
│   │   ├── forms.css         ← dynamic form fields
│   │   └── base.css          ← admin reset + variables
│   └── js/
│       ├── field-renderer.js
│       ├── block-editor.js
│       ├── media-picker.js
│       ├── sortable.js
│       └── toast.js
├── pages/
│   └── {page-slug}.css       ← per-page override styles
└── sections/
    └── {BlockType}.css       ← per-block-type styles

public/
├── css/
│   └── global.css            ← site-wide public CSS
└── js/
    └── global.js             ← site-wide public JS
```

### Block-level CSS Loading

Each block component imports its own CSS:
```astro
// src/blocks/HeroBannerBlock.astro
---
import '../styles/sections/HeroBanner.css';
const { heading, subheading } = Astro.props;
---
<section class="hero-banner">
  <h1>{heading}</h1>
  <p>{subheading}</p>
</section>
```

Astro deduplicates CSS imports — if the same block appears twice on a page, the CSS is still only emitted once.

### Per-page Custom CSS/JS

Stored in page frontmatter as raw strings:
```yaml
customCss: |
  .hero-banner { background: linear-gradient(to right, #0f0, #0ff); }
customJs: |
  document.querySelector('.cta-button').addEventListener('click', () => alert('Hi!'));
```

These are injected verbatim via `set:html` in `MainLayout.astro`.

---

## 17. Developer Workflow for Adding New Sections

### Checklist: 5 steps to a new block type

```
Step 1: Define the schema
Step 2: Create the component
Step 3: Register in block registry
Step 4: Export from BlockRenderer
Step 5: (Optional) Style it
```

### Step 1 — Define schema (choose one)

**Option A — Admin UI**: Go to `/admin/section-definitions` → "New Definition" → fill the schema builder form.

**Option B — Direct JSON edit**: Add to `src/data/section-definitions.json`:
```json
"testimonials": {
  "type": "testimonials",
  "label": "Testimonials Grid",
  "category": "social",
  "icon": "⭐",
  "fields": [
    { "key": "heading", "label": "Heading", "type": "text", "default": "What our clients say" },
    {
      "key": "items",
      "label": "Testimonials",
      "type": "repeater",
      "default": [],
      "subFields": [
        { "key": "name",    "label": "Client Name",  "type": "text"  },
        { "key": "role",    "label": "Role/Company", "type": "text"  },
        { "key": "quote",   "label": "Quote",        "type": "textarea" },
        { "key": "avatar",  "label": "Avatar",       "type": "image" },
        { "key": "rating",  "label": "Rating (1-5)", "type": "number" }
      ]
    }
  ]
}
```

### Step 2 — Create the component

```astro
// src/blocks/TestimonialsBlock.astro
---
interface Props {
  heading?: string;
  items?: Array<{ name: string; role: string; quote: string; avatar: string; rating: number }>;
}
const { heading = '', items = [] } = Astro.props;
---
<section class="testimonials-section">
  {heading && <h2 class="section-heading">{heading}</h2>}
  <div class="testimonials-grid">
    {items.map(item => (
      <div class="testimonial-card">
        {item.avatar && <img src={item.avatar} alt={item.name} class="avatar" />}
        <blockquote>{item.quote}</blockquote>
        <cite>{item.name}{item.role && `, ${item.role}`}</cite>
        {item.rating && (
          <div class="stars" aria-label={`${item.rating} out of 5 stars`}>
            {'★'.repeat(item.rating)}{'☆'.repeat(5 - item.rating)}
          </div>
        )}
      </div>
    ))}
  </div>
</section>
```

### Step 3 — Register in `src/block-registry/blocks.ts`

```typescript
// Append to BLOCK_REGISTRY array:
{
  type: 'testimonials',
  label: 'Testimonials Grid',
  category: 'social',
  icon: '⭐',
  fields: [
    { key: 'heading', label: 'Heading', type: 'text', default: 'What our clients say' },
    {
      key: 'items',
      label: 'Testimonials',
      type: 'repeater',
      default: [],
      subFields: [
        { key: 'name',   label: 'Client Name',  type: 'text' },
        { key: 'role',   label: 'Role/Company', type: 'text' },
        { key: 'quote',  label: 'Quote',        type: 'textarea' },
        { key: 'avatar', label: 'Avatar',       type: 'image', default: '' },
        { key: 'rating', label: 'Rating (1-5)', type: 'number', default: 5 },
      ],
    },
  ],
},
```

### Step 4 — Verify BlockRenderer glob picks it up

`BlockRenderer.astro` uses:
```astro
const modules = import.meta.glob('../blocks/*.astro', { eager: false });
```

As long as you named it `TestimonialsBlock.astro` and the type slug is `testimonials`, `toPascalCase('testimonials') + 'Block'` = `'TestimonialsBlock'` — it will be found automatically. No manual registration needed.

### Step 5 — Style it

Create `src/styles/sections/Testimonials.css` and import it at the top of `TestimonialsBlock.astro`.

### Done. The block now appears in:
- The Page Builder "Add Block" panel
- The Section Library "New Section" type selector
- The Section Definitions admin list

---

## 18. Migration Strategy for Future Templates

### What "template" means here

A **template** is a named package of:
- A set of section definitions (block schemas)
- A set of block components
- A set of section instances
- A set of page compositions

### Versioned Template Approach

```
src/
└── templates/
    └── v2-corporate/
        ├── definitions/         # section-definitions for this template
        │   └── index.json
        ├── blocks/              # .astro components (symlink or copy)
        └── sections/            # default section instances
```

### Export/Import Commands

**Export current template**:
```typescript
// src/pages/api/export-template.ts
import type { APIRoute } from 'astro';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

export const GET: APIRoute = async () => {
  const defs = JSON.parse(readFileSync(join(process.cwd(), 'src/data/section-definitions.json'), 'utf-8'));
  const sectionsDir = join(process.cwd(), 'src/content/sections');
  const sections: any = {};
  readdirSync(sectionsDir).filter(f => f.endsWith('.md')).forEach(f => {
    sections[f] = readFileSync(join(sectionsDir, f), 'utf-8');
  });

  const bundle = { definitions: defs, sections, exportedAt: new Date().toISOString() };
  return new Response(JSON.stringify(bundle, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="template-export.json"',
    },
  });
};
```

**Import template** (only imports definitions + section instances, never overwrites existing pages):
```typescript
// src/pages/api/import-template.ts
export const POST: APIRoute = async ({ request }) => {
  const { definitions, sections } = await request.json();
  const defsPath = join(process.cwd(), 'src/data/section-definitions.json');
  const sectionsDir = join(process.cwd(), 'src/content/sections');

  const existingDefs = JSON.parse(readFileSync(defsPath, 'utf-8'));
  writeFileSync(defsPath, JSON.stringify({ ...existingDefs, ...definitions }, null, 2));

  for (const [filename, content] of Object.entries(sections)) {
    const filePath = join(sectionsDir, filename as string);
    if (!existsSync(filePath)) {  // never overwrite existing sections
      writeFileSync(filePath, content as string);
    }
  }

  return new Response(JSON.stringify({ success: true }));
};
```

### Git-based Template Versioning

Since everything is files, templates are just git branches:

```bash
git checkout -b template/v2-corporate
# Make structural changes
git commit -m "chore: v2 corporate template base"

# To apply a template to a new project:
git cherry-pick <commit-hash>
```

### Schema Migration

When a block's field schema changes (add/rename/remove a field):

1. Update `section-definitions.json` — add new field with a safe default
2. Update the block component — handle both old and new shape gracefully:
```astro
---
// Backwards-compatible: ctaText was renamed to ctaLabel
const { ctaLabel, ctaText } = Astro.props;
const buttonText = ctaLabel || ctaText || 'Learn More';
---
```
3. Run a migration script to update existing section instances:
```typescript
// scripts/migrate-field-rename.ts
import matter from 'gray-matter';
import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const SECTIONS_DIR = join(process.cwd(), 'src/content/sections');
readdirSync(SECTIONS_DIR).filter(f => f.endsWith('.md')).forEach(f => {
  const path = join(SECTIONS_DIR, f);
  const { data, content } = matter(readFileSync(path, 'utf-8'));
  if (data.ctaText !== undefined && data.ctaLabel === undefined) {
    data.ctaLabel = data.ctaText;
    delete data.ctaText;
    writeFileSync(path, matter.stringify(content, data));
    console.log(`Migrated: ${f}`);
  }
});
```

---

## 19. Best Practices for Scalability and Maintainability

### Content

| Practice | Detail |
|----------|--------|
| **Slug stability** | Never change a published page slug — create a redirect instead |
| **Draft by default** | New pages/posts start as `draft`, only published when ready |
| **Section library over inline blocks** | Prefer `sectionId` references; inline blocks can't be reused |
| **Revisions always on** | `pages-crud.ts` saves a revision on every PUT — never skip this |
| **Media naming** | Uploads get timestamped filenames — never collisions, easy purge |

### Code

| Practice | Detail |
|----------|--------|
| **One block = one file** | `HeroBannerBlock.astro` never imports another block — composability via page layout |
| **Blocks are pure** | Blocks receive all their data as props — no API calls inside block components |
| **Block registry is the source of truth** | All admin UI reads from `block-registry/blocks.ts` — `section-definitions.json` is the editable runtime copy |
| **API layer validates** | Every `api/*.ts` endpoint validates required fields before writing files |
| **toPascalCase is the convention** | Block type `my-custom-block` → file `MyCustomBlockBlock.astro` — never deviate |

### Security

| Practice | Detail |
|----------|--------|
| **Middleware guards all /admin/** | Every admin request goes through `middleware.ts` session check |
| **Never trust client slugs** | Sanitize any filename derived from user input: strip `..`, `/`, null bytes |
| **`set:html` only for admin-authored content** | Don't use it with user-submitted form data |
| **File type allowlist on upload** | Only `.jpg`, `.png`, `.webp`, `.gif`, `.svg`, `.pdf` — never `.php`, `.js` |
| **Environment variable for session secret** | Move `authenticated-admin-session-2026` to `process.env.CMS_SESSION_TOKEN` |

### Performance

| Practice | Detail |
|----------|--------|
| **Sharp generates variants on upload** | Never resize at request time — always serve pre-sized variants |
| **Use `srcset` in image blocks** | Block components should emit `<img srcset="...thumb 150w, ...small 480w">` |
| **Astro SSR caches `getCollection`** | Collections are compiled at build time in static mode, re-read each request in SSR — keep content files lean |
| **Media meta is append-only** | `media-meta.json` grows as uploads increase — paginate the media library, never load all at once |
| **Section definitions loaded once per admin session** | Cache in `localStorage` on admin pages, invalidate only on POST to definitions API |

### Admin UX

| Practice | Detail |
|----------|--------|
| **Autosave drafts** | Page editor should debounce-save every 30s to a `draft-{slug}` key in `localStorage` |
| **Optimistic UI** | Show success immediately on save; revert on API error |
| **Block preview in drawer** | Section editor should show a live preview panel using the block component's static HTML |
| **Keyboard shortcuts** | `Ctrl+S` to save, `Esc` to cancel modals — standard editor feel |

### Adding New Content Types (beyond pages/blog)

To add e.g. a **Case Studies** collection:

1. Add to `src/content.config.ts`:
```typescript
const caseStudies = defineCollection({
  type: 'content',
  schema: z.object({ title: z.string(), slug: z.string(), /* ... */ }),
});
export const collections = { pages, sections, blog, contacts, caseStudies };
```
2. Create `src/content/case-studies/` directory
3. Add CRUD API at `src/pages/api/case-studies-crud.ts` (clone `blog-crud.ts` pattern)
4. Add admin pages at `src/pages/admin/case-studies/`
5. Add public route at `src/pages/case-studies/[slug].astro`

The pattern is always identical — the CMS is just file I/O wrapped in Astro endpoints.

---

## Quick Reference

### File naming conventions

| Content | Location | Naming |
|---------|----------|--------|
| Homepage | `src/content/pages/index.md` | `index.md` |
| Other pages | `src/content/pages/{slug}.md` | matches URL slug |
| Blog posts | `src/content/blog/{slug}.md` | matches URL slug |
| Section instances | `src/content/sections/{id}.md` | descriptive kebab-case |
| Block components | `src/blocks/{PascalCase}Block.astro` | `{toPascalCase(type)}Block.astro` |
| Block styles | `src/styles/sections/{PascalCase}.css` | matches block component name |

### Admin URL map

| Path | Purpose |
|------|---------|
| `/admin` | Dashboard |
| `/admin/pages` | All pages list |
| `/admin/editor?slug=about-us` | Page builder editor |
| `/admin/sections` | Section library |
| `/admin/sections/editor?id=hero-home` | Section instance editor |
| `/admin/section-definitions` | Block schema manager |
| `/admin/blog` | Blog post list |
| `/admin/media` | Media library |
| `/admin/menus` | Navigation menus |
| `/admin/seo` | Global SEO settings |
| `/admin/settings` | Global site settings |

### API endpoint map

| Method | Endpoint | Action |
|--------|----------|--------|
| GET/POST/PUT/DELETE | `/api/pages-crud` | Page CRUD |
| GET/POST/PUT/DELETE | `/api/sections-crud` | Section CRUD |
| GET/POST/PUT/DELETE | `/api/blog-crud` | Blog post CRUD |
| GET/POST/DELETE | `/api/section-definitions-crud` | Block type schema CRUD |
| GET/POST/DELETE | `/api/media-crud` | Media upload/delete/list |
| GET/PUT | `/api/menus-crud` | Navigation menu CRUD |
| GET/PUT | `/api/settings-update` | Global settings |
| GET/POST/DELETE | `/api/admin-users` | Admin user management |
| POST | `/api/login` | Authentication |
| POST | `/api/logout` | Session destroy |
| POST | `/api/contact-submit` | Public contact form |

---

*This guide covers a complete, developer-first CMS with no predefined templates, demo content, or preconfigured blocks. Every section, page, and schema is created manually to match your exact project requirements.*
