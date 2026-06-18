import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync, unlinkSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
const MENUS_DIR = join(ROOT, 'src/data/menus');
const MEGA_DIR = join(ROOT, 'src/data/mega-menus');
const LOCATIONS_PATH = join(ROOT, 'src/data/menu-locations.json');

function ensureDir(dir: string) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

// ─── Menu Types ─────────────────────────────────────────────────────────────

export interface MenuItemVisibility {
  device: 'all' | 'desktop' | 'mobile' | 'tablet';
  auth: 'all' | 'loggedIn' | 'loggedOut';
}

export interface MenuItemIcon {
  type: 'fa' | 'svg' | 'upload';
  value: string;
}

export interface MenuItemBadge {
  text: string;
  style: 'new' | 'hot' | 'featured' | 'custom';
  color?: string;
}

export interface MenuItemImage {
  thumbnail?: string;
  banner?: string;
  category?: string;
}

export interface MenuItem {
  id: string;
  label: string;
  type: 'page' | 'section' | 'blog-post' | 'blog-category' | 'custom-url' | 'external-url' | 'anchor' | 'phone' | 'email' | 'button' | 'mega-menu';
  url: string;
  target: '_self' | '_blank';
  icon: MenuItemIcon | null;
  image: MenuItemImage | null;
  badge: MenuItemBadge | null;
  description: string;
  cssClass: string;
  customId: string;
  visibility: MenuItemVisibility;
  megaMenuId: string | null;
  children: MenuItem[];
}

export interface MenuSettings {
  alignment: 'left' | 'center' | 'right';
  dropdownWidth: string;
  dropdownAnimation: 'none' | 'fade' | 'slide' | 'scale';
  hoverDelay: number;
  mobileBreakpoint: number;
  stickyHeader: boolean;
}

export interface Menu {
  id: string;
  name: string;
  slug: string;
  description: string;
  settings: MenuSettings;
  items: MenuItem[];
  createdAt: string;
  updatedAt: string;
}

export interface MenuLocation {
  label: string;
  description: string;
  menuId: string | null;
}

export interface MegaMenuColumn {
  id: string;
  width: string;
  type: 'links' | 'html' | 'section' | 'cta';
  heading?: string;
  items?: Array<{ label: string; url: string; icon?: string; description?: string }>;
  html?: string;
  sectionId?: string;
  cta?: { image?: string; heading?: string; text?: string; buttonLabel?: string; buttonUrl?: string; buttonStyle?: string };
}

export interface MegaMenu {
  id: string;
  name: string;
  slug: string;
  width: string;
  columns: MegaMenuColumn[];
  createdAt: string;
  updatedAt: string;
}

// ─── Menu Helpers ────────────────────────────────────────────────────────────

export function getAllMenus(): Menu[] {
  ensureDir(MENUS_DIR);
  return readdirSync(MENUS_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => {
      try { return JSON.parse(readFileSync(join(MENUS_DIR, f), 'utf-8')) as Menu; }
      catch { return null; }
    })
    .filter(Boolean) as Menu[];
}

export function getMenu(slug: string): Menu | null {
  const p = join(MENUS_DIR, `${slug}.json`);
  if (!existsSync(p)) return null;
  try { return JSON.parse(readFileSync(p, 'utf-8')) as Menu; }
  catch { return null; }
}

export function saveMenu(menu: Menu): void {
  ensureDir(MENUS_DIR);
  menu.updatedAt = new Date().toISOString();
  writeFileSync(join(MENUS_DIR, `${menu.slug}.json`), JSON.stringify(menu, null, 2));
}

export function deleteMenu(slug: string): void {
  const p = join(MENUS_DIR, `${slug}.json`);
  if (existsSync(p)) unlinkSync(p);
}

// ─── Menu Location Helpers ────────────────────────────────────────────────────

export function getMenuLocations(): Record<string, MenuLocation> {
  if (!existsSync(LOCATIONS_PATH)) return {};
  try { return JSON.parse(readFileSync(LOCATIONS_PATH, 'utf-8')); }
  catch { return {}; }
}

export function saveMenuLocations(data: Record<string, MenuLocation>): void {
  writeFileSync(LOCATIONS_PATH, JSON.stringify(data, null, 2));
}

/** Returns the Menu assigned to a location key, or null if unassigned. */
export function getMenuAtLocation(locationKey: string): Menu | null {
  const locations = getMenuLocations();
  const loc = locations[locationKey];
  if (!loc?.menuId) return null;
  return getMenu(loc.menuId);
}

// ─── Mega Menu Helpers ────────────────────────────────────────────────────────

export function getAllMegaMenus(): MegaMenu[] {
  ensureDir(MEGA_DIR);
  return readdirSync(MEGA_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => {
      try { return JSON.parse(readFileSync(join(MEGA_DIR, f), 'utf-8')) as MegaMenu; }
      catch { return null; }
    })
    .filter(Boolean) as MegaMenu[];
}

export function getMegaMenu(slug: string): MegaMenu | null {
  const p = join(MEGA_DIR, `${slug}.json`);
  if (!existsSync(p)) return null;
  try { return JSON.parse(readFileSync(p, 'utf-8')) as MegaMenu; }
  catch { return null; }
}

export function saveMegaMenu(mega: MegaMenu): void {
  ensureDir(MEGA_DIR);
  mega.updatedAt = new Date().toISOString();
  writeFileSync(join(MEGA_DIR, `${mega.slug}.json`), JSON.stringify(mega, null, 2));
}

export function deleteMegaMenu(slug: string): void {
  const p = join(MEGA_DIR, `${slug}.json`);
  if (existsSync(p)) unlinkSync(p);
}

// ─── Slug Generator ──────────────────────────────────────────────────────────

export function toMenuSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// ─── Resolve item URL from type ──────────────────────────────────────────────

export function resolveItemUrl(item: Pick<MenuItem, 'type' | 'url'>): string {
  if (item.type === 'phone') return item.url.startsWith('tel:') ? item.url : `tel:${item.url}`;
  if (item.type === 'email') return item.url.startsWith('mailto:') ? item.url : `mailto:${item.url}`;
  if (item.type === 'anchor') return item.url.startsWith('#') ? item.url : `#${item.url}`;
  return item.url || '#';
}
