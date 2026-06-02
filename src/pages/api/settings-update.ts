import type { APIRoute } from "astro";
import fs from "node:fs";
import path from "node:path";

export const prerender = false;

const SETTINGS_FILE = path.resolve("src/data/global-settings.json");

function getInitialSettings() {
  return {
    headerScripts: "",
    bodyStartScripts: "",
    bodyEndScripts: "",
    footerScripts: "",
    logo: {
      headerLogoUrl: "/images/tangence-black.png",
      footerLogoUrl: "/images/scroll-logo.svg"
    },
    socialLinks: {
      facebook: "",
      linkedin: "",
      twitter: "",
      instagram: ""
    },
    contactInfo: {
      phone: "+91-995-812-9810",
      email: "info@tangence.com",
      description: "Performance marketing built to outlast algorithm changes, recessions, and growth-hack fads. Since 2006.",
      offices: [] as Array<{ title: string; icon: string; address: string }>,
      cities: [] as string[]
    },
    navigation: [
      { text: "Home", link: "/" },
      { text: "About Us", link: "/about-us" },
      { text: "Contact", link: "/contact" }
    ],
    footerNavigation: [
      { text: "Home", link: "/" },
      { text: "About Us", link: "/about-us" },
      { text: "Contact", link: "/contact" }
    ],
    redirects: [] as Array<{ from: string; to: string; type?: string; active?: boolean }>
  };
}

function hasRedirectLoop(list: Array<{ from: string; to: string; type?: string; active?: boolean }>): string | null {
  const adj = new Map<string, string>();
  for (const r of list) {
    const from = String(r.from || "").trim();
    const to = String(r.to || "").trim();
    if (!from || !to) continue;
    if (from === to) {
      return `Cyclical loop: "${from}" redirects to itself.`;
    }
    if (adj.has(from)) {
      return `Conflict: Multiple redirect targets mapped for "${from}".`;
    }
    adj.set(from, to);
  }
  
  for (const [start] of adj.entries()) {
    const visited = new Set<string>();
    let curr: string | undefined = start;
    while (curr) {
      if (visited.has(curr)) {
        return `Cyclical redirect loop detected: ${start} → ... → ${curr} → ${adj.get(curr)}`;
      }
      visited.add(curr);
      curr = adj.get(curr);
    }
  }
  return null;
}

export const GET: APIRoute = async ({ cookies }) => {
  const session = cookies.get("cms_session")?.value;
  if (session !== "authenticated-admin-session-2026") {
    return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  try {
    let settings = getInitialSettings();

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

    const headerScripts = data.headerScripts || "";
    const bodyStartScripts = data.bodyStartScripts || "";
    const bodyEndScripts = data.bodyEndScripts || "";
    const footerScripts = data.footerScripts || "";
    
    // Process and sanitize navigation list
    const rawNavigation = data.navigation || [];
    const navigation = rawNavigation.map((item: any) => ({
      text: String(item.text || "").trim(),
      link: String(item.link || "").trim(),
      children: (item.children || []).map((child: any) => ({
        text: String(child.text || "").trim(),
        link: String(child.link || "").trim()
      })).filter((child: any) => child.text && child.link)
    })).filter((item: any) => item.text && item.link);

    // Process and sanitize footer navigation list
    const rawFooterNavigation = data.footerNavigation || [];
    const footerNavigation = rawFooterNavigation.map((item: any) => ({
      text: String(item.text || "").trim(),
      link: String(item.link || "").trim(),
      newTab: item.newTab === true
    })).filter((item: any) => item.text && item.link);

    // Process and sanitize redirects mapping
    const rawRedirects = data.redirects || [];
    const redirects = rawRedirects.map((item: any) => ({
      from: String(item.from || "").trim(),
      to: String(item.to || "").trim(),
      type: String(item.type || "301").trim(),
      active: item.active !== false
    })).filter((item: any) => item.from && item.to);

    // Server-side loop validation
    const loopError = hasRedirectLoop(redirects);
    if (loopError) {
      return new Response(JSON.stringify({ success: false, error: `Redirect Error: ${loopError}` }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const logo = {
      headerLogoUrl: String(data.logo?.headerLogoUrl || "/images/tangence-black.png").trim(),
      footerLogoUrl: String(data.logo?.footerLogoUrl || "/images/scroll-logo.svg").trim()
    };

    const socialLinks = {
      facebook: String(data.socialLinks?.facebook || "").trim(),
      linkedin: String(data.socialLinks?.linkedin || "").trim(),
      twitter: String(data.socialLinks?.twitter || "").trim(),
      instagram: String(data.socialLinks?.instagram || "").trim()
    };

    const contactInfo = {
      phone: String(data.contactInfo?.phone || "+91-995-812-9810").trim(),
      email: String(data.contactInfo?.email || "info@tangence.com").trim(),
      description: String(data.contactInfo?.description || "").trim(),
      offices: (data.contactInfo?.offices || []).map((o: any) => ({
        title: String(o.title || "").trim(),
        icon: String(o.icon || "/images/icons/Path-529.png").trim(),
        address: String(o.address || "").trim()
      })).filter((o: any) => o.title || o.address),
      cities: (data.contactInfo?.cities || []).map((c: any) => String(c || "").trim()).filter(Boolean)
    };

    const updatedSettings = {
      headerScripts,
      bodyStartScripts,
      bodyEndScripts,
      footerScripts,
      logo,
      socialLinks,
      contactInfo,
      navigation,
      footerNavigation,
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

