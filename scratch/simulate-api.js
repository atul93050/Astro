import fs from "node:fs";
import path from "node:path";
import { parse, stringify } from "yaml";

const pagesDir = path.resolve("src/content/pages");
const revisionsDir = path.resolve("src/content/revisions");
const sectionsDir = path.resolve("src/content/sections");

const testSlug = "test-put-trash";
const testFile = path.join(pagesDir, `${testSlug}.md`);

// 1. Create a mock page
const initialContent = `---
title: Test Put Trash
slug: ${testSlug}
status: published
blocks:
  - type: home_banner
    sectionId: test-put-banner
lastUpdated: ${new Date().toISOString()}
---
`;

fs.writeFileSync(testFile, initialContent, "utf-8");

// Mock block definition / section file
if (!fs.existsSync(sectionsDir)) fs.mkdirSync(sectionsDir, { recursive: true });
fs.writeFileSync(path.join(sectionsDir, "test-put-banner.md"), "---\ntype: home_banner\ntitle: Welcome\n---\n", "utf-8");

console.log("1. Created mock page and section.");

// 2. Simulate GET /api/pages-crud?action=get
const fileContent = fs.readFileSync(testFile, "utf-8");
const parts = fileContent.split(/^---$/m);
const data = parse(parts[1]);
const body = parts.slice(2).join("---").trim();

// Resolve sections
if (data.blocks) {
  data.blocks = data.blocks.map(block => {
    if (block.sectionId) {
      const secPath = path.join(sectionsDir, `${block.sectionId}.md`);
      let secData = {};
      if (fs.existsSync(secPath)) {
        secData = parse(fs.readFileSync(secPath, "utf-8").split(/^---$/m)[1] || "");
      }
      return { ...block, ...secData };
    }
    return block;
  });
}

// 3. Client changes status to "trash"
data.status = "trash";
data.originalSlug = testSlug;
data.body = body;

// 4. Simulate PUT
const originalSlug = data.originalSlug || data.slug;
const originalFilePath = path.join(pagesDir, `${originalSlug}.md`);
const newFilePath = path.join(pagesDir, `${data.slug}.md`);

// Backup revision
const timestamp = Date.now().toString();
const pageRevDir = path.join(revisionsDir, originalSlug);
const revDir = path.join(pageRevDir, timestamp);
if (!fs.existsSync(revDir)) fs.mkdirSync(revDir, { recursive: true });
fs.writeFileSync(path.join(revDir, "page.md"), fs.readFileSync(originalFilePath, "utf-8"), "utf-8");

// Copy associated section files to backup
try {
  const ym = fs.readFileSync(originalFilePath, "utf-8").match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (ym) {
    const sectionIdMatches = ym[1].match(/sectionId\s*:\s*([a-zA-Z0-9_\-]+)/g);
    if (sectionIdMatches) {
      for (const match of sectionIdMatches) {
        const p = match.split(":");
        if (p.length >= 2) {
          const secId = p[1].trim();
          const secFilePath = path.join(sectionsDir, `${secId}.md`);
          if (fs.existsSync(secFilePath)) {
            fs.copyFileSync(secFilePath, path.join(revDir, `${secId}.md`));
          }
        }
      }
    }
  }
} catch(e) {}

// Clean data and split blocks
const { originalSlug: _, ...cleanedData } = data;
if (cleanedData.blocks) {
  const compiledBlocks = [];
  for (let idx = 0; idx < cleanedData.blocks.length; idx++) {
    const block = cleanedData.blocks[idx];
    let sectionId = block.sectionId;
    
    // Write section file back
    const sectionContentData = { type: block.type };
    for (const [k, v] of Object.entries(block)) {
      if (k === "type" || k === "sectionId") continue;
      sectionContentData[k] = v;
    }
    const sectionFilePath = path.join(sectionsDir, `${sectionId}.md`);
    fs.writeFileSync(sectionFilePath, `---\n${stringify(sectionContentData)}---\n`, "utf-8");

    compiledBlocks.push({ type: block.type, sectionId });
  }
  cleanedData.blocks = compiledBlocks;
}

cleanedData.lastUpdated = new Date().toISOString();
const finalFileContent = `---\n${stringify(cleanedData)}---\n\n${cleanedData.body || ""}`;
fs.writeFileSync(newFilePath, finalFileContent, "utf-8");

console.log("2. Successfully ran PUT simulation.");

// Verify status in final file
const verifyContent = fs.readFileSync(testFile, "utf-8");
const verifyData = parse(verifyContent.split(/^---$/m)[1]);
console.log("3. Verified status is:", verifyData.status);

// Clean up everything
fs.unlinkSync(testFile);
fs.unlinkSync(path.join(sectionsDir, "test-put-banner.md"));
fs.rmSync(pageRevDir, { recursive: true, force: true });
console.log("4. Cleaned up files.");
