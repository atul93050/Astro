import type { APIRoute } from "astro";
import fs from "node:fs";
import path from "node:path";

export const prerender = false;

// Custom Helper to process uploaded file or return the existing path
async function saveUploadedFile(file: any, existingPath: string): Promise<string> {
  if (!file || typeof file !== "object" || !("size" in file) || !("name" in file) || (file as any).size === 0) {
    return existingPath;
  }

  // Create public uploads directory
  const uploadDir = path.resolve("public/uploads");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // Generate unique file name
  const ext = path.extname(file.name) || ".png";
  const uniqueName = `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
  const filePath = path.join(uploadDir, uniqueName);

  // Write file buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  fs.writeFileSync(filePath, buffer);

  // Return public relative path
  return `/uploads/${uniqueName}`;
}

// Custom bug-free YAML stringifier for our schema
function serializeFrontmatter(data: any): string {
  let yaml = "---\n";

  const cleanString = (str: string) => {
    if (!str) return '""';
    // Escape quotes and remove trailing/leading newlines
    const escaped = str
      .trim()
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "");
    return `"${escaped}"`;
  };

  yaml += `title: ${cleanString(data.title)}\n`;
  yaml += `seoTitle: ${cleanString(data.seoTitle)}\n`;
  yaml += `seoDescription: ${cleanString(data.seoDescription)}\n`;
  yaml += `seoFocusKeyword: ${cleanString(data.seoFocusKeyword)}\n`;
  yaml += `seoCanonical: ${cleanString(data.seoCanonical)}\n`;
  yaml += `seoRobots: ${cleanString(data.seoRobots)}\n`;
  yaml += `seoOgTitle: ${cleanString(data.seoOgTitle)}\n`;
  yaml += `seoOgDescription: ${cleanString(data.seoOgDescription)}\n`;
  yaml += `seoOgImage: ${cleanString(data.seoOgImage)}\n`;
  yaml += `seoTwitterCard: ${cleanString(data.seoTwitterCard)}\n`;
  yaml += `seoSchemaType: ${cleanString(data.seoSchemaType)}\n`;
  yaml += `seoSchemaMarkup: ${cleanString(data.seoSchemaMarkup)}\n`;

  yaml += "hero:\n";
  yaml += `  title: ${cleanString(data.hero.title)}\n`;
  yaml += `  description: ${cleanString(data.hero.description)}\n`;
  yaml += `  image: ${cleanString(data.hero.image)}\n`;

  yaml += "mission:\n";
  yaml += `  title: ${cleanString(data.mission.title)}\n`;
  yaml += `  description: ${cleanString(data.mission.description)}\n`;
  yaml += `  image: ${cleanString(data.mission.image)}\n`;

  yaml += "vision:\n";
  yaml += `  title: ${cleanString(data.vision.title)}\n`;
  yaml += `  description: ${cleanString(data.vision.description)}\n`;
  yaml += `  image: ${cleanString(data.vision.image)}\n`;

  yaml += "team:\n";
  if (Array.isArray(data.team) && data.team.length > 0) {
    for (const member of data.team) {
      yaml += `  - name: ${cleanString(member.name)}\n`;
      yaml += `    role: ${cleanString(member.role)}\n`;
      yaml += `    bio: ${cleanString(member.bio)}\n`;
      yaml += `    image: ${cleanString(member.image)}\n`;
    }
  } else {
    yaml += "  []\n";
  }

  yaml += "---";
  return yaml;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();

    // 1. Basic Fields Extraction
    const title = formData.get("title")?.toString().trim() || "";
    const seoTitle = formData.get("seoTitle")?.toString().trim() || "";
    const seoDescription = formData.get("seoDescription")?.toString().trim() || "";
    const markdownBody = formData.get("body")?.toString().trim() || "";

    const seoFocusKeyword = formData.get("seoFocusKeyword")?.toString().trim() || "";
    const seoCanonical = formData.get("seoCanonical")?.toString().trim() || "";
    const seoRobots = formData.get("seoRobots")?.toString().trim() || "";
    const seoOgTitle = formData.get("seoOgTitle")?.toString().trim() || "";
    const seoOgDescription = formData.get("seoOgDescription")?.toString().trim() || "";
    const seoOgImage = formData.get("seoOgImage")?.toString().trim() || "";
    const seoTwitterCard = formData.get("seoTwitterCard")?.toString().trim() || "";
    const seoSchemaType = formData.get("seoSchemaType")?.toString().trim() || "";
    const seoSchemaMarkup = formData.get("seoSchemaMarkup")?.toString().trim() || "";

    // 2. Section Extraction (Titles, Descriptions, Existing Images, and Uploaded Files)
    const heroTitle = formData.get("heroTitle")?.toString().trim() || "";
    const heroDescription = formData.get("heroDescription")?.toString().trim() || "";
    const heroImageExisting = formData.get("heroImageExisting")?.toString().trim() || "";
    const heroImageFile = formData.get("heroImageFile");

    const missionTitle = formData.get("missionTitle")?.toString().trim() || "";
    const missionDescription = formData.get("missionDescription")?.toString().trim() || "";
    const missionImageExisting = formData.get("missionImageExisting")?.toString().trim() || "";
    const missionImageFile = formData.get("missionImageFile");

    const visionTitle = formData.get("visionTitle")?.toString().trim() || "";
    const visionDescription = formData.get("visionDescription")?.toString().trim() || "";
    const visionImageExisting = formData.get("visionImageExisting")?.toString().trim() || "";
    const visionImageFile = formData.get("visionImageFile");

    // Server-side validation
    const errors: Record<string, string> = {};
    if (!title) errors.title = "Page Title is required";
    if (!seoTitle) errors.seoTitle = "SEO Meta Title is required";
    if (!seoDescription) errors.seoDescription = "SEO Meta Description is required";
    if (!heroTitle) errors.heroTitle = "Hero Title is required";
    if (!heroDescription) errors.heroDescription = "Hero Description is required";
    if (!missionTitle) errors.missionTitle = "Mission Title is required";
    if (!missionDescription) errors.missionDescription = "Mission Description is required";
    if (!visionTitle) errors.visionTitle = "Vision Title is required";
    if (!visionDescription) errors.visionDescription = "Vision Description is required";

    // 3. Process Section Image Uploads
    const heroImage = await saveUploadedFile(heroImageFile, heroImageExisting || "/uploads/about-hero.png");
    const missionImage = await saveUploadedFile(missionImageFile, missionImageExisting || "/uploads/mission.png");
    const visionImage = await saveUploadedFile(visionImageFile, visionImageExisting || "/uploads/vision.png");

    // 4. Process Dynamic Team Members
    const team: Array<{ name: string; role: string; bio: string; image: string }> = [];
    const teamNames = formData.getAll("teamName[]");
    const teamRoles = formData.getAll("teamRole[]");
    const teamBios = formData.getAll("teamBio[]");
    const teamImageExistings = formData.getAll("teamImageExisting[]");
    const teamImageFiles = formData.getAll("teamImageFile[]");

    for (let i = 0; i < teamNames.length; i++) {
      const name = teamNames[i]?.toString().trim() || "";
      const role = teamRoles[i]?.toString().trim() || "";
      const bio = teamBios[i]?.toString().trim() || "";
      const existingImg = teamImageExistings[i]?.toString().trim() || "";
      const file = teamImageFiles[i];

      if (!name) {
        errors[`team_${i}_name`] = `Team Member #${i + 1} Name is required`;
      }
      if (!role) {
        errors[`team_${i}_role`] = `Team Member #${i + 1} Role is required`;
      }

      const imgPath = await saveUploadedFile(file, existingImg || "/uploads/team-placeholder.png");
      team.push({ name, role, bio, image: imgPath });
    }

    // If validation fails, return 400 Bad Request
    if (Object.keys(errors).length > 0) {
      return new Response(
        JSON.stringify({ success: false, errors }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 5. Structure updated data
    const updatedData = {
      title,
      seoTitle,
      seoDescription,
      seoFocusKeyword,
      seoCanonical,
      seoRobots,
      seoOgTitle,
      seoOgDescription,
      seoOgImage,
      seoTwitterCard,
      seoSchemaType,
      seoSchemaMarkup,
      hero: { title: heroTitle, description: heroDescription, image: heroImage },
      mission: { title: missionTitle, description: missionDescription, image: missionImage },
      vision: { title: visionTitle, description: visionDescription, image: visionImage },
      team,
    };

    // 6. Generate markdown file content
    const frontmatterString = serializeFrontmatter(updatedData);
    const finalFileContent = `${frontmatterString}\n\n${markdownBody}\n`;

    // 7. Write back to Markdown file
    const markdownPath = path.resolve("src/content/about/about.md");
    fs.writeFileSync(markdownPath, finalFileContent, "utf-8");

    return new Response(
      JSON.stringify({ success: true, message: "CMS Content updated successfully!" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("CMS update error:", error);
    return new Response(
      JSON.stringify({ success: false, errors: { global: error.message || "An unexpected error occurred" } }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
