import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";

const pagesDir = path.resolve("src/content/pages");
const testSlug = "test-temp-page";
const testFile = path.join(pagesDir, `${testSlug}.md`);

// 1. Create a dummy page
const content = `---
title: Test Temp Page
slug: ${testSlug}
status: published
blocks:
  - type: home_banner
    sectionId: temp-banner-section
lastUpdated: ${new Date().toISOString()}
---
`;

fs.writeFileSync(testFile, content, "utf-8");
console.log("Created test page file at:", testFile);

// 2. Read the page to simulate action=get
const readContent = fs.readFileSync(testFile, "utf-8");
const parts = readContent.split(/^---$/m);
const pageData = parse(parts[1]);
pageData.status = "trash"; // Set to trash
pageData.originalSlug = testSlug;
pageData.body = "";

// Send mock fetch to PUT endpoint (we'll run the backend API function by calling it or mocking the request)
console.log("Mocked page data for PUT status change to trash:", pageData);

// Clean up
if (fs.existsSync(testFile)) {
  fs.unlinkSync(testFile);
  console.log("Cleaned up test page.");
}
