const fs = require('fs');
const path = require('path');
const { parse } = require('yaml');

const PRODUCTS_DIR = path.resolve("src/content/products");
const CATEGORIES_PATH = path.resolve("src/data/product-categories.json");

console.log("PRODUCTS_DIR:", PRODUCTS_DIR);
console.log("Exists:", fs.existsSync(PRODUCTS_DIR));

if (fs.existsSync(PRODUCTS_DIR)) {
  const files = fs.readdirSync(PRODUCTS_DIR).filter(f => f.endsWith(".md"));
  console.log("Found files:", files);
  
  for (const file of files) {
    const filePath = path.join(PRODUCTS_DIR, file);
    const content = fs.readFileSync(filePath, "utf-8");
    const parts = content.split(/^---$/m);
    console.log(`\nFile: ${file}`);
    console.log("Parts length:", parts.length);
    if (parts.length >= 3) {
      try {
        const data = parse(parts[1]) || {};
        console.log("Name:", data.name);
        console.log("Status:", data.status);
        console.log("Category:", data.category);
      } catch (err) {
        console.error("Parse error:", err.message);
      }
    }
  }
}
