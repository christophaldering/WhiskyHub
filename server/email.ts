import { log } from "./index";
import { google } from "googleapis";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

// Gmail integration via Replit connector
let connectionSettings: any;

async function getAccessToken(): Promise<string | null> {
  try {
    if (
      connectionSettings &&
      connectionSettings.settings?.expires_at &&
      new Date(connectionSettings.settings.expires_at).getTime() > Date.now()
    ) {
      return connectionSettings.settings.access_token;
    }

    const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
    const xReplitToken = process.env.REPL_IDENTITY
      ? "repl " + process.env.REPL_IDENTITY
      : process.env.WEB_REPL_RENEWAL
        ? "depl " + process.env.WEB_REPL_RENEWAL
        : null;

    if (!hostname || !xReplitToken) {
      return null;
    }

    const resp = await fetch(
      "https://" +
        hostname +
        "/api/v2/connection?include_secrets=true&connector_names=google-mail",
      {
        headers: {
          Accept: "application/json",
          X_REPLIT_TOKEN: xReplitToken,
        },
      }
    );
    const data = await resp.json();
    connectionSettings = data.items?.[0];

    const accessToken =
      connectionSettings?.settings?.access_token ||
      connectionSettings?.settings?.oauth?.credentials?.access_token;

    if (!connectionSettings || !accessToken) {
      return null;
    }
    return accessToken;
  } catch (e) {
    log("Failed to get Gmail access token: " + (e as Error).message, "email");
    return null;
  }
}

async function getGmailClient() {
  const accessToken = await getAccessToken();
  if (!accessToken) return null;

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });

  return google.gmail({ version: "v1", auth: oauth2Client });
}

export async function warmupGmailToken(): Promise<void> {
  try {
    const token = await getAccessToken();
    if (token) {
      console.log("Gmail token pre-fetched successfully");
    }
  } catch {
  }
}

export function isSmtpConfigured(): boolean {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY || process.env.WEB_REPL_RENEWAL;
  return !!(hostname && xReplitToken);
}

function buildRawEmail(to: string, subject: string, html: string): string {
  const boundary = "boundary_" + Date.now().toString(36);
  const lines = [
    `To: ${to}`,
    `Subject: =?UTF-8?B?${Buffer.from(subject).toString("base64")}?=`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    Buffer.from(html).toString("base64"),
    "",
    `--${boundary}--`,
  ];
  const raw = lines.join("\r\n");
  return Buffer.from(raw)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const gmail = await getGmailClient();
  if (!gmail) {
    log(`Gmail not connected — skipping email to ${options.to}`, "email");
    return false;
  }

  try {
    const raw = buildRawEmail(options.to, options.subject, options.html);
    await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw },
    });
    log(`Email sent to ${options.to} via Gmail`, "email");
    return true;
  } catch (e) {
    log(
      `Failed to send email to ${options.to}: ${(e as Error).message}`,
      "email"
    );
    return false;
  }
}

export function buildVerificationEmail(params: {
  name: string;
  code: string;
}): { subject: string; html: string } {
  const { name, code } = params;
  const subject = `Your CaskSense verification code: ${code}`;
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:'Georgia',serif;background:#f9f9f7;color:#333;">
  <div style="max-width:520px;margin:40px auto;background:#fff;border:1px solid #e5e5e0;border-radius:4px;overflow:hidden;">
    <div style="padding:32px 32px 16px;border-bottom:1px solid #e5e5e0;">
      <h1 style="margin:0;font-size:24px;color:#4a5568;font-weight:700;letter-spacing:-0.5px;">CaskSense</h1>
      <p style="margin:4px 0 0;font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#a0aec0;">Email Verification</p>
    </div>
    <div style="padding:32px;">
      <p style="font-size:16px;line-height:1.6;margin:0 0 16px;">
        Hello <strong>${name}</strong>,
      </p>
      <p style="font-size:15px;line-height:1.6;margin:0 0 24px;color:#555;">
        Please enter the following code to verify your email address and complete your registration:
      </p>
      <div style="margin:24px 0;padding:20px;background:#fafaf8;border:1px solid #e5e5e0;border-radius:4px;text-align:center;">
        <div style="font-size:36px;font-weight:700;color:#4a5568;letter-spacing:8px;font-family:monospace;">${code}</div>
      </div>
      <p style="font-size:13px;color:#a0aec0;margin:16px 0 0;line-height:1.5;">
        This code expires in 15 minutes. If you didn't request this, you can safely ignore this email.
      </p>
    </div>
    <div style="padding:16px 32px;border-top:1px solid #e5e5e0;background:#fafaf8;">
      <p style="margin:0;font-size:11px;color:#a0aec0;text-align:center;">CaskSense — Where Tasting Becomes Reflection</p>
    </div>
  </div>
</body>
</html>`;
  return { subject, html };
}

export function buildReminderEmail(params: {
  name: string;
  tastingTitle: string;
  tastingDate: string;
  tastingLocation: string;
  offsetMinutes: number;
  language: string;
}): { subject: string; html: string } {
  const { name, tastingTitle, tastingDate, tastingLocation, offsetMinutes, language } = params;
  const isDE = language === "de";

  const timeLabel = offsetMinutes >= 1440
    ? (isDE ? `${Math.round(offsetMinutes / 1440)} Tag(e)` : `${Math.round(offsetMinutes / 1440)} day(s)`)
    : offsetMinutes >= 60
    ? (isDE ? `${Math.round(offsetMinutes / 60)} Stunde(n)` : `${Math.round(offsetMinutes / 60)} hour(s)`)
    : (isDE ? `${offsetMinutes} Minuten` : `${offsetMinutes} minutes`);

  const subject = isDE
    ? `Erinnerung: ${tastingTitle} in ${timeLabel}`
    : `Reminder: ${tastingTitle} in ${timeLabel}`;

  const greeting = isDE ? `Hallo <strong>${name}</strong>,` : `Hello <strong>${name}</strong>,`;
  const body = isDE
    ? `deine Verkostung <strong>${tastingTitle}</strong> beginnt in ${timeLabel}. Hier sind die Details:`
    : `your tasting session <strong>${tastingTitle}</strong> starts in ${timeLabel}. Here are the details:`;
  const dateLabel = isDE ? "Datum" : "Date";
  const locationLabel = isDE ? "Ort" : "Location";
  const footer = isDE ? "Wir freuen uns auf dich!" : "Looking forward to seeing you there!";

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:'Georgia',serif;background:#f9f9f7;color:#333;">
  <div style="max-width:520px;margin:40px auto;background:#fff;border:1px solid #e5e5e0;border-radius:4px;overflow:hidden;">
    <div style="padding:32px 32px 16px;border-bottom:1px solid #e5e5e0;">
      <h1 style="margin:0;font-size:24px;color:#4a5568;font-weight:700;letter-spacing:-0.5px;">CaskSense</h1>
      <p style="margin:4px 0 0;font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#a0aec0;">${isDE ? "Verkostungserinnerung" : "Tasting Reminder"}</p>
    </div>
    <div style="padding:32px;">
      <p style="font-size:16px;line-height:1.6;margin:0 0 16px;">${greeting}</p>
      <p style="font-size:15px;line-height:1.6;margin:0 0 24px;color:#555;">${body}</p>
      <div style="margin:20px 0;padding:16px;background:#fafaf8;border:1px solid #e5e5e0;border-radius:4px;">
        <div style="font-size:18px;font-weight:700;color:#4a5568;margin-bottom:8px;">${tastingTitle}</div>
        <div style="font-size:14px;color:#718096;">${dateLabel}: ${tastingDate}</div>
        <div style="font-size:14px;color:#718096;">${locationLabel}: ${tastingLocation}</div>
      </div>
      <p style="font-size:15px;color:#555;margin:16px 0 0;line-height:1.5;">${footer}</p>
    </div>
    <div style="padding:16px 32px;border-top:1px solid #e5e5e0;background:#fafaf8;">
      <p style="margin:0;font-size:11px;color:#a0aec0;text-align:center;">CaskSense — ${isDE ? "Wo Verkostung zur Reflexion wird" : "Where Tasting Becomes Reflection"}</p>
    </div>
  </div>
</body>
</html>`;

  return { subject, html };
}

export function buildInviteEmail(params: {
  hostName: string;
  tastingTitle: string;
  tastingDate: string;
  tastingLocation: string;
  inviteLink: string;
  personalNote?: string;
}): { subject: string; html: string } {
  const {
    hostName,
    tastingTitle,
    tastingDate,
    tastingLocation,
    inviteLink,
    personalNote,
  } = params;

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

export function buildThankYouEmail(params: {
  hostName: string;
  recipientName: string;
  tastingTitle: string;
  tastingDate: string;
  tastingLocation: string;
  personalMessage: string;
  topRated: { name: string; distillery: string | null; avgScore: number }[];
  recapLink: string;
  language: string;
}): { subject: string; html: string } {
  const { hostName, recipientName, tastingTitle, tastingDate, tastingLocation, personalMessage, topRated, recapLink, language } = params;
  const isDE = language === "de";

  const subject = isDE
    ? `🥃 ${tastingTitle} — Danke & Ergebnisse`
    : `🥃 ${tastingTitle} — Thank You & Results`;

  const medalLabels = ["🥇", "🥈", "🥉"];
  const medalColors = ["#FFD700", "#C0C0C0", "#CD7F32"];

  const podiumRows = topRated.slice(0, 3).map((w, i) => {
    const barWidth = Math.round((w.avgScore / 100) * 100);
    return `
      <tr>
        <td style="padding:6px 8px;font-size:20px;text-align:center;width:36px;">${medalLabels[i]}</td>
        <td style="padding:6px 8px;">
          <div style="font-size:15px;font-weight:700;color:#2d2d30;">${w.name}</div>
          ${w.distillery ? `<div style="font-size:11px;color:#888;">${w.distillery}</div>` : ""}
        </td>
        <td style="padding:6px 8px;width:120px;vertical-align:middle;">
          <div style="background:#f0ece6;border-radius:12px;height:18px;overflow:hidden;">
            <div style="background:linear-gradient(90deg, ${medalColors[i]}, #c8a864);height:100%;width:${barWidth}%;border-radius:12px;"></div>
          </div>
        </td>
        <td style="padding:6px 8px;font-size:16px;font-weight:700;color:#c8a864;text-align:right;width:48px;">${w.avgScore.toFixed(1)}</td>
      </tr>`;
  }).join("");

  const noteBlock = personalMessage.trim()
    ? `<div style="margin:20px 0;padding:14px 18px;background:#f8f7f4;border-left:3px solid #c8a864;border-radius:2px;font-style:italic;color:#555;font-size:14px;line-height:1.6;">"${personalMessage}"<br/><span style="font-style:normal;font-size:12px;color:#888;">— ${hostName}</span></div>`
    : "";

  const greeting = isDE ? `Hallo <strong>${recipientName}</strong>,` : `Hello <strong>${recipientName}</strong>,`;
  const thankText = isDE
    ? `vielen Dank für deine Teilnahme an <strong>${tastingTitle}</strong>! Es war ein wunderbarer Abend, und hier sind die Highlights:`
    : `thank you so much for joining <strong>${tastingTitle}</strong>! It was a wonderful evening, and here are the highlights:`;
  const podiumTitle = isDE ? "🏆 Top 3 des Abends" : "🏆 Top 3 of the Evening";
  const ctaText = isDE ? "Alle Ergebnisse ansehen" : "View All Results";
  const ctaHint = isDE
    ? "Auf der Ergebnisseite findest du das vollständige Ranking, Durchschnittswerte, Teilnehmer-Highlights und kannst alles als PDF herunterladen."
    : "On the results page you'll find the full ranking, averages, participant highlights, and you can download everything as a PDF.";
  const footer = isDE ? "Wo Verkostung zur Reflexion wird" : "Where Tasting Becomes Reflection";

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:'Georgia',serif;background:#f5f3f0;color:#333;">
  <div style="max-width:540px;margin:40px auto;background:#fff;border:1px solid #e5e5e0;border-radius:6px;overflow:hidden;">
    <div style="background:linear-gradient(135deg, #2d2d30 0%, #3d3d42 100%);padding:28px 32px 20px;">
      <h1 style="margin:0;font-size:26px;color:#c8a864;font-weight:700;letter-spacing:-0.5px;">CaskSense</h1>
      <p style="margin:4px 0 0;font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#a0956e;">${isDE ? "Danke & Ergebnisse" : "Thank You & Results"}</p>
    </div>
    <div style="padding:28px 32px;">
      <p style="font-size:16px;line-height:1.6;margin:0 0 8px;">${greeting}</p>
      <p style="font-size:15px;line-height:1.6;margin:0 0 20px;color:#555;">${thankText}</p>
      ${noteBlock}
      <div style="margin:24px 0;padding:20px;background:#fafaf8;border:1px solid #e5e5e0;border-radius:6px;">
        <h3 style="margin:0 0 12px;font-size:16px;color:#2d2d30;">${podiumTitle}</h3>
        <table style="width:100%;border-collapse:collapse;">
          ${podiumRows}
        </table>
      </div>
      <div style="text-align:center;margin:28px 0 16px;">
        <a href="${recapLink}" style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg, #c8a864 0%, #a8845c 100%);color:#fff;text-decoration:none;border-radius:6px;font-size:15px;font-weight:700;letter-spacing:0.5px;">
          ${ctaText}
        </a>
      </div>
      <p style="font-size:12px;color:#a0aec0;margin:12px 0 0;line-height:1.5;text-align:center;">${ctaHint}</p>
    </div>
    <div style="padding:14px 32px;border-top:1px solid #e5e5e0;background:#fafaf8;">
      <p style="margin:0;font-size:11px;color:#a0aec0;text-align:center;">CaskSense — ${footer} · ${tastingDate}${tastingLocation ? ` · ${tastingLocation}` : ""}</p>
    </div>
  </div>
</body>
</html>`;

  return { subject, html };
}
