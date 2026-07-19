import type { PedagogicalSpecification } from "./pedagogical-specification-domain.ts";
import { parsePedagogicalSpecification } from "./pedagogical-specification-schema.ts";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stableValue(value: unknown): string {
  if (isRecord(value) && typeof value.id === "string") return `id:${value.id}`;
  return JSON.stringify(value);
}

function mergeValue(base: unknown, addition: unknown, path: string): unknown {
  if (path === "specificationVersion" || path === "contentRevision") return addition;
  if (addition === undefined || addition === null || addition === "") return base;
  if (base === undefined || base === null || base === "") return addition;
  if (Object.is(base, addition)) return base;

  if (Array.isArray(base) && Array.isArray(addition)) {
    const result = [...base];
    const indexByKey = new Map(result.map((value, index) => [stableValue(value), index]));
    for (const value of addition) {
      const key = stableValue(value);
      const existingIndex = indexByKey.get(key);
      if (existingIndex === undefined) {
        indexByKey.set(key, result.length);
        result.push(value);
      } else if (isRecord(result[existingIndex]) && isRecord(value)) {
        result[existingIndex] = mergeValue(result[existingIndex], value, `${path}[${key}]`);
      }
    }
    return result;
  }

  if (isRecord(base) && isRecord(addition)) {
    const result: Record<string, unknown> = { ...base };
    for (const [key, value] of Object.entries(addition)) {
      result[key] = mergeValue(result[key], value, path ? `${path}.${key}` : key);
    }
    return result;
  }

  if (path.endsWith(".status") && base === "pending_content" && addition === "complete") {
    return addition;
  }

  throw new Error(`Fusion additive impossible : le contenu existant diffère à ${path}.`);
}

export function mergePedagogicalSpecifications(
  baseInput: unknown,
  additionInput: unknown,
): PedagogicalSpecification {
  const base = parsePedagogicalSpecification(baseInput);
  const addition = parsePedagogicalSpecification(additionInput);
  if (base.id !== addition.id || base.lesson !== addition.lesson) {
    throw new Error("Seules deux versions de la même spécification peuvent être fusionnées.");
  }
  if (addition.contentRevision <= base.contentRevision) {
    throw new Error("La révision ajoutée doit être supérieure à la révision existante.");
  }

  const merged = mergeValue(base, addition, "") as Record<string, unknown>;
  merged.specificationVersion = addition.specificationVersion;
  merged.contentRevision = addition.contentRevision;
  return parsePedagogicalSpecification(merged);
}
