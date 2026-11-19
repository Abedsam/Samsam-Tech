// Erzeugt alle geheimen Werte für die .env-Datei.
// Aufruf: npm run setup -- "DeinSicheresPasswort"
import { hashPassword, newTotpSecret, randomToken } from "../src/security.js";

const password = process.argv[2];
if (!password || password.length < 12) {
  console.error('Bitte ein Passwort mit mindestens 12 Zeichen angeben:\n  npm run setup -- "DeinSicheresPasswort"');
  process.exit(1);
}

const user = process.env.ADMIN_USER || "abed";
const totpSecret = newTotpSecret();
const issuer = encodeURIComponent(process.env.SITE_NAME || "Samsam-Tech");

console.log(`# --- In die Datei .env übernehmen ---
DATA_KEY=${randomToken(32)}
ADMIN_USER=${user}
ADMIN_PASSWORD_HASH=${hashPassword(password)}
ADMIN_TOTP_SECRET=${totpSecret}
SIPGATE_WEBHOOK_TOKEN=${randomToken(24)}

# --- Zwei-Faktor-Anmeldung einrichten ---
# In Google Authenticator / Microsoft Authenticator „Schlüssel eingeben“ wählen und diesen Code eintragen:
#   ${totpSecret}
# Oder diesen Link als QR-Code öffnen:
#   otpauth://totp/${issuer}:${encodeURIComponent(user)}?secret=${totpSecret}&issuer=${issuer}
#
# WICHTIG: DATA_KEY sicher aufbewahren (z. B. Passwort-Manager).
# Ohne diesen Schlüssel lassen sich die gespeicherten Anfragen nicht mehr lesen.`);
