import { defineMiddleware } from "astro:middleware";

const SESSION_TOKEN = "authenticated-admin-session-2026";

// Routes under /admin that must remain public (the login screen itself).
const PUBLIC_ADMIN_PATHS = ["/admin/login"];

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  // Only guard the admin UI. API routes enforce their own auth, and the login
  // page must stay reachable so users can authenticate.
  const isAdminPage = pathname === "/admin" || pathname.startsWith("/admin/");
  const isPublic = PUBLIC_ADMIN_PATHS.some(p => pathname === p || pathname.startsWith(p + "/"));

  if (isAdminPage && !isPublic) {
    const session = context.cookies.get("cms_session")?.value;
    if (session !== SESSION_TOKEN) {
      return context.redirect("/admin/login");
    }
  }

  return next();
});
