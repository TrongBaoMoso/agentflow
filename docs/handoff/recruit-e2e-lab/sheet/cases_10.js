// ---------- 10/10 manual run: attach the fresh "NOT CREATED" LO rows and the shared how-tos to each case ----------
// Step text lives in cases_1..8.js; this file only adds per-case resources so every case stays self-contained.
const EXTRA_RES = {
  RT: ["register", "cron"], A: ["register", "cron", "results"], B: ["register"], C: ["register", "cron"], D: ["register"],
  E: ["register"], F: ["register"], G: ["register"], H: ["register", "cron"], I: ["register"], W: ["register", "settings", "cron"],
  X: ["register"], Y: ["register"], OM: ["register"], J: ["register", "cron", "time"], K: ["register"], L: ["register", "cron"],
  M: ["register", "cron"], N: ["register"], O: ["register"], P: ["register"], Q: ["register"], R: ["register"], S: ["register", "settings", "time"],
  T: ["register"], U: ["register"], V: ["register", "inbox"], AA: ["register", "settings"], UX: ["register"]
};
for (const c of CASES) {
  const fresh = FRESH_OF(c.id);
  if (fresh.length) { c.los = [...fresh, ...(c.los || [])]; c.fresh = true; }
  const add = EXTRA_RES[c.id] || [];
  c.res = [...add.filter(k => !(c.res || []).includes(k)), ...(c.res || [])];
  if (!c.acc || !c.acc.length) c.acc = ["rec"];
}
