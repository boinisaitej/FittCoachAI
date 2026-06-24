import nodemailer from "nodemailer";
import { env } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/server";

let _transport: nodemailer.Transporter | null = null;

function getTransport() {
  if (env.MAIL_ENABLED !== "1") return null;
  if (_transport) return _transport;
  if (!env.SMTP_HOST) return null;
  _transport = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: parseInt(env.SMTP_PORT ?? "587", 10),
    secure: false,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  });
  return _transport;
}

export type EmailTemplate =
  | "welcome"
  | "plan_assigned"
  | "plan_extended"
  | "invoice"
  | "report"
  | "announcement"
  | "password_reset";

export async function sendEmail(args: {
  to: string;
  subject: string;
  template: EmailTemplate;
  html: string;
  text?: string;
  meta?: Record<string, unknown>;
}) {
  const transport = getTransport();
  const supabase = createServiceClient();
  const logRow = {
    recipient_email: args.to,
    subject: args.subject,
    template: args.template,
    status: "queued" as string,
    error: null as string | null,
  };

  if (!transport) {
    // Dev fallback — log and persist as "console".
    console.info(`[email:dev] to=${args.to} subject=${args.subject} template=${args.template}`);
    await supabase.from("email_log").insert({ ...logRow, status: "console" });
    return { ok: true, dev: true };
  }

  try {
    const info = await transport.sendMail({
      from: env.MAIL_FROM ?? "FitCoachAI <noreply@fitcoach.ai>",
      to: args.to,
      subject: args.subject,
      html: args.html,
      text: args.text,
    });
    await supabase
      .from("email_log")
      .insert({ ...logRow, status: "sent", provider_msg_id: info.messageId });
    return { ok: true, dev: false, messageId: info.messageId };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await supabase.from("email_log").insert({ ...logRow, status: "error", error: msg });
    return { ok: false, error: msg };
  }
}

// --------------------------- templates ---------------------------

const baseHtml = (title: string, body: string) => `
<!doctype html>
<html><body style="font-family:Inter,system-ui,sans-serif;background:#f6f7f9;margin:0;padding:24px;">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #e6e8eb;">
  <div style="background:linear-gradient(135deg,#22c55e,#10b981);color:#fff;padding:20px 24px;font-weight:700;font-size:18px;">
    FitCoachAI
  </div>
  <div style="padding:24px;color:#1f2937;font-size:14px;line-height:1.6;">
    <h2 style="margin:0 0 12px;font-size:20px;">${title}</h2>
    ${body}
  </div>
  <div style="padding:14px 24px;background:#fafbfc;color:#6b7280;font-size:12px;text-align:center;border-top:1px solid #eef0f3;">
    Sent by FitCoachAI · Reply to this email and your gym owner will see it.
  </div>
</div></body></html>`;

export const Templates = {
  welcome: (args: { name: string; email: string; tempPassword?: string; gym: string; loginUrl: string }) =>
    baseHtml(
      `Welcome to ${args.gym}, ${args.name}!`,
      `
      <p>Your account on FitCoachAI is ready.</p>
      <table style="background:#f1f5f9;border-radius:8px;padding:12px;margin:12px 0;">
        <tr><td><b>Email</b></td><td>${args.email}</td></tr>
        ${args.tempPassword ? `<tr><td><b>Temp password</b></td><td><code>${args.tempPassword}</code></td></tr>` : ""}
      </table>
      <p><a href="${args.loginUrl}" style="display:inline-block;background:#22c55e;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600;">Open FitCoachAI</a></p>
      ${args.tempPassword ? `<p style="color:#9ca3af;font-size:12px;">You'll be asked to change this password on your first sign-in.</p>` : ""}
      `
    ),
  plan_assigned: (args: { name: string; plan: string; endDate: string; appUrl: string }) =>
    baseHtml(
      "Your plan is active",
      `
      <p>Hi ${args.name},</p>
      <p>Your <b>${args.plan}</b> plan is now active until <b>${args.endDate}</b>.</p>
      <p><a href="${args.appUrl}" style="color:#22c55e;font-weight:600;">View your dashboard →</a></p>
      `
    ),
  announcement: (args: { title: string; body: string; appUrl: string }) =>
    baseHtml(args.title, `<p>${args.body.replace(/\n/g, "<br>")}</p><p><a href="${args.appUrl}">Open FitCoachAI</a></p>`),
  invoice: (args: { name: string; invoiceNumber: string; amount: string; pdfUrl?: string }) =>
    baseHtml(
      "Invoice issued",
      `<p>Hi ${args.name},</p>
       <p>Invoice <b>${args.invoiceNumber}</b> for <b>${args.amount}</b> has been issued.</p>
       ${args.pdfUrl ? `<p><a href="${args.pdfUrl}">Download PDF</a></p>` : ""}`
    ),
  report: (args: { name: string; adherence: number; summary: string; appUrl: string }) =>
    baseHtml(
      "Your weekly progress report",
      `<p>Hi ${args.name},</p>
       <p><b>Adherence:</b> ${args.adherence}%</p>
       <p>${args.summary}</p>
       <p><a href="${args.appUrl}">Open dashboard</a></p>`
    ),
};
