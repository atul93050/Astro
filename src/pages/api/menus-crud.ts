import type { APIRoute } from 'astro';
import {
  getAllMenus, getMenu, saveMenu, deleteMenu,
  toMenuSlug, type Menu, type MenuSettings,
} from '../../utils/menus';

export const prerender = false;

const DEFAULT_SETTINGS: MenuSettings = {
  alignment: 'left',
  dropdownWidth: '240px',
  dropdownAnimation: 'fade',
  hoverDelay: 150,
  mobileBreakpoint: 768,
  stickyHeader: false,
};

/** GET /api/menus-crud          → list all menus
 *  GET /api/menus-crud?id=slug  → single menu  */
export const GET: APIRoute = async ({ url }) => {
  const id = url.searchParams.get('id');
  if (id) {
    const menu = getMenu(id);
    if (!menu) return json({ error: 'Not found' }, 404);
    return json(menu);
  }
  return json(getAllMenus());
};

/** POST /api/menus-crud  { name, description? }  → create */
export const POST: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => null);
  if (!body?.name) return json({ error: 'name is required' }, 400);

  const slug = toMenuSlug(body.name);
  if (getMenu(slug)) return json({ error: 'A menu with that name already exists' }, 409);

  const now = new Date().toISOString();
  const menu: Menu = {
    id: slug,
    name: body.name,
    slug,
    description: body.description || '',
    settings: { ...DEFAULT_SETTINGS, ...body.settings },
    items: body.items || [],
    createdAt: now,
    updatedAt: now,
  };
  saveMenu(menu);
  return json({ success: true, menu });
};

/** PUT /api/menus-crud  { id, ...fields }  → update */
export const PUT: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => null);
  if (!body?.id) return json({ error: 'id is required' }, 400);

  const existing = getMenu(body.id);
  if (!existing) return json({ error: 'Not found' }, 404);

  const updated: Menu = {
    ...existing,
    name: body.name ?? existing.name,
    description: body.description ?? existing.description,
    settings: { ...existing.settings, ...(body.settings || {}) },
    items: body.items ?? existing.items,
    updatedAt: new Date().toISOString(),
  };
  saveMenu(updated);
  return json({ success: true, menu: updated });
};

/** DELETE /api/menus-crud  { id }  → delete */
export const DELETE: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => null);
  if (!body?.id) return json({ error: 'id is required' }, 400);
  deleteMenu(body.id);
  return json({ success: true });
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
