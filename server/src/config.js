// Liest die Einstellungen aus Umgebungsvariablen (Datei .env, siehe .env.example).
import fs from "node:fs";

export function loadDotEnv(file = ".env") {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m || process.env[m[1]] !== undefined) continue;
    process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, "$2");
  }
}

export function configFromEnv(env = process.env) {
  const list = (v) => String(v || "").split(",").map((s) => s.trim()).filter(Boolean);
  return {
    port: Number(env.PORT || 3000),
    trustProxy: env.TRUST_PROXY === "1",
    publicBaseUrl: String(env.PUBLIC_BASE_URL || "").replace(/\/$/, ""),
    allowedOrigins: list(env.ALLOWED_ORIGINS || "https://samsam-tech.de,https://www.samsam-tech.de"),
    dataDir: env.DATA_DIR || "./data",
    dataKey: env.DATA_KEY,
    retentionDays: Number(env.RETENTION_DAYS || 180),
    siteName: env.SITE_NAME || "Samsam-Tech",
    admin: {
      user: env.ADMIN_USER || "admin",
      passwordHash: env.ADMIN_PASSWORD_HASH,
      totpSecret: env.ADMIN_TOTP_SECRET,
    },
    whatsapp: {
      token: env.WA_TOKEN,
      phoneNumberId: env.WA_PHONE_NUMBER_ID,
      to: String(env.WA_TO || "").replace(/\D/g, ""),
      templateName: env.WA_TEMPLATE_NAME || "",
      templateLang: env.WA_TEMPLATE_LANG || "de",
      apiVersion: env.WA_API_VERSION || "v21.0",
    },
    mail: {
      host: env.SMTP_HOST,
      port: Number(env.SMTP_PORT || 465),
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
      from: env.SMTP_FROM,
      to: env.NOTIFY_EMAIL_TO,
    },
    calls: {
      webhookToken: env.SIPGATE_WEBHOOK_TOKEN,
      notifyOn: env.CALL_NOTIFY_ON === "all" ? "all" : "missed",
    },
  };
}

export function assertConfig(c) {
  const missing = [];
  if (!c.dataKey) missing.push("DATA_KEY");
  if (!c.admin.passwordHash) missing.push("ADMIN_PASSWORD_HASH");
  if (!c.admin.totpSecret) missing.push("ADMIN_TOTP_SECRET");
  if (missing.length) {
    throw new Error(`Fehlende Einstellungen: ${missing.join(", ")} – bitte \`npm run setup\` ausführen und in .env eintragen.`);
  }
}
