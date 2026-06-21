import type { APIRoute } from "astro";
import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";

export const prerender = false;

const PRODUCTS_DIR = path.resolve("src/content/products");

function parseMarkdown(content: string) {
  const parts = content.split(/^---$/m);
  if (parts.length < 3) return { data: {}, body: content };
  const yamlStr = parts[1];
  try {
    return { data: parse(yamlStr) || {} };
  } catch (e) {
    return { data: {} };
  }
}

function checkStock(productSlug: string, variantSku: string | null, quantity: number): { available: boolean; currentStock: number; error?: string } {
  const filePath = path.join(PRODUCTS_DIR, `${productSlug}.md`);
  if (!fs.existsSync(filePath)) {
    return { available: false, currentStock: 0, error: "Product not found" };
  }

  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const { data } = parseMarkdown(content);

    if (variantSku) {
      if (!data.variants || !Array.isArray(data.variants)) {
        return { available: false, currentStock: 0, error: "Product has no variants" };
      }
      const variant = data.variants.find((v: any) => v.sku === variantSku);
      if (!variant) {
        return { available: false, currentStock: 0, error: "Variant SKU not found" };
      }
      const stock = variant.stock ?? 0;
      return {
        available: stock >= quantity,
        currentStock: stock,
        error: stock >= quantity ? undefined : `Only ${stock} unit(s) of this variant are in stock.`
      };
    } else {
      const stock = data.stock ?? 0;
      return {
        available: stock >= quantity,
        currentStock: stock,
        error: stock >= quantity ? undefined : `Only ${stock} unit(s) of this product are in stock.`
      };
    }
  } catch {
    return { available: false, currentStock: 0, error: "Error checking stock" };
  }
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { items } = body; // Array of { productSlug, variantSku, quantity }

    if (!Array.isArray(items)) {
      return new Response(JSON.stringify({ success: false, error: "Items array is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const validations = items.map(item => {
      const check = checkStock(item.productSlug, item.variantSku || null, item.quantity);
      return {
        productSlug: item.productSlug,
        variantSku: item.variantSku || null,
        requestedQuantity: item.quantity,
        currentStock: check.currentStock,
        available: check.available,
        error: check.error
      };
    });

    const allAvailable = validations.every(v => v.available);

    return new Response(JSON.stringify({
      success: allAvailable,
      validations
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
