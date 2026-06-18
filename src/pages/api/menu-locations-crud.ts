import type { APIRoute } from 'astro';
import { getMenuLocations, saveMenuLocations } from '../../utils/menus';

export const prerender = false;

/** GET /api/menu-locations-crud → return all locations */
export const GET: APIRoute = async () => {
  return json(getMenuLocations());
};

/** PUT /api/menu-locations-crud  { locationKey, menuId }  → assign menu to location */
export const PUT: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => null);
  if (!body?.locationKey) return json({ error: 'locationKey is required' }, 400);

  const locations = getMenuLocations();
  if (!locations[body.locationKey]) return json({ error: 'Unknown location key' }, 404);

  locations[body.locationKey].menuId = body.menuId || null;
  saveMenuLocations(locations);
  return json({ success: true, locations });
};

/** POST /api/menu-locations-crud  { locationKey, menuId }  → bulk assign (full object) */
export const POST: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') return json({ error: 'Invalid body' }, 400);

  const locations = getMenuLocations();

  // body is { locationKey: menuId, ... }
  for (const [key, menuId] of Object.entries(body)) {
    if (locations[key]) {
      locations[key].menuId = (menuId as string) || null;
    }
  }
  saveMenuLocations(locations);
  return json({ success: true, locations });
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
