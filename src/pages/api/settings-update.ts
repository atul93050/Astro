import type { APIRoute } from "astro";
import fs from "node:fs";
import path from "node:path";

export const prerender = false;

const SETTINGS_FILE = path.resolve("src/data/global-settings.json");

export const GET: APIRoute = async ({ cookies }) => {
  const session = cookies.get("cms_session")?.value;
  if (session !== "authenticated-admin-session-2026") {
    return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  try {
    let settings = {
      headerScripts: "",
      footerScripts: "",
      navigation: [
        { text: "Home", link: "/" },
        { text: "About Us", link: "/about-us" },
        { text: "Contact", link: "/contact" }
      ],
      redirects: [] as Array<{ from: string; to: string }>
    };

    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, "utf-8");
      settings = { ...settings, ...JSON.parse(data) };
    } else {
      // Create directories and write initial seeded settings
      const dir = path.dirname(SETTINGS_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf-8");
    }

    return new Response(JSON.stringify({ success: true, settings }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const session = cookies.get("cms_session")?.value;
  if (session !== "authenticated-admin-session-2026") {
    return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  try {
    const data = await request.json();

    // Setup Validation
    const headerScripts = data.headerScripts || "";
    const footerScripts = data.footerScripts || "";
    
    // Process and sanitize navigation list
    const rawNavigation = data.navigation || [];
    const navigation = rawNavigation.map((item: any) => ({
      text: String(item.text || "").trim(),
      link: String(item.link || "").trim()
    })).filter((item: any) => item.text && item.link);

    // Process and sanitize 301 redirects mapping
    const rawRedirects = data.redirects || [];
    const redirects = rawRedirects.map((item: any) => ({
      from: String(item.from || "").trim(),
      to: String(item.to || "").trim()
    })).filter((item: any) => item.from && item.to);

    const updatedSettings = {
      headerScripts,
      footerScripts,
      navigation,
      redirects
    };

    // Ensure dir exists
    const dir = path.dirname(SETTINGS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(updatedSettings, null, 2), "utf-8");

    return new Response(JSON.stringify({ success: true, message: "Global settings saved successfully!" }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
