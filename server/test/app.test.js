import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createApp, formatNumber } from "../src/app.js";
import { configFromEnv } from "../src/config.js";
import { Store } from "../src/store.js";
import { hashPassword, newTotpSecret, totp, randomToken, encrypt, decrypt, verifyTotp } from "../src/security.js";

const SITE = "https://samsam-tech.de";
const API = "https://api.samsam-tech.de";
const TOKEN = "abc123TOKEN";
const totpSecret = newTotpSecret();
const key = Buffer.from(randomToken(32), "hex");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "samsam-api-"));
const sent = [];
let server, base;

before(async () => {
  const config = configFromEnv({
    PUBLIC_BASE_URL: API,
    ALLOWED_ORIGINS: SITE,
    ADMIN_USER: "abed",
    ADMIN_PASSWORD_HASH: hashPassword("ein-langes-passwort"),
    ADMIN_TOTP_SECRET: totpSecret,
    SIPGATE_WEBHOOK_TOKEN: TOKEN,
    CALL_NOTIFY_ON: "missed",
    CALL_SHOW_NUMBER: "1",
  });
  const store = new Store(dir, key);
  const notifier = { whatsapp: async (t) => sent.push(t), email: async () => ({ skipped: true }) };
  server = http.createServer(createApp({ config, store, notifier, log: { info() {}, warn() {}, error() {} } }));
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  server.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

const form = (obj) => new URLSearchParams(obj).toString();
const post = (p, body, headers = {}) =>
  fetch(base + p, { method: "POST", redirect: "manual", headers: { "Content-Type": "application/x-www-form-urlencoded", ...headers }, body });

const valid = { firstname: "Max", lastname: "Muster", email: "max@example.de", subject: "Website", message: "Hallo!", company: "", phone: "" };

test("Verschlüsselung funktioniert hin und zurück", () => {
  const box = encrypt(key, { a: 1 });
  assert.ok(!box.includes('"a"'));
  assert.deepEqual(decrypt(key, box), { a: 1 });
});

test("TOTP-Code wird akzeptiert, falscher Code nicht", () => {
  assert.ok(verifyTotp(totpSecret, totp(totpSecret)));
  assert.ok(!verifyTotp(totpSecret, "000000") || totp(totpSecret) === "000000");
});

test("Kontaktanfrage wird verschlüsselt gespeichert und meldet sich per WhatsApp – ohne persönliche Daten", async () => {
  const before = sent.length;
  const res = await post("/api/contact", form(valid), { Origin: SITE });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("access-control-allow-origin"), SITE);
  assert.deepEqual(await res.json(), { success: true });

  const files = fs.readdirSync(path.join(dir, "inquiries"));
  assert.equal(files.length, 1);
  const raw = fs.readFileSync(path.join(dir, "inquiries", files[0]), "utf8");
  assert.ok(!raw.includes("max@example.de"), "E-Mail darf nicht im Klartext auf der Platte liegen");

  assert.equal(sent.length, before + 1);
  assert.ok(!sent.at(-1).includes("Max") && !sent.at(-1).includes("max@example.de"));
  assert.ok(sent.at(-1).includes(`${API}/admin`));
});

test("Fehlende Pflichtfelder werden abgelehnt", async () => {
  const res = await post("/api/contact", form({ ...valid, email: "kaputt" }), { Origin: SITE });
  assert.equal(res.status, 400);
  assert.ok((await res.json()).fields.includes("email"));
});

test("Fremde Websites dürfen das Formular nicht nutzen", async () => {
  const res = await post("/api/contact", form(valid), { Origin: "https://boese.example" });
  assert.equal(res.status, 403);
});

test("Honeypot: Bots bekommen Erfolg, es wird nichts gespeichert", async () => {
  const count = fs.readdirSync(path.join(dir, "inquiries")).length;
  const res = await post("/api/contact", form({ ...valid, botcheck: "on" }), { Origin: SITE });
  assert.equal(res.status, 200);
  assert.equal(fs.readdirSync(path.join(dir, "inquiries")).length, count);
});

test("Admin: ohne Anmeldung keine Daten, mit Passwort + 2FA-Code Zugriff", async () => {
  const anon = await fetch(base + "/admin");
  assert.ok(!(await anon.text()).includes("Muster"));

  const bad = await post("/admin/login", form({ user: "abed", password: "ein-langes-passwort", code: "123456" }), { Origin: API });
  assert.equal(bad.status, 401);

  const ok = await post("/admin/login", form({ user: "abed", password: "ein-langes-passwort", code: totp(totpSecret) }), { Origin: API });
  assert.equal(ok.status, 303);
  const cookie = ok.headers.get("set-cookie");
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /Secure/);

  const dash = await fetch(base + "/admin", { headers: { Cookie: cookie.split(";")[0] } });
  const text = await dash.text();
  assert.ok(text.includes("Muster"));
  assert.equal(dash.headers.get("x-frame-options"), "DENY");
});

test("Anruf: verpasster Anruf löst WhatsApp mit der Nummer aus", async () => {
  const before = sent.length;
  const nc = await post(`/hooks/sipgate/${TOKEN}/new-call`, form({ event: "newCall", direction: "in", from: "4917662991049", to: "4940123456", callId: "c1" }));
  const xml = await nc.text();
  assert.match(xml, /onHangup="https:\/\/api\.samsam-tech\.de\/hooks\/sipgate\/abc123TOKEN\/hangup"/);
  assert.equal(sent.length, before, "bei Einstellung 'missed' noch keine Nachricht beim Klingeln");

  await post(`/hooks/sipgate/${TOKEN}/hangup`, form({ event: "hangup", cause: "cancel", callId: "c1" }));
  assert.equal(sent.length, before + 1);
  assert.match(sent.at(-1), /Verpasster Anruf von \+4917662991049/);
});

test("Anruf: angenommener Anruf löst keine Nachricht aus", async () => {
  const before = sent.length;
  await post(`/hooks/sipgate/${TOKEN}/new-call`, form({ direction: "in", from: "4930111", callId: "c2" }));
  await post(`/hooks/sipgate/${TOKEN}/answer`, form({ callId: "c2" }));
  await post(`/hooks/sipgate/${TOKEN}/hangup`, form({ cause: "normalClearing", callId: "c2" }));
  assert.equal(sent.length, before);
});

test("Anruf-Webhook mit falschem Token wird abgewiesen", async () => {
  const res = await post(`/hooks/sipgate/falsch/new-call`, form({ direction: "in", from: "49301" }));
  assert.equal(res.status, 404);
});

test("Datenschutz-Modus (Standard): Nummer landet nicht in WhatsApp, aber im Admin-Bereich", async () => {
  const dir2 = fs.mkdtempSync(path.join(os.tmpdir(), "samsam-api-"));
  const msgs = [];
  const config = configFromEnv({ PUBLIC_BASE_URL: API, ADMIN_PASSWORD_HASH: "x", ADMIN_TOTP_SECRET: totpSecret, SIPGATE_WEBHOOK_TOKEN: TOKEN });
  const store2 = new Store(dir2, key);
  const srv = http.createServer(createApp({ config, store: store2, notifier: { whatsapp: async (t) => msgs.push(t), email: async () => ({}) }, log: { info() {}, warn() {}, error() {} } }));
  await new Promise((r) => srv.listen(0, "127.0.0.1", r));
  const b2 = `http://127.0.0.1:${srv.address().port}`;
  const p = (u, body) => fetch(b2 + u, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
  await p(`/hooks/sipgate/${TOKEN}/new-call`, form({ direction: "in", from: "4917600000001", callId: "p1" }));
  await p(`/hooks/sipgate/${TOKEN}/hangup`, form({ cause: "cancel", callId: "p1" }));
  srv.close();
  assert.equal(msgs.length, 1);
  assert.ok(!msgs[0].includes("4917600000001"));
  assert.match(msgs[0], /Verpasster Anruf \(Nummer im Admin-Bereich/);
  assert.equal(store2.list("calls")[0].from, "+4917600000001");
  fs.rmSync(dir2, { recursive: true, force: true });
});

test("Rufnummern werden lesbar formatiert", () => {
  assert.equal(formatNumber("4917662991049"), "+4917662991049");
  assert.match(formatNumber("anonymous"), /unterdrückt/);
});
