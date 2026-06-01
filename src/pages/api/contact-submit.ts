import type { APIRoute } from "astro";
import fs from "node:fs";
import path from "node:path";
import { stringify } from "yaml";

export const prerender = false;

// Ensure contacts content collection folder exists
function ensureContactsDir() {
  const contactsDir = path.resolve("src/content/contacts");
  if (!fs.existsSync(contactsDir)) {
    fs.mkdirSync(contactsDir, { recursive: true });
  }
}

export const POST: APIRoute = async ({ request }) => {
  ensureContactsDir();
  try {
    const formData = await request.formData();
    const name = formData.get("name")?.toString().trim() || "";
    const email = formData.get("email")?.toString().trim() || "";
    const subject = formData.get("subject")?.toString().trim() || "";
    const message = formData.get("message")?.toString().trim() || "";

    // Server-side validation
    const errors: Record<string, string> = {};
    if (!name) errors.name = "Full Name is required";
    if (!email) {
      errors.email = "Email address is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Please enter a valid email address";
    }
    if (!subject) errors.subject = "Subject is required";
    if (!message) errors.message = "Message body is required";

    if (Object.keys(errors).length > 0) {
      return new Response(JSON.stringify({ success: false, errors }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const submittedAt = new Date().toISOString();
    const contactData = {
      name,
      email,
      subject,
      message,
      submittedAt
    };

    // 1. Save locally as dynamic markdown content file
    const timestamp = Date.now();
    const filePath = path.resolve("src/content/contacts", `msg-${timestamp}.md`);
    const frontmatter = stringify(contactData);
    const fileContent = `---\n${frontmatter}---\n\n${message}\n`;
    fs.writeFileSync(filePath, fileContent, "utf-8");

    // 2. Dispatch SMTP Notifications (Graceful Fallback Pipeline)
    let emailSent = false;
    let fallbackLogged = false;
    
    try {
      // Try to import nodemailer dynamically if available
      const nodemailerLibName = "nodemailer";
      const nodemailer = await import(nodemailerLibName);
      
      // Look for environment variables, with explicit user production defaults
      const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
      const smtpPort = parseInt(process.env.SMTP_PORT || "465");
      const smtpUser = process.env.SMTP_USER || "techtangence@gmail.com";
      const smtpPass = process.env.SMTP_PASS || "kmubqgrrkaooqkvq";
      const fromEmail = "atul.verma@tangence.com";

      if (smtpHost && smtpUser && smtpPass) {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: { user: smtpUser, pass: smtpPass }
        });

        // Send alert to admin (Atul Verma)
        await transporter.sendMail({
          from: `"Enquiry" <${fromEmail}>`,
          to: fromEmail,
          replyTo: email,
          subject: `New Contact Submission: ${subject}`,
          html: `
            <h3>New Message Received from Tangence Website</h3>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Subject:</strong> ${subject}</p>
            <p><strong>Message:</strong></p>
            <blockquote style="background:#F3F4F6; padding:10px; border-left:4px solid #6366F1;">
              ${message.replace(/\n/g, "<br>")}
            </blockquote>
          `
        });

        // Send confirmation to customer
        await transporter.sendMail({
          from: `"Tangence Support" <${fromEmail}>`,
          to: email,
          subject: `Message Received: ${subject}`,
          html: `
            <p>Dear ${name},</p>
            <p>Thank you for contacting Tangence. We have successfully received your inquiry regarding "<strong>${subject}</strong>".</p>
            <p>Our strategists will review your brief and get back to you within 24 business hours.</p>
            <br>
            <p>Best Regards,</p>
            <p><strong>Tangence Team</strong></p>
          `
        });
        emailSent = true;
      }
    } catch (nodemailerError) {
      // Nodemailer not installed or SMTP auth omitted. Proceed to fallback logging
    }

    if (!emailSent) {
      // Local file mock logging fallback
      const mockLogPath = path.resolve("src/data/email-mock-logs.json");
      const dir = path.dirname(mockLogPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      let logs = [];
      if (fs.existsSync(mockLogPath)) {
        try {
          logs = JSON.parse(fs.readFileSync(mockLogPath, "utf-8"));
        } catch (e) {
          logs = [];
        }
      }

      logs.push({
        to: email,
        subject: `Mock Auto-Reply: ${subject}`,
        timestamp: submittedAt,
        details: contactData
      });

      fs.writeFileSync(mockLogPath, JSON.stringify(logs, null, 2), "utf-8");
      fallbackLogged = true;
    }

    return new Response(JSON.stringify({
      success: true,
      message: "Message received successfully!",
      emailSent,
      fallbackLogged
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
