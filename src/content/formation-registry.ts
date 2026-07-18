import { FormationCatalog } from "./formation-catalog";

const manifests = import.meta.glob("./formations/*/formation.json", {
  eager: true,
  import: "default",
});

export const FORMATION_CATALOG = new FormationCatalog(Object.values(manifests));
export const DEA_FORMATION = FORMATION_CATALOG.getFormation("dea");
