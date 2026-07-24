import { FormationCatalog } from "./formation-catalog";
import { MEDLINGO_OFFICIAL_CHARTER } from "./medlingo-charter-registry";

const manifests = import.meta.glob("./formations/*/formation.json", {
  eager: true,
  import: "default",
});

export const FORMATION_CATALOG = new FormationCatalog(Object.values(manifests));
export const DEA_FORMATION = FORMATION_CATALOG.getFormation("dea");

if (DEA_FORMATION.charterId !== MEDLINGO_OFFICIAL_CHARTER.id) {
  throw new Error(`La formation DEA doit référencer la charte ${MEDLINGO_OFFICIAL_CHARTER.id}.`);
}
