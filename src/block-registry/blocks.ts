export interface BlockField {
  name: string;
  label: string;
  type: "text" | "textarea" | "number" | "boolean" | "select" | "image" | "list" | "repeater";
  required?: boolean;
  options?: string[]; // for select
  repeaterFields?: BlockField[]; // for repeater
  default?: any;
}

export interface BlockConfig {
  type: string;
  name: string;
  category: "hero" | "content" | "marketing" | "social" | "other";
  icon: string; // SVG icon key or friendly name
  fields: BlockField[];
  defaultValues: Record<string, any>;
}

export const BLOCK_REGISTRY: BlockConfig[] = [
  {
    type: "hero",
    name: "Hero Banner",
    category: "hero",
    icon: "hero",
    fields: [
      { name: "badge", label: "Badge Text", type: "text", default: "NEW UPDATE" },
      { name: "title", label: "Main Headline", type: "text", required: true, default: "Enterprise Solutions Scaled Fast" },
      { name: "description", label: "Subtext Description", type: "textarea", required: true, default: "We manage ad budgets and build organic conversion search structures that outlast hacks." },
      { name: "image", label: "Featured Image", type: "image", default: "/uploads/about-hero.png" },
      { name: "bullets", label: "Highlight Bullets", type: "list", default: ["Attribution audit screening", "ROAS dynamic reporting"] }
    ],
    defaultValues: {
      type: "hero",
      badge: "NEW UPDATE",
      title: "Enterprise Solutions Scaled Fast",
      description: "We manage ad budgets and build organic conversion search structures that outlast hacks.",
      image: "/uploads/about-hero.png",
      bullets: ["Attribution audit screening", "ROAS dynamic reporting"]
    }
  },
  {
    type: "about",
    name: "About Section",
    category: "content",
    icon: "about",
    fields: [
      { name: "eyebrow", label: "Eyebrow Text", type: "text", default: "WHO WE ARE" },
      { name: "title", label: "Section Title", type: "text", required: true, default: "Built for the long game" },
      { name: "description", label: "Body Narrative", type: "textarea", required: true, default: "Most performance marketing agencies exist for 3 to 5 years. We have been at this for over two decades." },
      { name: "image", label: "Corporate Image", type: "image", default: "/uploads/mission.png" },
      { name: "highlights", label: "Strategic Bullet highlights", type: "list", default: ["Transparency first reporting", "Senior executing strategists"] }
    ],
    defaultValues: {
      type: "about",
      eyebrow: "WHO WE ARE",
      title: "Built for the long game",
      description: "Most performance marketing agencies exist for 3 to 5 years. We have been at this for over two decades.",
      image: "/uploads/mission.png",
      highlights: ["Transparency first reporting", "Senior executing strategists"]
    }
  },
  {
    type: "rich_text",
    name: "Rich Text Narrative",
    category: "content",
    icon: "rich-text",
    fields: [
      { name: "content", label: "Markdown Body Content", type: "textarea", required: true, default: "## Direct Strategy\n\nWrite your rich text narrative content here. Standard markdown tags are dynamically rendered." }
    ],
    defaultValues: {
      type: "rich_text",
      content: "## Direct Strategy\n\nWrite your rich text narrative content here. Standard markdown tags are dynamically rendered."
    }
  },
  {
    type: "two_column",
    name: "Two Column Layout",
    category: "content",
    icon: "columns",
    fields: [
      { name: "eyebrow", label: "Eyebrow", type: "text", default: "DEEP BRIEF" },
      { name: "title", label: "Headline Title", type: "text", required: true, default: "Dual Perspective Coverage" },
      { name: "leftColumn", label: "Left Column Content", type: "textarea", required: true, default: "Left side narrative goes here." },
      { name: "rightColumn", label: "Right Column Content", type: "textarea", required: true, default: "Right side narrative goes here." }
    ],
    defaultValues: {
      type: "two_column",
      eyebrow: "DEEP BRIEF",
      title: "Dual Perspective Coverage",
      leftColumn: "Left side narrative goes here.",
      rightColumn: "Right side narrative goes here."
    }
  },
  {
    type: "image_content",
    name: "Image + Content Split",
    category: "content",
    icon: "image-content",
    fields: [
      { name: "eyebrow", label: "Eyebrow", type: "text", default: "CAPABILITIES" },
      { name: "title", label: "Headline Title", type: "text", required: true, default: "Engineered Ad Systems" },
      { name: "description", label: "Body Narrative", type: "textarea", required: true, default: "We replace traditional vanity metrics with live acquisition costs calculations." },
      { name: "image", label: "Featured Image", type: "image", default: "/uploads/vision.png" },
      { name: "imagePosition", label: "Image Placement Side", type: "select", options: ["left", "right"], default: "right" },
      { name: "buttonText", label: "CTA Button Text", type: "text", default: "Explore Systems" },
      { name: "buttonLink", label: "CTA Button Path", type: "text", default: "/contact" }
    ],
    defaultValues: {
      type: "image_content",
      eyebrow: "CAPABILITIES",
      title: "Engineered Ad Systems",
      description: "We replace traditional vanity metrics with live acquisition costs calculations.",
      image: "/uploads/vision.png",
      imagePosition: "right",
      buttonText: "Explore Systems",
      buttonLink: "/contact"
    }
  },
  {
    type: "cta",
    name: "CTA Banner Callout",
    category: "marketing",
    icon: "cta",
    fields: [
      { name: "eyebrow", label: "CTA Eyebrow", type: "text", default: "GET STARTED" },
      { name: "title", label: "CTA Headline Title", type: "text", required: true, default: "Ready to audit your marketing leaks?" },
      { name: "description", label: "CTA Paragraph Description", type: "textarea", required: true, default: "Request a 30-min screen share with senior strategists. Completely zero obligation." },
      { name: "buttonText", label: "Button Label", type: "text", required: true, default: "Schedule Free Audit" },
      { name: "buttonLink", label: "Button Destination Link", type: "text", required: true, default: "/contact" }
    ],
    defaultValues: {
      type: "cta",
      eyebrow: "GET STARTED",
      title: "Ready to audit your marketing leaks?",
      description: "Request a 30-min screen share with senior strategists. Completely zero obligation.",
      buttonText: "Schedule Free Audit",
      buttonLink: "/contact"
    }
  },
  {
    type: "stats",
    name: "Stats Grid Counters",
    category: "marketing",
    icon: "stats",
    fields: [
      { name: "eyebrow", label: "Stats Eyebrow", type: "text", default: "PROOF POINTS" },
      { name: "title", label: "Stats Headline Title", type: "text", required: true, default: "Data points we stand behind" },
      { name: "description", label: "Brief Summary Description", type: "textarea", default: "We manage ad budgets globally across programmatic arrays." },
      {
        name: "items",
        label: "Dynamic Metrics items",
        type: "repeater",
        required: true,
        repeaterFields: [
          { name: "num", label: "Stat Metric Value (e.g. 500+)", type: "text", required: true },
          { name: "label", label: "Label Description", type: "text", required: true }
        ],
        default: [{ num: "₹500 Cr+", label: "Budgets Managed" }, { num: "20 Years", label: "Agency Retention" }]
      }
    ],
    defaultValues: {
      type: "stats",
      eyebrow: "PROOF POINTS",
      title: "Data points we stand behind",
      description: "We manage ad budgets globally across programmatic arrays.",
      items: [
        { num: "₹500 Cr+", label: "Budgets Managed" },
        { num: "20 Years", label: "Agency Retention" }
      ]
    }
  },
  {
    type: "team",
    name: "Team Grid Directory",
    category: "social",
    icon: "team",
    fields: [
      { name: "eyebrow", label: "Team Eyebrow", type: "text", default: "OUR DIRECTORS" },
      { name: "title", label: "Team Headline Title", type: "text", required: true, default: "Executors, not relationship managers" },
      {
        name: "members",
        label: "Team Members List",
        type: "repeater",
        required: true,
        repeaterFields: [
          { name: "name", label: "Member Full Name", type: "text", required: true },
          { name: "role", label: "Corporate Designation", type: "text", required: true },
          { name: "bio", label: "Professional Background", type: "textarea" },
          { name: "image", label: "Avatar Image Asset", type: "image", required: true }
        ],
        default: [{ name: "Atul Verma", role: "Managing Director", bio: "Founded agency in 2006.", image: "/uploads/team-atul.png" }]
      }
    ],
    defaultValues: {
      type: "team",
      eyebrow: "OUR DIRECTORS",
      title: "Executors, not relationship managers",
      members: [
        { name: "Atul Verma", role: "Managing Director", bio: "Founded agency in 2006.", image: "/uploads/team-atul.png" }
      ]
    }
  },
  {
    type: "testimonials",
    name: "Client Testimonials Grid",
    category: "social",
    icon: "testimonials",
    fields: [
      { name: "eyebrow", label: "Testimonials Eyebrow", type: "text", default: "TRUST INDEX" },
      { name: "title", label: "Testimonials Headline Title", type: "text", required: true, default: "Stories from brands we scale" },
      {
        name: "items",
        label: "Testimonials Cards",
        type: "repeater",
        required: true,
        repeaterFields: [
          { name: "quote", label: "Testimonial Quote text", type: "textarea", required: true },
          { name: "author", label: "Author Full Name", type: "text", required: true },
          { name: "role", label: "Corporate Designation/Company", type: "text", required: true },
          { name: "avatar", label: "Avatar Asset", type: "image" }
        ],
        default: [{ quote: "Tangence helped locate major leaks in Meta budgets.", author: "Sarah Jenkins", role: "Director, TechCorp", avatar: "/uploads/team-sarah.png" }]
      }
    ],
    defaultValues: {
      type: "testimonials",
      eyebrow: "TRUST INDEX",
      title: "Stories from brands we scale",
      items: [
        { quote: "Tangence helped locate major leaks in Meta budgets.", author: "Sarah Jenkins", role: "Director, TechCorp", avatar: "/uploads/team-sarah.png" }
      ]
    }
  },
  {
    type: "faq",
    name: "FAQ Accordion Array",
    category: "content",
    icon: "faq",
    fields: [
      { name: "eyebrow", label: "FAQ Eyebrow", type: "text", default: "FAQ SHEET" },
      { name: "title", label: "FAQ Headline Title", type: "text", required: true, default: "Commonly raised performance briefs" },
      {
        name: "items",
        label: "Accordion Q&A rows",
        type: "repeater",
        required: true,
        repeaterFields: [
          { name: "question", label: "Accordion Question Title", type: "text", required: true },
          { name: "answer", label: "Accordion Answer Content", type: "textarea", required: true }
        ],
        default: [{ question: "Do you have contract lock-ins?", answer: "No, we retain clients based purely on dynamic performance." }]
      }
    ],
    defaultValues: {
      type: "faq",
      eyebrow: "FAQ SHEET",
      title: "Commonly raised performance briefs",
      items: [
        { question: "Do you have contract lock-ins?", answer: "No, we retain clients based purely on dynamic performance." }
      ]
    }
  },
  {
    type: "logo_slider",
    name: "Corporate Brands Slider",
    category: "marketing",
    icon: "logo-slider",
    fields: [
      { name: "eyebrow", label: "Slider Eyebrow", type: "text", default: "COMPANIES WE SCALED" },
      { name: "title", label: "Slider Headline Title", type: "text", required: true, default: "Trusted by industry corporate leaders" },
      {
        name: "logos",
        label: "Corporate Logo Elements",
        type: "repeater",
        required: true,
        repeaterFields: [
          { name: "image", label: "Corporate Logo Image", type: "image", required: true },
          { name: "alt", label: "Brand Name Alt Tag", type: "text", default: "Partner Brand" }
        ],
        default: [{ image: "/images/tangence-black.png", alt: "Tangence Partner" }]
      }
    ],
    defaultValues: {
      type: "logo_slider",
      eyebrow: "COMPANIES WE SCALED",
      title: "Trusted by industry corporate leaders",
      logos: [
        { image: "/images/tangence-black.png", alt: "Tangence Partner" }
      ]
    }
  },
  {
    type: "services_grid",
    name: "Services Cards Grid",
    category: "content",
    icon: "services",
    fields: [
      { name: "eyebrow", label: "Services Eyebrow", type: "text", default: "CAPABILITIES" },
      { name: "title", label: "Services Headline Title", type: "text", required: true, default: "Full-Funnel growth loops channels" },
      { name: "description", label: "Section Brief description", type: "textarea", default: "We manage ad budgets and organic visibility streams." },
      {
        name: "services",
        label: "Services Listing Items",
        type: "repeater",
        required: true,
        repeaterFields: [
          { name: "title", label: "Service Name", type: "text", required: true },
          { name: "description", label: "Service brief description", type: "textarea", required: true },
          { name: "icon", label: "Metric Icon Badge Text", type: "text", default: "✓" },
          { name: "link", label: "Service Link Destination", type: "text", default: "/services" }
        ],
        default: [{ title: "Paid Acquisition", description: "Meta and Google ads screeners optimization.", icon: "✓", link: "/services" }]
      }
    ],
    defaultValues: {
      type: "services_grid",
      eyebrow: "CAPABILITIES",
      title: "Full-Funnel growth loops channels",
      description: "We manage ad budgets and organic visibility streams.",
      services: [
        { title: "Paid Acquisition", description: "Meta and Google ads screeners optimization.", icon: "✓", link: "/services" }
      ]
    }
  },
  {
    type: "pricing",
    name: "Pricing Engagement Tiers",
    category: "marketing",
    icon: "pricing",
    fields: [
      { name: "eyebrow", label: "Pricing Eyebrow", type: "text", default: "PRICING PLANS" },
      { name: "title", label: "Pricing Headline Title", type: "text", required: true, default: "Transparent corporate retention fees" },
      { name: "description", label: "Section narrative summary", type: "textarea", default: "Choose from our three engagement models." },
      { name: "footer", label: "Pricing Footnote disclaimer", type: "text", default: "All billing requires a 3-month min trial engagement." },
      {
        name: "items",
        label: "Pricing Tier packages",
        type: "repeater",
        required: true,
        repeaterFields: [
          { name: "title", label: "Plan Name Title (e.g. Basic)", type: "text", required: true },
          { name: "price", label: "Monthly retention fee", type: "text", required: true },
          { name: "suffix", label: "Billing frequency (e.g. / mo)", type: "text", default: "/mo" },
          { name: "subtext", label: "Package short descriptor", type: "text", default: "Ideal for growing mid-market startups" },
          { name: "featured", label: "Featured package highlight", type: "boolean", default: false },
          { name: "features", label: "Deliverables features list", type: "list", default: ["Ad accounts screen audit", "ROAS live dashboard link"] }
        ],
        default: [{ title: "Scale Audit", price: "₹2,50,000", suffix: "/mo", subtext: "For mid-market startups", featured: true, features: ["Account Audits", "ROAS live dashboard"] }]
      }
    ],
    defaultValues: {
      type: "pricing",
      eyebrow: "PRICING PLANS",
      title: "Transparent corporate retention fees",
      description: "Choose from our three engagement models.",
      footer: "All billing requires a 3-month min trial engagement.",
      items: [
        { title: "Scale Audit", price: "₹2,50,000", suffix: "/mo", subtext: "For mid-market startups", featured: true, features: ["Account Audits", "ROAS live dashboard"] }
      ]
    }
  },
  {
    type: "case_studies",
    name: "Success Case Studies",
    category: "marketing",
    icon: "case-studies",
    fields: [
      { name: "eyebrow", label: "Case Eyebrow", type: "text", default: "SUCCESS BRIEFS" },
      { name: "title", label: "Case Headline Title", type: "text", required: true, default: "Corporate accounts optimization metrics" },
      {
        name: "items",
        label: "Case Study tiles",
        type: "repeater",
        required: true,
        repeaterFields: [
          { name: "title", label: "Client Case Study Headline", type: "text", required: true },
          { name: "client", label: "Client Brand Name", type: "text", required: true },
          { name: "category", label: "Growth Category (e.g. SEO)", type: "text", default: "SEO Growth" },
          { name: "image", label: "Featured image cover", type: "image", required: true },
          { name: "excerpt", label: "Result summary brief", type: "textarea", required: true },
          { name: "link", label: "Case link destination", type: "text", default: "/case-studies" }
        ],
        default: [{ title: "Locating 30% Waste in Meta Ad Budgets", client: "TechCorp Inc.", category: "Meta Optimization", image: "/uploads/about-hero.png", excerpt: "We audited TechCorp accounts and eliminated redundant CAC expenditures.", link: "/case-studies" }]
      }
    ],
    defaultValues: {
      type: "case_studies",
      eyebrow: "SUCCESS BRIEFS",
      title: "Corporate accounts optimization metrics",
      items: [
        { title: "Locating 30% Waste in Meta Ad Budgets", client: "TechCorp Inc.", category: "Meta Optimization", image: "/uploads/about-hero.png", excerpt: "We audited TechCorp accounts and eliminated redundant CAC expenditures.", link: "/case-studies" }
      ]
    }
  },
  {
    type: "timeline",
    name: "Timeline Milestones",
    category: "content",
    icon: "timeline",
    fields: [
      { name: "eyebrow", label: "Timeline Eyebrow", type: "text", default: "ROADMAP STAGES" },
      { name: "title", label: "Timeline Headline Title", type: "text", required: true, default: "Corporate history & growth roadmap" },
      {
        name: "items",
        label: "Timeline Event nodes",
        type: "repeater",
        required: true,
        repeaterFields: [
          { name: "date", label: "Event Date/Year (e.g. 2006)", type: "text", required: true },
          { name: "title", label: "Milestone Headline", type: "text", required: true },
          { name: "description", label: "Milestone narrative details", type: "textarea", required: true }
        ],
        default: [{ date: "2006", title: "Agency Inception", description: "Atul Verma launched Tangence Performance Marketing in Noida." }]
      }
    ],
    defaultValues: {
      type: "timeline",
      eyebrow: "ROADMAP STAGES",
      title: "Corporate history & growth roadmap",
      items: [
        { date: "2006", title: "Agency Inception", description: "Atul Verma launched Tangence Performance Marketing in Noida." }
      ]
    }
  },
  {
    type: "awards",
    name: "Awards & Badges Showcase",
    category: "social",
    icon: "awards",
    fields: [
      { name: "eyebrow", label: "Awards Eyebrow", type: "text", default: "RECOGNITIONS" },
      { name: "title", label: "Awards Headline Title", type: "text", required: true, default: "Industry honors and credentials" },
      {
        name: "items",
        label: "Awards badge grid list",
        type: "repeater",
        required: true,
        repeaterFields: [
          { name: "title", label: "Honors Title Name", type: "text", required: true },
          { name: "organization", label: "Bestowing Organization Name", type: "text", required: true },
          { name: "year", label: "Acquisition Date/Year", type: "text", default: "2026" },
          { name: "logo", label: "Badge Icon Asset", type: "image", required: true }
        ],
        default: [{ title: "Best B2B SEO Agency Noida", organization: "Clutch Badges", year: "2026", logo: "/images/scroll-logo.svg" }]
      }
    ],
    defaultValues: {
      type: "awards",
      eyebrow: "RECOGNITIONS",
      title: "Industry honors and credentials",
      items: [
        { title: "Best B2B SEO Agency Noida", organization: "Clutch Badges", year: "2026", logo: "/images/scroll-logo.svg" }
      ]
    }
  },
  {
    type: "contact_form_block",
    name: "Website Inquiry Contact Form",
    category: "marketing",
    icon: "contact-form",
    fields: [
      { name: "eyebrow", label: "Contact Eyebrow", type: "text", default: "FREE BRIEF SCREEN" },
      { name: "title", label: "Contact Headline Title", type: "text", required: true, default: "Schedule your zero-obligation screener" },
      { name: "description", label: "Contact section details", type: "textarea", default: "Fill out the fields below and our analyst will reach out within 24 business hours." },
      { name: "placeholderName", label: "Name input placeholder text", type: "text", default: "e.g. John Doe" },
      { name: "placeholderEmail", label: "Email input placeholder text", type: "text", default: "e.g. john@company.com" },
      { name: "submitButtonText", label: "Submit CTA Text", type: "text", default: "Schedule My screener" }
    ],
    defaultValues: {
      type: "contact_form_block",
      eyebrow: "FREE BRIEF SCREEN",
      title: "Schedule your zero-obligation screener",
      description: "Fill out the fields below and our analyst will reach out within 24 business hours.",
      placeholderName: "e.g. John Doe",
      placeholderEmail: "e.g. john@company.com",
      submitButtonText: "Schedule My screener"
    }
  },
  {
    type: "custom_html",
    name: "Custom HTML Injection Code",
    category: "other",
    icon: "html",
    fields: [
      { name: "content", label: "Raw HTML / Inline CSS Scripts", type: "textarea", required: true, default: "<div style='text-align:center; padding: 2rem;'><h3>Custom Layout Injected here</h3></div>" }
    ],
    defaultValues: {
      type: "custom_html",
      content: "<div style='text-align:center; padding: 2rem;'><h3>Custom Layout Injected here</h3></div>"
    }
  },
  {
    type: "video_section",
    name: "Video Showcase Embed",
    category: "content",
    icon: "video",
    fields: [
      { name: "eyebrow", label: "Video Eyebrow", type: "text", default: "SCREEN DEMO" },
      { name: "title", label: "Video Headline Title", type: "text", required: true, default: "Review our optimization audits process" },
      { name: "description", label: "Description brief", type: "textarea", default: "Watch senior analyst screen-share audit walkthrough." },
      { name: "videoUrl", label: "Embed YouTube/Vimeo/MP4 direct URL", type: "text", required: true, default: "https://www.youtube.com/embed/dQw4w9WgXcQ" },
      { name: "coverImage", label: "Player Cover Poster Image", type: "image", default: "/uploads/about-hero.png" }
    ],
    defaultValues: {
      type: "video_section",
      eyebrow: "SCREEN DEMO",
      title: "Review our optimization audits process",
      description: "Watch senior analyst screen-share audit walkthrough.",
      videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      coverImage: "/uploads/about-hero.png"
    }
  },
  {
    type: "gallery",
    name: "Responsive Photos Gallery",
    category: "social",
    icon: "gallery",
    fields: [
      { name: "eyebrow", label: "Gallery Eyebrow", type: "text", default: "PORTFOLIO IMAGES" },
      { name: "title", label: "Gallery Headline Title", type: "text", required: true, default: "A look inside the Tangence Noida HQ" },
      {
        name: "items",
        label: "Gallery Photo items",
        type: "repeater",
        required: true,
        repeaterFields: [
          { name: "image", label: "Photo Asset", type: "image", required: true },
          { name: "caption", label: "Overlay Caption", type: "text", default: "Office spaces details" },
          { name: "alt", label: "Image Alt Description", type: "text", default: "Office photography" }
        ],
        default: [{ image: "/uploads/about-hero.png", caption: "Corporate Noida Boardroom", alt: "Office Noida boardroom details" }]
      }
    ],
    defaultValues: {
      type: "gallery",
      eyebrow: "PORTFOLIO IMAGES",
      title: "A look inside the Tangence Noida HQ",
      items: [
        { image: "/uploads/about-hero.png", caption: "Corporate Noida Boardroom", alt: "Office Noida boardroom details" }
      ]
    }
  },
  {
    type: "blog_listing",
    name: "Blog Listing mock tiles",
    category: "content",
    icon: "blog",
    fields: [
      { name: "eyebrow", label: "Blog Eyebrow", type: "text", default: "LATEST PERSPECTIVES" },
      { name: "title", label: "Blog Headline Title", type: "text", required: true, default: "Resources and ad accounts strategies" },
      { name: "limit", label: "Maximum Articles count", type: "number", required: true, default: 3 }
    ],
    defaultValues: {
      type: "blog_listing",
      eyebrow: "LATEST PERSPECTIVES",
      title: "Resources and ad accounts strategies",
      limit: 3
    }
  },
  {
    type: "related_pages",
    name: "Related Internal Pages Links",
    category: "other",
    icon: "related",
    fields: [
      { name: "eyebrow", label: "Related Eyebrow", type: "text", default: "RECOMMENDED READS" },
      { name: "title", label: "Related Pages Headline Title", type: "text", required: true, default: "Internal campaign resources guides" },
      {
        name: "pages",
        label: "Related Pages maps",
        type: "repeater",
        required: true,
        repeaterFields: [
          { name: "label", label: "Navigation Card Label", type: "text", required: true },
          { name: "link", label: "Link Path (e.g. /services)", type: "text", required: true },
          { name: "description", label: "Short description text", type: "text", default: "Explore services deliverables" }
        ],
        default: [{ label: "Services Landing", link: "/services", description: "Audit details channels listing." }]
      }
    ],
    defaultValues: {
      type: "related_pages",
      eyebrow: "RECOMMENDED READS",
      title: "Internal campaign resources guides",
      pages: [
        { label: "Services Landing", link: "/services", description: "Audit details channels listing." }
      ]
    }
  }
];
