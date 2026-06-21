// File-based storage — not safe for high-concurrency/high-traffic scenarios. Migrate to a real database (Postgres/SQLite via Astro DB) if order volume grows significantly.

import fs from 'node:fs';
import path from 'node:path';
import { parse, stringify } from 'yaml';
import { enqueueWrite } from './file-write-queue';

const PRODUCTS_DIR = path.resolve('src/content/products');

function ensureDir() {
  if (!fs.existsSync(PRODUCTS_DIR)) {
    fs.mkdirSync(PRODUCTS_DIR, { recursive: true });
  }
}

function parseMarkdown(content: string) {
  const parts = content.split(/^---$/m);
  if (parts.length < 3) return { data: {}, body: content };
  const yamlStr = parts[1];
  const body = parts.slice(2).join('---').trim();
  try {
    return { data: parse(yamlStr) || {}, body };
  } catch (e) {
    console.error('YAML Parse error:', e);
    return { data: {}, body };
  }
}

function stringifyMarkdown(data: any, body = '') {
  data.updatedDate = new Date().toISOString();
  const yamlStr = stringify(data);
  return `---\n${yamlStr}---\n\n${body}`;
}

/**
 * Adjusts product stock in a thread-safe / sequential queue execution.
 * To decrement stock, pass a positive quantityToDecrement.
 * To increment stock (e.g. on refund), pass a negative number.
 */
export function adjustProductStock(productSlug: string, variantSku: string | null, quantityToDecrement: number): Promise<void> {
  const filePath = path.join(PRODUCTS_DIR, `${productSlug}.md`);
  
  return enqueueWrite(filePath, () => {
    ensureDir();
    if (!fs.existsSync(filePath)) {
      throw new Error(`Product not found: ${productSlug}`);
    }
    
    const content = fs.readFileSync(filePath, 'utf-8');
    const { data, body } = parseMarkdown(content);
    
    if (variantSku) {
      if (!data.variants || !Array.isArray(data.variants)) {
        throw new Error(`Product ${productSlug} has no variants, but variant SKU ${variantSku} was specified.`);
      }
      const variant = data.variants.find((v: any) => v.sku === variantSku);
      if (!variant) {
        throw new Error(`Variant SKU ${variantSku} not found in product ${productSlug}.`);
      }
      const currentStock = variant.stock ?? 0;
      if (currentStock < quantityToDecrement) {
        console.warn(`Variant ${variantSku} has insufficient stock (available: ${currentStock}, requested: ${quantityToDecrement}). Setting stock to 0.`);
        variant.stock = 0;
      } else {
        variant.stock = currentStock - quantityToDecrement;
      }
    } else {
      // Main product stock
      const currentStock = data.stock ?? 0;
      if (currentStock < quantityToDecrement) {
        console.warn(`Product ${productSlug} has insufficient stock (available: ${currentStock}, requested: ${quantityToDecrement}). Setting stock to 0.`);
        data.stock = 0;
      } else {
        data.stock = currentStock - quantityToDecrement;
      }
    }
    
    const newContent = stringifyMarkdown(data, body);
    fs.writeFileSync(filePath, newContent, 'utf-8');
  });
}
