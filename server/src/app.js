// HTTP-Logik: Kontaktformular, Admin-Bereich und sipgate-Webhook für Anrufe.
import { verifyPassword, verifyTotp, safeEqual, randomToken } from "./security.js";
import { notifySafely } from "./notify.js";
import { loginPage, dashboardPage, inquiryPage, page, esc } from "./views.js";

const MAX_BODY = 32 * 1024;
const SESSION_MS = 8 * 60 * 60 * 1000;

class RateLimiter {
  constructor(limit, windowMs, now) {
    this.limit = limit;
    this.windowMs = windowMs;
    this.now = now;
    this.hits = new Map();
  }
  hit(key) {
    const t = this.now();
    const arr = (this.hits.get(key) || []).filter((x) => t - x < this.windowMs);
    arr.push(t);
    this.hits.set(key, arr);
    return arr.length <= this.limit;
  }
  count(key) {
    const t = this.now();
    return (this.hits.get(key) || []).filter((x) => t - x < this.windowMs).length;
  }
  reset(key) {
    this.hits.delete(key);
  }
}

export function formatNumber(raw) {
  const s = String(raw || "").trim();
  if (!s || /anonymous|unknown/i.test(s)) return "unbekannt (Rufnummer unterdrückt)";
  const digits = s.replace(/\D/g, "");
  return digits ? `+${digits}` : s;
}

const clock = (d) => new Intl.DateTimeFormat("de-DE", { timeStyle: "short", timeZone: "Europe/Berlin" }).format(d);

export function createApp({ config, store, notifier, log = console, now = () => Date.now() }) {
  const sessions = new Map();
  const contactLimiter = new RateLimiter(5, 10 * 60 * 1000, now);
  const loginLimiter = new RateLimiter(5, 15 * 60 * 1000, now);
  const pendingCalls = new Map();
  const secureCookie = config.publicBaseUrl.startsWith("https://");

  /* ---------- Hilfsfunktionen ---------- */

  const clientIp = (req) =>
    (config.trustProxy && String(req.headers["x-forwarded-for"] || "").split(",")[0].trim()) || req.socket.remoteAddress || "?";

  function send(res, status, body, headers = {}) {
    res.writeHead(status, {
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      ...headers,
    });
    res.end(body);
  }

  const json = (res, status, obj, extra = {}) =>
    send(res, status, JSON.stringify(obj), { "Content-Type": "application/json; charset=utf-8", ...extra });

  const html = (res, status, body, extra = {}) =>
    send(res, status, body, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Frame-Options": "DENY",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
      ...extra,
    });

  const redirect = (res, to, extra = {}) => send(res, 303, "", { Location: to, "Cache-Control": "no-store", ...extra });

  function readBody(req) {
    return new Promise((resolve, reject) => {
      let size = 0;
      const chunks = [];
      req.on("data", (c) => {
        size += c.length;
        if (size > MAX_BODY) {
          reject(Object.assign(new Error("zu groß"), { status: 413 }));
          req.destroy();
          return;
        }
        chunks.push(c);
      });
      req.on("end", () => {
        const raw = Buffer.concat(chunks).toString("utf8");
        const type = String(req.headers["content-type"] || "");
        try {
          if (type.includes("application/json")) resolve(raw ? JSON.parse(raw) : {});
          else resolve(Object.fromEntries(new URLSearchParams(raw)));
        } catch {
          reject(Object.assign(new Error("ungültige Daten"), { status: 400 }));
        }
      });
      req.on("error", reject);
    });
  }

  function cookies(req) {
    return Object.fromEntries(
      String(req.headers.cookie || "").split(";").map((p) => p.trim().split("=")).filter((p) => p[0]).map(([k, ...v]) => [k, v.join("=")])
    );
  }

  function isLoggedIn(req) {
    const token = cookies(req).sid;
    const exp = token && sessions.get(token);
    if (!exp) return false;
    if (exp < now()) {
      sessions.delete(token);
      return false;
    }
    return true;
  }

  // Schutz gegen fremde Seiten, die Formulare an den Admin-Bereich schicken (CSRF).
  function sameOrigin(req) {
    const origin = req.headers.origin;
    if (!origin || !config.publicBaseUrl) return true;
    return origin === new URL(config.publicBaseUrl).origin;
  }

  function corsHeaders(req) {
    const origin = req.headers.origin;
    if (origin && config.allowedOrigins.includes(origin)) {
      return { "Access-Control-Allow-Origin": origin, Vary: "Origin" };
    }
    return {};
  }

  /* ---------- Kontaktformular ---------- */

  function validateContact(b) {
    const t = (k, max) => String(b[k] ?? "").trim().slice(0, max);
    const data = {
      firstname: t("firstname", 100),
      lastname: t("lastname", 100),
      company: t("company", 150),
      email: t("email", 200),
      phone: t("phone", 50),
      subject: t("subject", 200),
      message: t("message", 5000),
      lang: b.lang === "en" ? "en" : "de",
    };
    const errors = [];
    for (const k of ["firstname", "lastname", "email", "subject", "message"]) if (!data[k]) errors.push(k);
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.push("email");
    return { data, errors: [...new Set(errors)] };
  }

  async function handleContact(req, res) {
    const cors = corsHeaders(req);
    if (req.headers.origin && !cors["Access-Control-Allow-Origin"]) {
      return json(res, 403, { success: false, message: "Herkunft nicht erlaubt" });
    }
    if (!contactLimiter.hit(clientIp(req))) {
      return json(res, 429, { success: false, message: "Zu viele Anfragen – bitte später erneut versuchen." }, cors);
    }
    const body = await readBody(req);

    // Honeypot: Echte Besucher sehen dieses Feld nicht. Bots bekommen „Erfolg“, es wird aber nichts gespeichert.
    if (body.botcheck && body.botcheck !== "false") return json(res, 200, { success: true }, cors);

    const { data, errors } = validateContact(body);
    if (errors.length) return json(res, 400, { success: false, message: "Bitte Pflichtfelder prüfen.", fields: errors }, cors);

    const saved = store.add("inquiries", data);
    log.info?.(`Neue Anfrage ${saved.id} gespeichert`);

    // Bewusst ohne persönliche Daten: Die Inhalte bleiben auf dem eigenen Server.
    const adminUrl = config.publicBaseUrl ? `${config.publicBaseUrl}/admin` : "/admin";
    const hint = `Neue Kontaktanfrage über ${config.siteName} eingegangen. Ansehen: ${adminUrl}`;
    await Promise.all([
      notifySafely(() => notifier.whatsapp(hint), log),
      notifySafely(() => notifier.email(`Neue Kontaktanfrage – ${config.siteName}`, hint), log),
    ]);

    return json(res, 200, { success: true }, cors);
  }

  /* ---------- Anrufe (sipgate Push-API) ---------- */

  // Datenschutz-Modus: Nummer nur im Admin-Bereich, nicht in der WhatsApp-Nachricht (Meta).
  function callerPart(from) {
    if (config.calls.showNumber) return ` von ${from}`;
    const adminUrl = config.publicBaseUrl ? `${config.publicBaseUrl}/admin` : "/admin";
    return ` (Nummer im Admin-Bereich: ${adminUrl})`;
  }

  function cleanupPending() {
    const cutoff = now() - 60 * 60 * 1000;
    for (const [id, c] of pendingCalls) if (c.start < cutoff) pendingCalls.delete(id);
  }

  async function handleSipgate(req, res, token, action) {
    if (!config.calls.webhookToken || !safeEqual(token, config.calls.webhookToken)) return send(res, 404, "");
    const b = await readBody(req);
    const callId = String(b.callId || "");
    const xml = (inner = "") => send(res, 200, `<?xml version="1.0" encoding="UTF-8"?>\n<Response${inner} />`, { "Content-Type": "application/xml; charset=utf-8" });

    if (action === "new-call") {
      if (b.direction && b.direction !== "in") return xml();
      cleanupPending();
      const call = { from: formatNumber(b.from), to: formatNumber(b.to), start: now(), answered: false };
      if (callId) pendingCalls.set(callId, call);
      if (config.calls.notifyOn === "all") {
        await notifySafely(() => notifier.whatsapp(`📞 Eingehender Anruf${callerPart(call.from)} um ${clock(new Date(call.start))} Uhr`), log);
      }
      const base = config.publicBaseUrl || `https://${req.headers.host}`;
      const hook = (a) => esc(`${base}/hooks/sipgate/${config.calls.webhookToken}/${a}`);
      return xml(` onAnswer="${hook("answer")}" onHangup="${hook("hangup")}"`);
    }

    if (action === "answer") {
      const call = pendingCalls.get(callId);
      if (call) call.answered = true;
      return xml();
    }

    if (action === "hangup") {
      const call = pendingCalls.get(callId) || { from: formatNumber(b.from), to: formatNumber(b.to), start: now(), answered: false };
      pendingCalls.delete(callId);
      const answered = call.answered;
      store.add("calls", { from: call.from, to: call.to, answered, cause: String(b.cause || "").slice(0, 40) });
      if (!answered && config.calls.notifyOn === "missed") {
        await notifySafely(() => notifier.whatsapp(`📞 Verpasster Anruf${callerPart(call.from)} um ${clock(new Date(call.start))} Uhr`), log);
      }
      return xml();
    }
    return send(res, 404, "");
  }

  /* ---------- Admin-Bereich ---------- */

  async function handleLogin(req, res) {
    const ip = clientIp(req);
    if (!sameOrigin(req)) return send(res, 403, "");
    if (loginLimiter.count(ip) >= 5) {
      return html(res, 429, loginPage(config.siteName, "Zu viele Fehlversuche. Bitte 15 Minuten warten."));
    }
    const b = await readBody(req);
    const ok =
      safeEqual(String(b.user || ""), config.admin.user) &&
      verifyPassword(String(b.password || ""), config.admin.passwordHash) &&
      verifyTotp(config.admin.totpSecret, b.code, now());
    if (!ok) {
      loginLimiter.hit(ip);
      log.warn?.(`Fehlgeschlagene Anmeldung von ${ip}`);
      return html(res, 401, loginPage(config.siteName, "Anmeldung fehlgeschlagen."));
    }
    loginLimiter.reset(ip);
    const token = randomToken();
    sessions.set(token, now() + SESSION_MS);
    const cookie = `sid=${token}; Path=/admin; HttpOnly; SameSite=Strict; Max-Age=${SESSION_MS / 1000}${secureCookie ? "; Secure" : ""}`;
    return redirect(res, "/admin", { "Set-Cookie": cookie });
  }

  async function handleAdmin(req, res, path) {
    if (path === "/admin/login" && req.method === "POST") return handleLogin(req, res);

    if (!isLoggedIn(req)) {
      if (req.method === "GET") return html(res, 200, loginPage(config.siteName));
      return send(res, 401, "");
    }
    if (req.method === "POST" && !sameOrigin(req)) return send(res, 403, "");

    if (path === "/admin/logout" && req.method === "POST") {
      sessions.delete(cookies(req).sid);
      return redirect(res, "/admin", { "Set-Cookie": `sid=; Path=/admin; HttpOnly; SameSite=Strict; Max-Age=0${secureCookie ? "; Secure" : ""}` });
    }
    if ((path === "/admin" || path === "/admin/") && req.method === "GET") {
      return html(res, 200, dashboardPage(config.siteName, store.list("inquiries"), store.list("calls"), config.retentionDays));
    }
    let m = path.match(/^\/admin\/anfrage\/([a-z0-9-]+)$/);
    if (m && req.method === "GET") {
      const q = store.get("inquiries", m[1]);
      return q ? html(res, 200, inquiryPage(config.siteName, q)) : html(res, 404, page("Nicht gefunden", "<p>Anfrage nicht gefunden. <a href='/admin'>Zurück</a></p>"));
    }
    m = path.match(/^\/admin\/anfrage\/([a-z0-9-]+)\/loeschen$/);
    if (m && req.method === "POST") {
      store.remove("inquiries", m[1]);
      return redirect(res, "/admin");
    }
    return html(res, 404, page("Nicht gefunden", "<p>Seite nicht gefunden. <a href='/admin'>Zurück</a></p>"));
  }

  /* ---------- Router ---------- */

  return async function handler(req, res) {
    const path = new URL(req.url, "http://x").pathname;
    try {
      if (path === "/health") return json(res, 200, { ok: true });

      if (path === "/api/contact") {
        if (req.method === "OPTIONS") {
          return send(res, 204, "", { ...corsHeaders(req), "Access-Control-Allow-Methods": "POST", "Access-Control-Allow-Headers": "Content-Type, Accept", "Access-Control-Max-Age": "86400" });
        }
        if (req.method === "POST") return await handleContact(req, res);
        return send(res, 405, "", { Allow: "POST, OPTIONS" });
      }

      const hook = path.match(/^\/hooks\/sipgate\/([A-Za-z0-9]+)\/(new-call|answer|hangup)$/);
      if (hook && req.method === "POST") return await handleSipgate(req, res, hook[1], hook[2]);

      if (path === "/admin" || path.startsWith("/admin/")) return await handleAdmin(req, res, path);

      return send(res, 404, "Nicht gefunden", { "Content-Type": "text/plain; charset=utf-8" });
    } catch (err) {
      const status = err.status || 500;
      if (status === 500) log.error("Serverfehler:", err);
      if (!res.headersSent) return json(res, status, { success: false, message: status === 500 ? "Serverfehler" : err.message }, corsHeaders(req));
    }
  };
}
