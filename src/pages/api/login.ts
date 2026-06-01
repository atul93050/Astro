import type { APIRoute } from "astro";

export const prerender = false;

const ADMIN_USER = "admin@tangence.com";
const ADMIN_PASS = "tangence@2026";
const SESSION_TOKEN = "authenticated-admin-session-2026";

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return new Response(JSON.stringify({ success: false, error: "Username and password are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (username.trim() === ADMIN_USER && password === ADMIN_PASS) {
      // Set secure HTTP-only cookie valid for 7 days
      cookies.set("cms_session", SESSION_TOKEN, {
        path: "/",
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAge: 60 * 60 * 24 * 7 // 7 days
      });

      return new Response(JSON.stringify({ success: true, message: "Logged in successfully!" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ success: false, error: "Invalid username or password" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
