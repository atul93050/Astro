import type { APIRoute } from 'astro';
import {
  getAllMegaMenus, getMegaMenu, saveMegaMenu, deleteMegaMenu,
  toMenuSlug, type MegaMenu,
} from '../../utils/menus';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const id = url.searchParams.get('id');
  if (id) {
    const m = getMegaMenu(id);
    if (!m) return json({ error: 'Not found' }, 404);
    return json(m);
  }
  return json(getAllMegaMenus());
};

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => null);
  if (!body?.name) return json({ error: 'name is required' }, 400);

  const slug = toMenuSlug(body.name);
  if (getMegaMenu(slug)) return json({ error: 'Already exists' }, 409);

  const now = new Date().toISOString();
  const mega: MegaMenu = {
    id: slug,
    name: body.name,
    slug,
    width: body.width || '1200px',
    columns: body.columns || [],
    createdAt: now,
    updatedAt: now,
  };
  saveMegaMenu(mega);
  return json({ success: true, mega });
};

export const PUT: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => null);
  if (!body?.id) return json({ error: 'id is required' }, 400);

  const existing = getMegaMenu(body.id);
  if (!existing) return json({ error: 'Not found' }, 404);

  const updated: MegaMenu = {
    ...existing,
    name: body.name ?? existing.name,
    width: body.width ?? existing.width,
    columns: body.columns ?? existing.columns,
    updatedAt: new Date().toISOString(),
  };
  saveMegaMenu(updated);
  return json({ success: true, mega: updated });
};

export const DELETE: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => null);
  if (!body?.id) return json({ error: 'id is required' }, 400);
  deleteMegaMenu(body.id);
  return json({ success: true });
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
