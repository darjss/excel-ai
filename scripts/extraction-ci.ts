import { readdirSync } from "node:fs";
import { join } from "node:path";

const fixturesDir = join(import.meta.dirname, "..", "fixtures", "excel-samples");
const workbooks = readdirSync(fixturesDir).filter((name) => /\.(xlsx|xlsm)$/.test(name));

console.log(`extraction-ci: found ${workbooks.length} fixture workbooks in fixtures/excel-samples`);
console.log("extraction-ci: no extraction assertions yet — issue #8 fills this in");
