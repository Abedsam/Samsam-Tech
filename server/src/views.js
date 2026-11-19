// Schlichte HTML-Seiten für den geschützten Admin-Bereich.

export const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const fmt = (iso) =>
  new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Berlin" }).format(new Date(iso));

const CSS = `
*{box-sizing:border-box}body{margin:0;font:15px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#f4f6f9;color:#14202e}
main{max-width:920px;margin:0 auto;padding:24px 16px}h1{font-size:22px;margin:0 0 16px}h2{font-size:17px;margin:28px 0 10px}
.card{background:#fff;border:1px solid #dde3ea;border-radius:12px;padding:16px;margin-bottom:12px}
.top{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
a{color:#0a6fd8}label{display:block;font-weight:600;margin:12px 0 4px}
input{width:100%;padding:10px 12px;border:1px solid #c7d0db;border-radius:8px;font:inherit}
button{background:#0a6fd8;color:#fff;border:0;border-radius:8px;padding:10px 16px;font:inherit;font-weight:600;cursor:pointer}
button.danger{background:#c62828}.muted{color:#5b6875;font-size:13px}.err{color:#c62828;font-weight:600}
table{width:100%;border-collapse:collapse}td,th{text-align:left;padding:8px 6px;border-bottom:1px solid #e6eaef;vertical-align:top}
pre{white-space:pre-wrap;word-wrap:break-word;font:inherit;margin:0}`;

export function page(title, body) {
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>${esc(title)}</title><style>${CSS}</style></head><body><main>${body}</main></body></html>`;
}

export function loginPage(siteName, error = "") {
  return page(`${siteName} – Anmeldung`, `
<div class="card" style="max-width:380px;margin:60px auto">
  <h1>${esc(siteName)} – Admin</h1>
  ${error ? `<p class="err">${esc(error)}</p>` : ""}
  <form method="post" action="/admin/login" autocomplete="off">
    <label for="u">Benutzername</label><input id="u" name="user" required>
    <label for="p">Passwort</label><input id="p" name="password" type="password" required>
    <label for="c">Code aus der Authenticator-App</label><input id="c" name="code" inputmode="numeric" pattern="[0-9 ]{6,7}" required>
    <p><button type="submit">Anmelden</button></p>
  </form>
</div>`);
}

export function dashboardPage(siteName, inquiries, calls, retentionDays) {
  const rows = inquiries.length
    ? inquiries.map((q) => `<tr><td>${esc(fmt(q.createdAt))}</td><td><a href="/admin/anfrage/${esc(q.id)}">${esc(q.firstname)} ${esc(q.lastname)}</a>${q.company ? `<br><span class="muted">${esc(q.company)}</span>` : ""}</td><td>${esc(q.subject)}</td></tr>`).join("")
    : `<tr><td colspan="3" class="muted">Noch keine Anfragen.</td></tr>`;
  const callRows = calls.length
    ? calls.slice(0, 50).map((c) => `<tr><td>${esc(fmt(c.createdAt))}</td><td>${esc(c.from)}</td><td>${c.answered ? "angenommen" : "verpasst"}</td></tr>`).join("")
    : `<tr><td colspan="3" class="muted">Noch keine Anrufe.</td></tr>`;
  return page(`${siteName} – Anfragen`, `
<div class="top"><h1>${esc(siteName)} – Anfragen</h1>
<form method="post" action="/admin/logout"><button type="submit">Abmelden</button></form></div>
<p class="muted">Alle Daten liegen verschlüsselt auf diesem Server und werden nach ${esc(retentionDays)} Tagen automatisch gelöscht.</p>
<div class="card"><table><thead><tr><th>Eingang</th><th>Name</th><th>Betreff</th></tr></thead><tbody>${rows}</tbody></table></div>
<h2>Anrufe</h2>
<div class="card"><table><thead><tr><th>Zeit</th><th>Nummer</th><th>Status</th></tr></thead><tbody>${callRows}</tbody></table></div>`);
}

export function inquiryPage(siteName, q) {
  const field = (label, value) => `<tr><th style="width:160px">${esc(label)}</th><td><pre>${esc(value || "–")}</pre></td></tr>`;
  return page(`${siteName} – Anfrage`, `
<p><a href="/admin">← Zurück zur Übersicht</a></p>
<h1>${esc(q.subject)}</h1>
<div class="card"><table>
${field("Eingang", fmt(q.createdAt))}${field("Vorname", q.firstname)}${field("Nachname", q.lastname)}${field("Unternehmen", q.company)}
${field("E-Mail", q.email)}${field("Telefon", q.phone)}${field("Sprache", q.lang)}${field("Nachricht", q.message)}
</table></div>
<form method="post" action="/admin/anfrage/${esc(q.id)}/loeschen"><button class="danger" type="submit">Anfrage endgültig löschen</button></form>`);
}
