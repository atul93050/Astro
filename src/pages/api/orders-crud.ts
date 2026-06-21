import type { APIRoute } from "astro";
import fs from "node:fs";
import path from "node:path";
import { parse, stringify } from "yaml";
import { getPaymentGateway } from "../../lib/payment-gateway";
import { adjustProductStock } from "../../lib/stock-management";
import { enqueueWrite } from "../../lib/file-write-queue";

export const prerender = false;

const ORDERS_DIR = path.resolve("src/content/orders");
const SESSION_TOKEN = "authenticated-admin-session-2026";

function unauthorized() {
  return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function ensureDir() {
  if (!fs.existsSync(ORDERS_DIR)) {
    fs.mkdirSync(ORDERS_DIR, { recursive: true });
  }
}

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

function listOrders(filters: { search?: string; status?: string }): any[] {
  ensureDir();
  const files = fs.readdirSync(ORDERS_DIR).filter(f => f.endsWith(".md"));
  let orders = files.map(file => {
    const filePath = path.join(ORDERS_DIR, file);
    const content = fs.readFileSync(filePath, "utf-8");
    const { data } = parseMarkdown(content);
    return {
      ...data,
      id: data.id || path.basename(file, ".md")
    };
  });

  if (filters.status && filters.status !== "all") {
    orders = orders.filter(o => o.status === filters.status);
  }
  if (filters.search) {
    const q = filters.search.toLowerCase();
    orders = orders.filter(o =>
      (o.id || "").toLowerCase().includes(q) ||
      (o.customer?.name || "").toLowerCase().includes(q) ||
      (o.customer?.email || "").toLowerCase().includes(q)
    );
  }

  orders.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  return orders;
}

export const GET: APIRoute = async ({ url, cookies }) => {
  const session = cookies.get("cms_session")?.value;
  if (session !== SESSION_TOKEN) return unauthorized();
  ensureDir();

  const action = url.searchParams.get("action") || "list";
  const id = url.searchParams.get("id") || "";

  try {
    if (action === "list") {
      const orders = listOrders({
        status: url.searchParams.get("status") || "all",
        search: url.searchParams.get("search") || "",
      });
      return jsonResponse({ success: true, orders });
    }

    if (action === "get") {
      if (!id) return jsonResponse({ success: false, error: "Order ID required" }, 400);
      const filePath = path.join(ORDERS_DIR, `${id}.md`);
      if (!fs.existsSync(filePath)) return jsonResponse({ success: false, error: "Order not found" }, 404);
      const content = fs.readFileSync(filePath, "utf-8");
      const { data, body } = parseMarkdown(content);
      return jsonResponse({ success: true, order: data, body });
    }

    return jsonResponse({ success: false, error: "Invalid action" }, 400);
  } catch (e: any) {
    return jsonResponse({ success: false, error: e.message }, 500);
  }
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const session = cookies.get("cms_session")?.value;
  if (session !== SESSION_TOKEN) return unauthorized();
  ensureDir();

  try {
    const data = await request.json();
    const action = data.action;

    if (action === "refund") {
      const id = data.id;
      if (!id) return jsonResponse({ success: false, error: "Order ID required" }, 400);

      const filePath = path.join(ORDERS_DIR, `${id}.md`);
      if (!fs.existsSync(filePath)) return jsonResponse({ success: false, error: "Order not found" }, 404);

      const content = fs.readFileSync(filePath, "utf-8");
      const { data: orderData, body } = parseMarkdown(content);

      if (orderData.status !== "paid" && orderData.status !== "shipped" && orderData.status !== "delivered") {
        return jsonResponse({ success: false, error: "Only paid, shipped, or delivered orders can be refunded." }, 400);
      }

      if (!orderData.transactionId) {
        // If it's a mock checkout or has no transaction ID, we can do a mock refund
        if (orderData.gateway !== "mock") {
          return jsonResponse({ success: false, error: "Order lacks a transaction ID for refunding on the gateway." }, 400);
        }
      }

      // Call payment gateway refund API
      const gateway = getPaymentGateway();
      const refundResult = await gateway.refundOrder(orderData.transactionId || "mock-tx", orderData.totalAmount);

      if (!refundResult.success) {
        return jsonResponse({ success: false, error: "Payment gateway refund failed." }, 400);
      }

      // Restock items (increment stock back by passing negative decrement)
      if (Array.isArray(orderData.items)) {
        for (const item of orderData.items) {
          try {
            await adjustProductStock(item.productSlug, item.variantSku || null, -item.quantity);
          } catch (stockErr: any) {
            console.error(`Restock on refund failed for ${item.productSlug}:`, stockErr);
          }
        }
      }

      orderData.status = "refunded";
      if (refundResult.refundId) {
        orderData.refundId = refundResult.refundId;
      }

      const newContent = stringifyMarkdown(orderData, body);
      await enqueueWrite(filePath, () => {
        fs.writeFileSync(filePath, newContent, "utf-8");
      });

      return jsonResponse({ success: true, message: "Order refunded and restocked successfully!", order: orderData });
    }

    return jsonResponse({ success: false, error: "Invalid action" }, 400);
  } catch (e: any) {
    return jsonResponse({ success: false, error: e.message }, 500);
  }
};

export const PUT: APIRoute = async ({ request, cookies }) => {
  const session = cookies.get("cms_session")?.value;
  if (session !== SESSION_TOKEN) return unauthorized();
  ensureDir();

  try {
    const data = await request.json();
    const id = data.id;
    if (!id) return jsonResponse({ success: false, error: "Order ID required" }, 400);

    const filePath = path.join(ORDERS_DIR, `${id}.md`);
    if (!fs.existsSync(filePath)) return jsonResponse({ success: false, error: "Order not found" }, 404);

    const content = fs.readFileSync(filePath, "utf-8");
    const { data: orderData, body } = parseMarkdown(content);

    // Update status manually (e.g. Paid -> Shipped -> Delivered)
    if (data.status) {
      orderData.status = data.status;
    }

    const newContent = stringifyMarkdown(orderData, body);
    await enqueueWrite(filePath, () => {
      fs.writeFileSync(filePath, newContent, "utf-8");
    });

    return jsonResponse({ success: true, message: "Order updated successfully!", order: orderData });
  } catch (e: any) {
    return jsonResponse({ success: false, error: e.message }, 500);
  }
};
