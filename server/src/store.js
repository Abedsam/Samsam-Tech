// Verschlüsselte Ablage auf der Festplatte des eigenen Servers.
// Jeder Eintrag ist eine eigene Datei; ohne DATA_KEY ist der Inhalt nicht lesbar.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { encrypt, decrypt } from "./security.js";

export class Store {
  constructor(dir, key) {
    this.dir = dir;
    this.key = key;
    for (const sub of ["inquiries", "calls"]) {
      fs.mkdirSync(path.join(dir, sub), { recursive: true, mode: 0o700 });
    }
  }

  _file(kind, id) {
    if (!/^[a-z0-9-]+$/.test(id)) throw new Error("ungültige ID");
    return path.join(this.dir, kind, `${id}.enc`);
  }

  add(kind, record) {
    const id = `${Date.now().toString(36)}-${crypto.randomBytes(5).toString("hex")}`;
    const full = { id, createdAt: new Date().toISOString(), ...record };
    fs.writeFileSync(this._file(kind, id), encrypt(this.key, full), { mode: 0o600 });
    return full;
  }

  get(kind, id) {
    try {
      return decrypt(this.key, fs.readFileSync(this._file(kind, id), "utf8"));
    } catch {
      return null;
    }
  }

  list(kind) {
    const dir = path.join(this.dir, kind);
    return fs.readdirSync(dir)
      .filter((f) => f.endsWith(".enc"))
      .map((f) => this.get(kind, f.slice(0, -4)))
      .filter(Boolean)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  remove(kind, id) {
    try {
      fs.unlinkSync(this._file(kind, id));
      return true;
    } catch {
      return false;
    }
  }

  // Löscht Einträge, die älter als `days` Tage sind (Datensparsamkeit / DSGVO).
  purgeOlderThan(days) {
    const cutoff = Date.now() - days * 86_400_000;
    let removed = 0;
    for (const kind of ["inquiries", "calls"]) {
      for (const rec of this.list(kind)) {
        if (Date.parse(rec.createdAt) < cutoff && this.remove(kind, rec.id)) removed++;
      }
    }
    return removed;
  }
}
