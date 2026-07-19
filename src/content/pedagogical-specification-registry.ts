import { PedagogicalSpecificationCatalog } from "./pedagogical-specification-catalog.ts";

const specifications = import.meta.glob("./formations/*/parcours-*/*.specification.json", {
  eager: true,
  import: "default",
});

export const PEDAGOGICAL_SPECIFICATION_CATALOG = new PedagogicalSpecificationCatalog(
  Object.values(specifications),
);
