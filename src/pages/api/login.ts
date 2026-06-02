import type { APIRoute } from "astro";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export const prerender = false;

const USERS_FILE = path.resolve("src/data/admin-users.json");
const SESSION_TOKEN = "authenticated-admin-session-2026";

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

function loadUsers(): any[] {
  try {
    if (!fs.existsSync(USERS_FILE)) {
      const defaultUsers = [
        {
          username: "admin@tangence.com",
          passwordHash: hashPassword("tangence@2026"),
          role: "superadmin"
        }
      ];
      fs.mkdirSync(path.dirname(USERS_FILE), { recursive: true });
      fs.writeFileSync(USERS_FILE, JSON.stringify(defaultUsers, null, 2), "utf-8");
      return defaultUsers;
    }
    return JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"));
  } catch (e) {
    console.error("Failed to load users in login:", e);
    return [];
  }
}

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return new Response(JSON.stringify({ success: false, error: "Username and password are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const targetUser = username.trim().toLowerCase();
    const users = loadUsers();
    const user = users.find(u => u.username === targetUser);

    if (user && user.passwordHash === hashPassword(password)) {
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
