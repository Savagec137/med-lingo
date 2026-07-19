import type { ParcoursManifest } from "./parcours-manifest-domain.ts";
import { parseParcoursManifest } from "./parcours-manifest-schema.ts";

export class ParcoursManifestCatalog {
  private readonly manifests: ReadonlyMap<string, ParcoursManifest>;

  constructor(inputs: unknown[]) {
    const parsed = inputs.map(parseParcoursManifest);
    if (new Set(parsed.map((manifest) => manifest.id)).size !== parsed.length) {
      throw new Error("Les identifiants de manifeste de parcours doivent être uniques.");
    }
    this.manifests = new Map(parsed.map((manifest) => [manifest.id, manifest]));
  }

  get(id: string): ParcoursManifest {
    const manifest = this.manifests.get(id);
    if (!manifest) throw new Error(`Manifeste de parcours introuvable : ${id}`);
    return manifest;
  }
}
