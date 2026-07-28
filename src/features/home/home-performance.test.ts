import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

test("l'accueil utilise le tableau de bord groupé et diffère les éléments secondaires", () => {
  const home = source("../../routes/index.tsx");

  assert.match(home, /useHomeDashboard\(deferredHomeData\)/);
  assert.match(home, /lazy\(\(\) =>/);
  assert.match(home, /<TopBar wallet=\{dashboard\?\.wallet \?\? null\}/);
  assert.doesNotMatch(home, /useBadgesCatalog|useUserBadges|useMissionsCatalog|useXpHistory/);
});

test("la feuille de route est rendue progressivement", () => {
  const roadmap = source("./HomeRoadmap.tsx");

  assert.match(roadmap, /INITIAL_BLOCK_COUNT = 2/);
  assert.match(roadmap, /IntersectionObserver/);
  assert.match(roadmap, /contentVisibility: "auto"/);
});

test("le décor est déterministe et le coffre est chargé à la demande", () => {
  const background = source("../background/themes/SamuRegulation.tsx");
  const topBar = source("../../components/TopBar.tsx");

  assert.doesNotMatch(background, /Math\.random/);
  assert.match(background, /prefers-reduced-motion/);
  assert.match(topBar, /lazy\(\(\) =>\s+import\("@\/components\/ChestOpeningModal"\)/);
});

test("la lecture agrégée Supabase conserve la RLS et reste limitée aux utilisateurs connectés", () => {
  const migration = source(
    "../../../supabase/migrations/20260728120000_home_dashboard_performance.sql",
  );

  assert.match(migration, /SECURITY INVOKER/);
  assert.doesNotMatch(migration, /SECURITY DEFINER/);
  assert.match(migration, /REVOKE ALL .* FROM anon/);
  assert.match(migration, /GRANT EXECUTE .* TO authenticated/);
});
