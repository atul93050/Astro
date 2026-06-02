import type { APIRoute } from "astro";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export const prerender = false;

const USERS_FILE = path.resolve("src/data/admin-users.json");

// Helper to hash passwords securely using built-in crypto
function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

// Read database
function readUsers(): any[] {
  try {
    if (!fs.existsSync(USERS_FILE)) {
      // Initialize with default admin
      const defaultUsers = [
        {
          username: "admin@tangence.com",
          passwordHash: hashPassword("tangence@2026"),
          role: "superadmin"
        }
      ];
      // Ensure directory exists
      fs.mkdirSync(path.dirname(USERS_FILE), { recursive: true });
      fs.writeFileSync(USERS_FILE, JSON.stringify(defaultUsers, null, 2), "utf-8");
      return defaultUsers;
    }
    return JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"));
  } catch (e) {
    console.error("Failed to read admin users:", e);
    return [];
  }
}

// Write database
function writeUsers(users: any[]): void {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
}

// Check session
function isAuthenticated(cookies: any): boolean {
  return cookies.get("cms_session")?.value === "authenticated-admin-session-2026";
}

// GET: List admin usernames/emails (Never return password hashes!)
export const GET: APIRoute = async ({ cookies }) => {
  if (!isAuthenticated(cookies)) {
    return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
      status: 401, headers: { "Content-Type": "application/json" }
    });
  }

  const users = readUsers();
  const safeUsers = users.map(u => ({ username: u.username, role: u.role || "admin" }));

  return new Response(JSON.stringify({ success: true, users: safeUsers }), {
    status: 200, headers: { "Content-Type": "application/json" }
  });
};

// POST: Add new admin
export const POST: APIRoute = async ({ request, cookies }) => {
  if (!isAuthenticated(cookies)) {
    return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
      status: 401, headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return new Response(JSON.stringify({ success: false, error: "Email and password are required" }), {
        status: 400, headers: { "Content-Type": "application/json" }
      });
    }

    const trimmedUsername = username.trim().toLowerCase();
    
    // Simple email validation
    if (!trimmedUsername.includes("@") || trimmedUsername.length < 5) {
      return new Response(JSON.stringify({ success: false, error: "Please enter a valid email address" }), {
        status: 400, headers: { "Content-Type": "application/json" }
      });
    }

    if (password.length < 6) {
      return new Response(JSON.stringify({ success: false, error: "Password must be at least 6 characters long" }), {
        status: 400, headers: { "Content-Type": "application/json" }
      });
    }

    const users = readUsers();
    
    // Duplicate check
    if (users.some(u => u.username === trimmedUsername)) {
      return new Response(JSON.stringify({ success: false, error: "An administrator with this email already exists" }), {
        status: 409, headers: { "Content-Type": "application/json" }
      });
    }

    const newUser = {
      username: trimmedUsername,
      passwordHash: hashPassword(password),
      role: "admin"
    };

    users.push(newUser);
    writeUsers(users);

    return new Response(JSON.stringify({ success: true, message: "Administrator added successfully!" }), {
      status: 201, headers: { "Content-Type": "application/json" }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500, headers: { "Content-Type": "application/json" }
    });
  }
};

// PUT: Change Password
export const PUT: APIRoute = async ({ request, cookies }) => {
  if (!isAuthenticated(cookies)) {
    return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
      status: 401, headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const { username, currentPassword, newPassword } = await request.json();

    if (!username || !currentPassword || !newPassword) {
      return new Response(JSON.stringify({ success: false, error: "Username, current password, and new password are required" }), {
        status: 400, headers: { "Content-Type": "application/json" }
      });
    }

    const targetUsername = username.trim().toLowerCase();
    const users = readUsers();
    const idx = users.findIndex(u => u.username === targetUsername);

    if (idx === -1) {
      return new Response(JSON.stringify({ success: false, error: "Administrator account not found" }), {
        status: 404, headers: { "Content-Type": "application/json" }
      });
    }

    // Verify current password
    if (users[idx].passwordHash !== hashPassword(currentPassword)) {
      return new Response(JSON.stringify({ success: false, error: "Incorrect current password" }), {
        status: 403, headers: { "Content-Type": "application/json" }
      });
    }

    if (newPassword.length < 6) {
      return new Response(JSON.stringify({ success: false, error: "New password must be at least 6 characters long" }), {
        status: 400, headers: { "Content-Type": "application/json" }
      });
    }

    // Update password
    users[idx].passwordHash = hashPassword(newPassword);
    writeUsers(users);

    return new Response(JSON.stringify({ success: true, message: "Password updated successfully!" }), {
      status: 200, headers: { "Content-Type": "application/json" }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500, headers: { "Content-Type": "application/json" }
    });
  }
};
