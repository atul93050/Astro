import type { APIRoute } from "astro";
import fs from "node:fs";
import path from "node:path";
import { parse, stringify } from "yaml";
import { getPaymentGateway } from "../../../lib/payment-gateway";
import { enqueueWrite } from "../../../lib/file-write-queue";

export const prerender = false;

const PRODUCTS_DIR = path.resolve("src/content/products");
const ORDERS_DIR = path.resolve("src/content/orders");

function ensureDirs() {
  if (!fs.existsSync(ORDERS_DIR)) {
    fs.mkdirSync(ORDERS_DIR, { recursive: true });
  }
}

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

function checkStockHard(productSlug: string, variantSku: string | null, quantity: number): boolean {
  const filePath = path.join(PRODUCTS_DIR, `${productSlug}.md`);
  if (!fs.existsSync(filePath)) return false;
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const { data } = parseMarkdown(content);
    if (variantSku) {
      const variant = data.variants?.find((v: any) => v.sku === variantSku);
      return variant && (variant.stock ?? 0) >= quantity;
    } else {
      return (data.stock ?? 0) >= quantity;
    }
  } catch {
    return false;
  }
}

export const POST: APIRoute = async ({ request, url }) => {
  ensureDirs();

  try {
    const body = await request.json();
    const { items, customer } = body; 
    // items: Array of { productSlug, variantSku, label, quantity, price }
    // customer: { name, email, phone }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ success: false, error: "Items are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (!customer || !customer.name || !customer.email) {
      return new Response(JSON.stringify({ success: false, error: "Customer details are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Hard check stock
    for (const item of items) {
      const isAvailable = checkStockHard(item.productSlug, item.variantSku || null, item.quantity);
      if (!isAvailable) {
        return new Response(JSON.stringify({
          success: false,
          error: `Stock check failed: "${item.label}" is no longer available in the requested quantity.`
        }), {
          status: 409,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    // Generate unique order ID
    const orderId = `order_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const orderFrontmatter = {
      id: orderId,
      status: "pending",
      gateway: process.env.PAYMENT_PROVIDER || "mock",
      gatewaySessionId: "",
      transactionId: "",
      totalAmount,
      customer,
      items,
      createdAt: new Date().toISOString(),
      updatedDate: new Date().toISOString()
    };

    const orderFilePath = path.join(ORDERS_DIR, `${orderId}.md`);

    // Write pending order file
    const fileContent = `---\n${stringify(orderFrontmatter)}---\n\nOrder created via Checkout.`;
    await enqueueWrite(orderFilePath, () => {
      fs.writeFileSync(orderFilePath, fileContent, "utf-8");
    });

    // Create payment gateway session
    const origin = url.origin;
    const gateway = getPaymentGateway();
    const session = await gateway.createCheckoutSession(orderFrontmatter, items, origin);

    // Update order session ID
    orderFrontmatter.gatewaySessionId = session.id;
    const updatedContent = `---\n${stringify(orderFrontmatter)}---\n\nOrder created via Checkout.`;
    await enqueueWrite(orderFilePath, () => {
      fs.writeFileSync(orderFilePath, updatedContent, "utf-8");
    });

    return new Response(JSON.stringify({
      success: true,
      orderId,
      checkoutUrl: session.url,
      gatewaySessionId: session.id
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (e: any) {
    console.error("Checkout session creation error:", e);
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
