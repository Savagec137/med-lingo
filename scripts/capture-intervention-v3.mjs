/**
 * Captures d'écran réelles du Mode Intervention V3.
 *
 * Un mode qui se juge à l'œil ne peut pas se valider par des tests seuls : la
 * grille vierge doit **rester muette**, le tracé ne doit apparaître qu'après la
 * pose du capteur, et la valeur doit vivre. Ce script joue le parcours dans un
 * vrai navigateur et fixe chaque étape, de sorte que la vérification puisse être
 * refaite plutôt que racontée.
 *
 * Il exige un serveur de développement en écoute :
 *
 *     npx vite dev --host 127.0.0.1 --port 5180
 *     node scripts/capture-intervention-v3.mjs
 *
 * Le chemin de Chromium est passé explicitement : l'environnement fournit un
 * binaire dont la version ne correspond pas à celle qu'attend Playwright, et le
 * laisser chercher tout seul le fait échouer sur un téléchargement interdit.
 */

import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const OUT = process.env.CAPTURE_DIR ?? "captures-v3";
const BASE = process.env.CAPTURE_BASE_URL ?? "http://127.0.0.1:5180";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox"],
});
const page = await browser.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });

const errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));

const shot = async (name) => {
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log(`  → ${name}.png`);
};
const click = async (re) => {
  const b = page.getByRole("button", { name: re }).first();
  await b.waitFor({ state: "visible", timeout: 8000 });
  await b.click();
  await page.waitForTimeout(300);
};
const scrollTo = async (text) => {
  await page.evaluate((needle) => {
    const nodes = [...document.querySelectorAll("h2, h1, p")];
    const target = nodes.find((n) => (n.textContent ?? "").trim().startsWith(needle));
    target?.scrollIntoView({ block: "start" });
    window.scrollBy(0, -80);
  }, text);
  await page.waitForTimeout(400);
};

await page.goto(`${BASE}/intervention-v3`, { waitUntil: "networkidle" });
await page.waitForTimeout(1000);
await shot("1-nouvel-appel");

await click(/Accepter la mission/i);
await page.waitForTimeout(300);
await shot("2-arrivee-sur-les-lieux");

for (const label of [/Sécuriser la zone/i, /Observer l'environnement/i, /Approcher le patient/i]) {
  try {
    await click(label);
  } catch {
    /* absente à cette phase */
  }
}
for (let i = 0; i < 5; i += 1) {
  const next = page.getByRole("button", { name: /^Continuer →/ }).first();
  if ((await next.count()) === 0 || (await next.isDisabled())) break;
  await next.click();
  await page.waitForTimeout(350);
}
await page.evaluate(() => window.scrollTo(0, 0));
await shot("3-constantes-vierges");
await scrollTo("MESURES RAPIDES");
await shot("4-mesures-rapides-avant");

await page.evaluate(() => window.scrollTo(0, 0));
await click(/Poser le saturomètre/i);
await page.waitForTimeout(1500);
await page.evaluate(() => window.scrollTo(0, 0));
await shot("5-saturometre-pose");

for (const label of [
  /Prendre la tension/i,
  /Compter la fréquence/i,
  /Évaluer la conscience/i,
  /Évaluer la douleur/i,
]) {
  try {
    await click(label);
  } catch {
    /* absente */
  }
}
await page.waitForTimeout(800);
await page.evaluate(() => window.scrollTo(0, 0));
await shot("6-constantes-mesurees");
await scrollTo("MESURES RAPIDES");
await shot("7-mesures-rapides-apres");
await scrollTo("MATÉRIEL EMBARQUÉ");
await shot("8-materiel");

await page.evaluate(() => window.scrollTo(0, 0));
try {
  await click(/Retirer le capteur/i);
  await page.waitForTimeout(900);
  await page.evaluate(() => window.scrollTo(0, 0));
  await shot("9-capteur-retire");
  const banner = await page.evaluate(() => {
    const heads = [...document.querySelectorAll("p")];
    const h = heads.find((n) => n.textContent?.trim() === "Surveillance");
    return h?.parentElement?.innerText ?? "(introuvable)";
  });
  console.log("  bandeau après retrait :", JSON.stringify(banner));
} catch (e) {
  console.log("  retrait impossible :", String(e).slice(0, 100));
}

console.log("\nerreurs JS :", errors.length === 0 ? "aucune" : errors.join("\n"));
await browser.close();
