# Samsam-Tech Server – Kontaktformular & Anruf-Benachrichtigung

Eigener kleiner Server in Deutschland für zwei Aufgaben:

1. **Kontaktformular:** Anfragen von samsam-tech.de werden **verschlüsselt auf dem eigenen Server** gespeichert, nicht bei einem Drittanbieter. Du bekommst einen Hinweis per WhatsApp und/oder E-Mail. Die Inhalte siehst du nur im geschützten Admin-Bereich (Passwort + Zwei-Faktor-Code).
2. **Anruf-Benachrichtigung:** Ruft jemand die Firmennummer (sipgate) an, bekommst du eine WhatsApp-Nachricht mit der Nummer des Anrufers – wahlweise bei jedem Anruf oder nur bei verpassten.

Die Hinweise per WhatsApp/E-Mail enthalten bewusst **keine Inhalte der Anfrage**, nur „Neue Anfrage – hier ansehen“. So verlassen die Daten nie den eigenen Server.

```
Besucher ──► samsam-tech.de (GitHub Pages) ──Formular──► api.samsam-tech.de (Hetzner, Caddy + Node)
                                                              │  speichert verschlüsselt
sipgate ──Anruf-Webhook──────────────────────────────────────►│
                                                              └──► WhatsApp-Hinweis an dein Handy
```

Solange der Server noch nicht läuft, verschickt die Website das Formular automatisch wie bisher über Web3Forms. Es geht also nichts verloren.

---

## Was du brauchst

| Was | Wofür | Hinweis |
| --- | --- | --- |
| Server bei **Hetzner** (kleinste Cloud-Variante, Ubuntu 24.04, Standort Deutschland) | läuft rund um die Uhr | wenige Euro im Monat |
| Zugang zu **IONOS** (DNS von samsam-tech.de) | Subdomain `api.samsam-tech.de` | |
| **Meta-Developer-Account** | WhatsApp-Nachrichten senden | Testnummer von Meta ist kostenlos |
| **sipgate**-Account mit Rufnummer | Anrufe an den Server melden | Tarif muss Webhooks (Push-API) unterstützen – vor Abschluss prüfen |

---

## 1. Server anlegen (Hetzner)

1. In der Hetzner Cloud Console einen Server anlegen: **Ubuntu 24.04**, Standort **Nürnberg oder Falkenstein**, kleinster Typ, deinen **SSH-Schlüssel** hinterlegen.
2. Unter „Firewalls“ nur diese Ports öffnen: **22** (SSH), **80** und **443** (Web).
3. Die **IPv4-Adresse** des Servers notieren.

## 2. Subdomain einrichten (IONOS)

In IONOS → Domains → samsam-tech.de → DNS einen neuen Eintrag anlegen:

- Typ **A**, Hostname **api**, Wert = IPv4-Adresse des Servers

Es kann bis zu einer Stunde dauern, bis die Subdomain erreichbar ist.

## 3. Software installieren

Per SSH auf den Server (`ssh root@DEINE-IP`) und nacheinander ausführen:

```bash
apt update && apt upgrade -y
apt install -y git curl debian-keyring debian-archive-keyring apt-transport-https

# Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs

# Caddy (Webserver mit automatischem HTTPS)
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
apt update && apt install -y caddy

# Eigener Benutzer und Datenordner
useradd --system --home /opt/samsam-api --shell /usr/sbin/nologin samsam
mkdir -p /var/lib/samsam-api && chown samsam:samsam /var/lib/samsam-api && chmod 700 /var/lib/samsam-api
```

## 4. Code holen und einrichten

```bash
git clone https://github.com/Abedsam/samsam-tech /opt/samsam-api
cd /opt/samsam-api/server
npm ci --omit=dev

cp .env.example .env
npm run setup -- "HIER-EIN-LANGES-SICHERES-PASSWORT"
```

`npm run setup` gibt dir alle geheimen Werte aus. Trage sie in die Datei `.env` ein (`nano .env`) und speichere sie. Danach:

```bash
chown -R samsam:samsam /opt/samsam-api
chmod 600 /opt/samsam-api/server/.env
```

> **Wichtig:** Den Wert `DATA_KEY` zusätzlich in deinem Passwort-Manager speichern. Ohne ihn lassen sich gespeicherte Anfragen nicht mehr öffnen.

## 5. Dienste starten

```bash
cp deploy/samsam-api.service /etc/systemd/system/
cp deploy/Caddyfile /etc/caddy/Caddyfile
systemctl daemon-reload
systemctl enable --now samsam-api
systemctl reload caddy
```

Test im Browser: **https://api.samsam-tech.de/health** muss `{"ok":true}` zeigen.

## 6. Admin-Bereich & Zwei-Faktor-Anmeldung

1. In einer Authenticator-App (Google oder Microsoft Authenticator) „Schlüssel manuell eingeben“ wählen und den `ADMIN_TOTP_SECRET` aus Schritt 4 eintragen.
2. **https://api.samsam-tech.de/admin** öffnen und mit Benutzername, Passwort und dem 6-stelligen Code aus der App anmelden.
3. Auf samsam-tech.de/kontakt eine Testanfrage schicken – sie erscheint im Admin-Bereich.

## 7. WhatsApp einrichten (Meta Cloud API)

1. Auf **developers.facebook.com** eine App vom Typ **Business** anlegen und das Produkt **WhatsApp** hinzufügen.
2. Unter WhatsApp → **API-Einrichtung** findest du eine kostenlose **Testnummer**, die **Telefonnummer-ID** und einen **Zugriffstoken**.
3. Bei „An“ deine eigene Handynummer hinzufügen und per Code bestätigen.
4. In `.env` eintragen: `WA_TOKEN`, `WA_PHONE_NUMBER_ID`, `WA_TO` (deine Nummer, nur Ziffern, z. B. `4915712345678`). Dann `systemctl restart samsam-api`.
5. **Zum Testen:** Schick von deinem Handy einmal „Hallo“ an die Testnummer. Danach darf der Server dir 24 Stunden lang normale Nachrichten schicken.
6. **Für den Dauerbetrieb:**
   - Im WhatsApp Manager eine Vorlage anlegen, z. B. Name `samsam_hinweis`, Kategorie **Dienstprogramm/Utility**, Sprache Deutsch, Text: `Hinweis von Samsam-Tech: {{1}}`.
   - Nach der Freigabe `WA_TEMPLATE_NAME=samsam_hinweis` setzen.
   - Den temporären Token durch einen dauerhaften Token eines **System-Users** (Meta Business Suite → Einstellungen → System-User) ersetzen.

## 8. Anrufe mit sipgate verbinden

1. In sipgate bei den Webhook-/Push-API-Einstellungen als URL für **eingehende Anrufe** eintragen:
   ```
   https://api.samsam-tech.de/hooks/sipgate/DEIN_SIPGATE_WEBHOOK_TOKEN/new-call
   ```
   (`DEIN_SIPGATE_WEBHOOK_TOKEN` aus der `.env` – er sorgt dafür, dass niemand sonst Anrufe vortäuschen kann.)
2. Annahme und Auflegen meldet sipgate danach automatisch an den Server. Dafür ist keine weitere Einstellung nötig.
3. `CALL_NOTIFY_ON=missed` meldet nur verpasste Anrufe, `CALL_NOTIFY_ON=all` jeden eingehenden Anruf sofort.
4. `CALL_SHOW_NUMBER=0` (Standard, empfohlen): Die WhatsApp-Nachricht lautet nur „📞 Verpasster Anruf um 14:32 Uhr“, die Nummer steht im Admin-Bereich. So geht keine Rufnummer an Meta/WhatsApp. Mit `CALL_SHOW_NUMBER=1` steht die Nummer direkt in der Nachricht.
5. Test: die sipgate-Nummer anrufen, nicht abnehmen, auflegen → WhatsApp-Hinweis kommt, der Anruf erscheint im Admin-Bereich unter „Anrufe“.

## 9. Server absichern und Backups

**Automatische Sicherheitsupdates und Anmeldung nur per SSH-Schlüssel:**

```bash
apt install -y unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades          # mit „Ja“ bestätigen

# Passwort-Anmeldung per SSH abschalten (vorher prüfen, dass der SSH-Schlüssel funktioniert!)
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart ssh
```

**Backups:**
1. In der Hetzner Cloud Console beim Server **„Backups“ aktivieren**. Hetzner sichert dann täglich den ganzen Server und hebt die letzten 7 Sicherungen auf (kleiner Aufpreis).
2. Die gespeicherten Anfragen sind verschlüsselt. Ein Backup ist ohne den Schlüssel also nicht lesbar. Bewahre deshalb **die komplette `.env`-Datei** (vor allem `DATA_KEY`) zusätzlich sicher auf, z. B. im Passwort-Manager. Ohne sie nützt das Backup nichts.
3. Einmal im Quartal testen: Backup als neuen Server wiederherstellen und prüfen, ob sich der Admin-Bereich öffnen lässt.

## 10. Datenschutz (DSGVO) – Checkliste

- [ ] Auftragsverarbeitungsvertrag (AVV) mit **Hetzner** abschließen (Cloud Console → Konto)
- [ ] AVV mit **sipgate** abschließen (im sipgate-Konto)
- [ ] Datenverarbeitungsbedingungen von **Meta/WhatsApp Business** akzeptieren
- [ ] Bei Kunden: **AVV zwischen Samsam-Tech und dem Kunden**, weil Samsam-Tech den Server für ihn betreibt
- [ ] Datenschutzerklärung der Website anpassen (eigener Server, Speicherdauer, sipgate, WhatsApp)
- [ ] `CALL_SHOW_NUMBER=0` lassen, wenn keine Rufnummern an Meta gehen sollen

## 11. Updates einspielen

```bash
cd /opt/samsam-api && sudo -u samsam git pull
cd server && sudo -u samsam npm ci --omit=dev
systemctl restart samsam-api
```

Logs ansehen: `journalctl -u samsam-api -f`

## 12. Wenn alles stabil läuft

- In `assets/js/main.js` den Web3Forms-Fallback entfernen und `api.web3forms.com` aus der Content-Security-Policy der Seiten streichen.
- Die **Datenschutzerklärung** anpassen: Der Absatz zu Web3Forms entfällt; stattdessen beschreiben, dass Anfragen verschlüsselt auf einem eigenen Server in Deutschland gespeichert und nach 180 Tagen gelöscht werden.

---

## Für Kunden (z. B. So geht Eisenbahn)

Der Server ist so gebaut, dass er für Kunden nur anders eingestellt werden muss:
- eigener Server oder zweite Instanz mit eigener `.env`: `SITE_NAME`, `PUBLIC_BASE_URL`, `ALLOWED_ORIGINS`, `DATA_DIR`, `PORT`
- eigenes Passwort und eigener Zwei-Faktor-Code für den Kunden
- eigene WhatsApp-Zielnummer und eigener sipgate-Webhook

Empfehlung: pro Kunde ein **eigener Server**, damit Daten verschiedener Kunden strikt getrennt bleiben.

## Entwicklung

```bash
cd server
npm install
npm test        # automatische Tests (Formular, Verschlüsselung, Admin-Login, Anrufe)
```
