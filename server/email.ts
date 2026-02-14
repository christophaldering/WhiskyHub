import { log } from "./index";
import nodemailer from "nodemailer";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  try {
    transporter = nodemailer.createTransport({
      host,
      port: parseInt(port || "587", 10),
      secure: parseInt(port || "587", 10) === 465,
      auth: { user, pass },
    });
    log("SMTP transport configured", "email");
    return transporter;
  } catch (e) {
    log("Failed to configure SMTP transport: " + (e as Error).message, "email");
    return null;
  }
}

export function isSmtpConfigured(): boolean {
  const t = getTransporter();
  return t !== null;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const t = getTransporter();
  if (!t) {
    log(`SMTP not configured — skipping email to ${options.to}`, "email");
    return false;
  }

  try {
    const fromName = process.env.SMTP_FROM_NAME || "CaskSense";
    const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || "noreply@casksense.app";
    await t.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
    log(`Email sent to ${options.to}`, "email");
    return true;
  } catch (e) {
    log(`Failed to send email to ${options.to}: ${(e as Error).message}`, "email");
    return false;
  }
}

export function buildInviteEmail(params: {
  hostName: string;
  tastingTitle: string;
  tastingDate: string;
  tastingLocation: string;
  inviteLink: string;
  personalNote?: string;
}): { subject: string; html: string } {
  const { hostName, tastingTitle, tastingDate, tastingLocation, inviteLink, personalNote } = params;

  const subject = `You're invited: ${tastingTitle} — CaskSense`;

  const noteBlock = personalNote
    ? `<div style="margin:16px 0;padding:12px 16px;background:#f8f7f4;border-left:3px solid #6b7b8d;border-radius:2px;font-style:italic;color:#555;">"${personalNote}"<br/><span style="font-style:normal;font-size:12px;color:#888;">— ${hostName}</span></div>`
    : "";

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:'Georgia',serif;background:#f9f9f7;color:#333;">
  <div style="max-width:520px;margin:40px auto;background:#fff;border:1px solid #e5e5e0;border-radius:4px;overflow:hidden;">
    <div style="padding:32px 32px 16px;border-bottom:1px solid #e5e5e0;">
      <h1 style="margin:0;font-size:24px;color:#4a5568;font-weight:700;letter-spacing:-0.5px;">CaskSense</h1>
      <p style="margin:4px 0 0;font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#a0aec0;">The Art of Whisky Analysis</p>
    </div>
    <div style="padding:32px;">
      <p style="font-size:16px;line-height:1.6;margin:0 0 16px;">
        <strong>${hostName}</strong> has invited you to a whisky tasting session.
      </p>
      <div style="margin:20px 0;padding:16px;background:#fafaf8;border:1px solid #e5e5e0;border-radius:4px;">
        <div style="font-size:18px;font-weight:700;color:#4a5568;margin-bottom:8px;">${tastingTitle}</div>
        <div style="font-size:14px;color:#718096;">${tastingDate} · ${tastingLocation}</div>
      </div>
      ${noteBlock}
      <a href="${inviteLink}" style="display:inline-block;margin:24px 0 16px;padding:12px 32px;background:#4a5568;color:#fff;text-decoration:none;border-radius:3px;font-size:14px;font-weight:600;letter-spacing:0.5px;">
        Accept Invitation
      </a>
      <p style="font-size:12px;color:#a0aec0;margin:16px 0 0;line-height:1.5;">
        Or copy this link:<br/>
        <a href="${inviteLink}" style="color:#6b7b8d;word-break:break-all;">${inviteLink}</a>
      </p>
    </div>
    <div style="padding:16px 32px;border-top:1px solid #e5e5e0;background:#fafaf8;">
      <p style="margin:0;font-size:11px;color:#a0aec0;text-align:center;">CaskSense — Intimate whisky tasting circles</p>
    </div>
  </div>
</body>
</html>`;

  return { subject, html };
}
