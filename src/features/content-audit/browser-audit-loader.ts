import type { AuditInputFile } from "./audit-domain.ts";

const contentModules = import.meta.glob("/src/content/**/*.json", {
  eager: true,
  import: "default",
}) as Record<string, unknown>;

export function loadBrowserAuditFiles(): AuditInputFile[] {
  const encoder = new TextEncoder();
  return Object.entries(contentModules).map(([path, data]) => {
    const serialized = JSON.stringify(data);
    return {
      path,
      data,
      sizeBytes: encoder.encode(serialized).byteLength,
      utf8Valid: true,
    };
  });
}
