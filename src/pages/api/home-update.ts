import type { APIRoute } from "astro";
import fs from "node:fs";
import path from "node:path";

export const prerender = false;

// Custom robust YAML stringifier for homepage nested schema
function serializeFrontmatter(data: any): string {
  let yaml = "---\n";

  const cleanString = (str: string) => {
    if (!str) return '""';
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

  // Hero
  yaml += "hero:\n";
  yaml += `  badge: ${cleanString(data.hero.badge)}\n`;
  yaml += `  title: ${cleanString(data.hero.title)}\n`;
  yaml += `  description: ${cleanString(data.hero.description)}\n`;
  yaml += "  bullets:\n";
  if (Array.isArray(data.hero.bullets) && data.hero.bullets.length > 0) {
    for (const bullet of data.hero.bullets) {
      yaml += `    - ${cleanString(bullet)}\n`;
    }
  } else {
    yaml += "    []\n";
  }
  yaml += `  formTitle: ${cleanString(data.hero.formTitle)}\n`;
  yaml += `  formDescription: ${cleanString(data.hero.formDescription)}\n`;
  yaml += `  formTrust: ${cleanString(data.hero.formTrust)}\n`;

  // Stats
  yaml += "stats:\n";
  yaml += `  eyebrow: ${cleanString(data.stats.eyebrow)}\n`;
  yaml += `  title: ${cleanString(data.stats.title)}\n`;
  yaml += `  description: ${cleanString(data.stats.description)}\n`;
  yaml += "  items:\n";
  if (Array.isArray(data.stats.items) && data.stats.items.length > 0) {
    for (const stat of data.stats.items) {
      yaml += `    - num: ${cleanString(stat.num)}\n`;
      yaml += `      label: ${cleanString(stat.label)}\n`;
    }
  } else {
    yaml += "    []\n";
  }

  // Pricing
  yaml += "pricing:\n";
  yaml += `  eyebrow: ${cleanString(data.pricing.eyebrow)}\n`;
  yaml += `  title: ${cleanString(data.pricing.title)}\n`;
  yaml += `  description: ${cleanString(data.pricing.description)}\n`;
  yaml += `  footer: ${cleanString(data.pricing.footer)}\n`;
  yaml += "  items:\n";
  if (Array.isArray(data.pricing.items) && data.pricing.items.length > 0) {
    for (const plan of data.pricing.items) {
      yaml += `    - title: ${cleanString(plan.title)}\n`;
      yaml += `      price: ${cleanString(plan.price)}\n`;
      yaml += `      suffix: ${cleanString(plan.suffix)}\n`;
      yaml += `      subtext: ${cleanString(plan.subtext)}\n`;
      yaml += `      featured: ${plan.featured ? "true" : "false"}\n`;
      yaml += "      features:\n";
      if (Array.isArray(plan.features) && plan.features.length > 0) {
        for (const feature of plan.features) {
          yaml += `        - ${cleanString(feature)}\n`;
        }
      } else {
        yaml += "        []\n";
      }
    }
  } else {
    yaml += "    []\n";
  }

  // FAQ
  yaml += "faq:\n";
  yaml += `  eyebrow: ${cleanString(data.faq.eyebrow)}\n`;
  yaml += `  title: ${cleanString(data.faq.title)}\n`;
  yaml += "  items:\n";
  if (Array.isArray(data.faq.items) && data.faq.items.length > 0) {
    for (const faq of data.faq.items) {
      yaml += `    - question: ${cleanString(faq.question)}\n`;
      yaml += `      answer: ${cleanString(faq.answer)}\n`;
      yaml += `      open: ${faq.open ? "true" : "false"}\n`;
    }
  } else {
    yaml += "    []\n";
  }

  yaml += "---";
  return yaml;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();

    // 1. Root & Hero fields
    const title = formData.get("title")?.toString().trim() || "";
    const seoTitle = formData.get("seoTitle")?.toString().trim() || "";
    const seoDescription = formData.get("seoDescription")?.toString().trim() || "";

    const heroBadge = formData.get("heroBadge")?.toString().trim() || "";
    const heroTitle = formData.get("heroTitle")?.toString().trim() || "";
    const heroDescription = formData.get("heroDescription")?.toString().trim() || "";
    const heroFormTitle = formData.get("heroFormTitle")?.toString().trim() || "";
    const heroFormDescription = formData.get("heroFormDescription")?.toString().trim() || "";
    const heroFormTrust = formData.get("heroFormTrust")?.toString().trim() || "";

    // Bullets list
    const heroBullets = formData.getAll("heroBullets[]").map(b => b.toString().trim()).filter(Boolean);

    // 2. Stats fields
    const statsEyebrow = formData.get("statsEyebrow")?.toString().trim() || "";
    const statsTitle = formData.get("statsTitle")?.toString().trim() || "";
    const statsDescription = formData.get("statsDescription")?.toString().trim() || "";

    const statNums = formData.getAll("statNum[]");
    const statLabels = formData.getAll("statLabel[]");
    const statsItems: Array<{ num: string; label: string }> = [];

    for (let i = 0; i < statNums.length; i++) {
      const num = statNums[i]?.toString().trim() || "";
      const label = statLabels[i]?.toString().trim() || "";
      if (num || label) {
        statsItems.push({ num, label });
      }
    }

    // 3. Pricing fields
    const pricingEyebrow = formData.get("pricingEyebrow")?.toString().trim() || "";
    const pricingTitle = formData.get("pricingTitle")?.toString().trim() || "";
    const pricingDescription = formData.get("pricingDescription")?.toString().trim() || "";
    const pricingFooter = formData.get("pricingFooter")?.toString().trim() || "";

    const planTitles = formData.getAll("planTitle[]");
    const planPrices = formData.getAll("planPrice[]");
    const planSuffixes = formData.getAll("planSuffix[]");
    const planSubtexts = formData.getAll("planSubtext[]");
    const planFeatureds = formData.getAll("planFeatured[]"); // Will correspond to plan indexes
    
    // Complex mapping for pricing plan features list.
    // Standard form submission maps array strings separated by plan boundary.
    // To keep it simple, features are sent in the form with name="planFeatures_[index][]".
    const pricingItems: any[] = [];
    for (let i = 0; i < planTitles.length; i++) {
      const pTitle = planTitles[i]?.toString().trim() || "";
      const pPrice = planPrices[i]?.toString().trim() || "";
      const pSuffix = planSuffixes[i]?.toString().trim() || "";
      const pSubtext = planSubtexts[i]?.toString().trim() || "";
      const isFeatured = planFeatureds.includes(i.toString()) || formData.get(`planFeatured_${i}`) === "true";

      const pFeatures = formData.getAll(`planFeatures_${i}[]`).map(f => f.toString().trim()).filter(Boolean);

      pricingItems.push({
        title: pTitle,
        price: pPrice,
        suffix: pSuffix,
        subtext: pSubtext,
        featured: isFeatured,
        features: pFeatures
      });
    }

    // 4. FAQ fields
    const faqEyebrow = formData.get("faqEyebrow")?.toString().trim() || "";
    const faqTitle = formData.get("faqTitle")?.toString().trim() || "";

    const faqQuestions = formData.getAll("faqQuestion[]");
    const faqAnswers = formData.getAll("faqAnswer[]");
    const faqOpens = formData.getAll("faqOpen[]");

    const faqItems: any[] = [];
    for (let i = 0; i < faqQuestions.length; i++) {
      const q = faqQuestions[i]?.toString().trim() || "";
      const a = faqAnswers[i]?.toString().trim() || "";
      const isOpen = faqOpens.includes(i.toString()) || formData.get(`faqOpen_${i}`) === "true";

      if (q || a) {
        faqItems.push({
          question: q,
          answer: a,
          open: isOpen
        });
      }
    }

    // Server-side validation
    const errors: Record<string, string> = {};
    if (!title) errors.title = "Page Title is required";
    if (!seoTitle) errors.seoTitle = "SEO Meta Title is required";
    if (!seoDescription) errors.seoDescription = "SEO Meta Description is required";
    if (!heroTitle) errors.heroTitle = "Hero Title is required";
    if (!statsTitle) errors.statsTitle = "Stats Section Title is required";
    if (!pricingTitle) errors.pricingTitle = "Pricing Section Title is required";
    if (!faqTitle) errors.faqTitle = "FAQ Section Title is required";

    if (Object.keys(errors).length > 0) {
      return new Response(
        JSON.stringify({ success: false, errors }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const updatedData = {
      title,
      seoTitle,
      seoDescription,
      hero: {
        badge: heroBadge,
        title: heroTitle,
        description: heroDescription,
        bullets: heroBullets,
        formTitle: heroFormTitle,
        formDescription: heroFormDescription,
        formTrust: heroFormTrust
      },
      stats: {
        eyebrow: statsEyebrow,
        title: statsTitle,
        description: statsDescription,
        items: statsItems
      },
      pricing: {
        eyebrow: pricingEyebrow,
        title: pricingTitle,
        description: pricingDescription,
        footer: pricingFooter,
        items: pricingItems
      },
      faq: {
        eyebrow: faqEyebrow,
        title: faqTitle,
        items: faqItems
      }
    };

    // 5. Generate Markdown
    const frontmatterString = serializeFrontmatter(updatedData);
    const finalFileContent = `${frontmatterString}\n`;

    // 6. Write to disk
    const markdownPath = path.resolve("src/content/home/home.md");
    fs.writeFileSync(markdownPath, finalFileContent, "utf-8");

    return new Response(
      JSON.stringify({ success: true, message: "Homepage CMS Content updated successfully!" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Homepage CMS update error:", error);
    return new Response(
      JSON.stringify({ success: false, errors: { global: error.message || "An unexpected error occurred" } }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
