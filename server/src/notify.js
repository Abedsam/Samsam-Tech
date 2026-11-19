// Benachrichtigungen: WhatsApp (Meta Cloud API) und optional E-Mail (SMTP, z. B. IONOS).
// Ist ein Kanal nicht konfiguriert, wird er einfach übersprungen.

export function createNotifier(config, log = console) {
  return {
    async whatsapp(text) {
      const wa = config.whatsapp;
      if (!wa.token || !wa.phoneNumberId || !wa.to) return { skipped: true };

      // Außerhalb des 24-Stunden-Fensters erlaubt WhatsApp nur freigegebene Vorlagen.
      // Mit WA_TEMPLATE_NAME wird die Vorlage verwendet ({{1}} = der Hinweistext),
      // ohne Vorlage wird normaler Text gesendet (gut zum Testen).
      const payload = wa.templateName
        ? {
            messaging_product: "whatsapp",
            to: wa.to,
            type: "template",
            template: {
              name: wa.templateName,
              language: { code: wa.templateLang },
              components: [{ type: "body", parameters: [{ type: "text", text: text.slice(0, 1000) }] }],
            },
          }
        : { messaging_product: "whatsapp", to: wa.to, type: "text", text: { body: text.slice(0, 4000) } };

      const res = await fetch(`https://graph.facebook.com/${wa.apiVersion}/${wa.phoneNumberId}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${wa.token}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.text();
        log.error(`WhatsApp-Versand fehlgeschlagen (${res.status}): ${body}`);
        return { ok: false, status: res.status };
      }
      return { ok: true };
    },

    async email(subject, text) {
      const m = config.mail;
      if (!m.host || !m.to) return { skipped: true };
      const { default: nodemailer } = await import("nodemailer");
      const transport = nodemailer.createTransport({
        host: m.host,
        port: m.port,
        secure: m.port === 465,
        auth: m.user ? { user: m.user, pass: m.pass } : undefined,
      });
      await transport.sendMail({ from: m.from || m.user, to: m.to, subject, text });
      return { ok: true };
    },
  };
}

// Benachrichtigungen dürfen eine Anfrage nie scheitern lassen – Fehler werden nur protokolliert.
export async function notifySafely(fn, log = console) {
  try {
    return await fn();
  } catch (err) {
    log.error("Benachrichtigung fehlgeschlagen:", err.message);
    return { ok: false };
  }
}
