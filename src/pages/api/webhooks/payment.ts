// File-based storage — not safe for high-concurrency/high-traffic scenarios. Migrate to a real database (Postgres/SQLite via Astro DB) if order volume grows significantly.

import type { APIRoute } from "astro";
import fs from "node:fs";
import path from "node:path";
import { parse, stringify } from "yaml";
import { getPaymentGateway } from "../../../lib/payment-gateway";
import { adjustProductStock } from "../../../lib/stock-management";
import { enqueueWrite } from "../../../lib/file-write-queue";

export const prerender = false;

const ORDERS_DIR = path.resolve("src/content/orders");

function parseMarkdown(content: string) {
  const parts = content.split(/^---$/m);
  if (parts.length < 3) return { data: {}, body: content };
  const yamlStr = parts[1];
  const body = parts.slice(2).join("---").trim();
  try {
    return { data: parse(yamlStr) || {}, body };
  } catch (e) {
    return { data: {}, body };
  }
}

function stringifyMarkdown(data: any, body = "") {
  data.updatedDate = new Date().toISOString();
  const yamlStr = stringify(data);
  return `---\n${yamlStr}---\n\n${body}`;
}

export const POST: APIRoute = async ({ request }) => {
  const rawBody = await request.text();
  const headersObj: Record<string, string> = {};
  request.headers.forEach((value, name) => {
    headersObj[name.toLowerCase()] = value;
  });

  // Get signature based on provider header
  const stripeSig = headersObj["stripe-signature"] || "";
  const razorpaySig = headersObj["x-razorpay-signature"] || "";
  const signature = stripeSig || razorpaySig || headersObj["x-signature"] || "";

  try {
    const gateway = getPaymentGateway();
    const result = await gateway.verifyWebhook(rawBody, signature, headersObj);

    if (!result.success || !result.orderId) {
      console.warn("Webhook verification failed or no order ID returned.");
      return new Response(JSON.stringify({ success: false, error: "Invalid webhook signature or payload" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const orderFilePath = path.join(ORDERS_DIR, `${result.orderId}.md`);
    if (!fs.existsSync(orderFilePath)) {
      console.error(`Order file not found: ${result.orderId}`);
      return new Response(JSON.stringify({ success: false, error: "Order not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Process order update in sequential queue
    let processError: any = null;
    await enqueueWrite(orderFilePath, async () => {
      const content = fs.readFileSync(orderFilePath, "utf-8");
      const { data, body } = parseMarkdown(content);

      // Idempotency: skip if already processed
      if (data.status === "paid" || data.status === "refunded") {
        console.log(`Order ${result.orderId} is already ${data.status}. Skipping webhook processing.`);
        return;
      }

      data.status = result.status;
      if (result.transactionId) {
        data.transactionId = result.transactionId;
      }
      data.updatedDate = new Date().toISOString();

      const newContent = stringifyMarkdown(data, body);
      fs.writeFileSync(orderFilePath, newContent, "utf-8");

      // Decrement stock only if order is paid
      if (result.status === "paid" && Array.isArray(data.items)) {
        for (const item of data.items) {
          try {
            await adjustProductStock(item.productSlug, item.variantSku || null, item.quantity);
            console.log(`Successfully decremented stock for ${item.productSlug} (Variant: ${item.variantSku || 'none'}), Qty: ${item.quantity}`);
          } catch (stockErr: any) {
            console.error(`Failed to adjust stock for product ${item.productSlug}: ${stockErr.message}`);
          }
        }
      }
    });

    if (processError) throw processError;

    return new Response(JSON.stringify({ success: true, message: "Webhook processed successfully" }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (e: any) {
    console.error("Webhook processing error:", e);
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
