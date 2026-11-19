// Startpunkt: lädt .env, startet den Server und löscht alte Daten regelmäßig.
import http from "node:http";
import { loadDotEnv, configFromEnv, assertConfig } from "./config.js";
import { parseKey } from "./security.js";
import { Store } from "./store.js";
import { createNotifier } from "./notify.js";
import { createApp } from "./app.js";

loadDotEnv();
const config = configFromEnv();
assertConfig(config);

const store = new Store(config.dataDir, parseKey(config.dataKey));
const notifier = createNotifier(config);
const server = http.createServer(createApp({ config, store, notifier }));

const purge = () => {
  const n = store.purgeOlderThan(config.retentionDays);
  if (n) console.info(`${n} alte Einträge gelöscht (älter als ${config.retentionDays} Tage).`);
};
purge();
setInterval(purge, 12 * 60 * 60 * 1000).unref();

// Nur lokal lauschen – von außen erreichbar ist der Server ausschließlich über Caddy (HTTPS).
server.listen(config.port, "127.0.0.1", () => {
  console.info(`${config.siteName}-Server läuft auf http://127.0.0.1:${config.port}`);
});
