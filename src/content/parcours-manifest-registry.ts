import { ParcoursManifestCatalog } from "./parcours-manifest-catalog.ts";

const manifests = import.meta.glob("./formations/*/parcours-*/parcours.json", {
  eager: true,
  import: "default",
});

export const PARCOURS_MANIFEST_CATALOG = new ParcoursManifestCatalog(Object.values(manifests));
