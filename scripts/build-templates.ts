import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { templates } from "../src/marketing/templates";
import { buildTemplateWorkbook } from "../src/marketing/workbook";

const outDir = join(import.meta.dirname, "..", "public", "templates");

const build = (): void => {
  mkdirSync(outDir, { recursive: true });
  for (const spec of templates) {
    const bytes = buildTemplateWorkbook(spec);
    const path = join(outDir, `${spec.slug}.xlsx`);
    writeFileSync(path, bytes);
    console.log(`  wrote ${spec.slug}.xlsx (${bytes.byteLength} bytes)`);
  }
  console.log(
    `build-templates: wrote ${templates.length} order-sheet templates to public/templates`,
  );
};

build();
