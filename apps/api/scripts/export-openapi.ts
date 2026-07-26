import { writeFileSync } from "node:fs";
import path from "node:path";
import { generateOpenApiDocument } from "../src/core/openapi";

const outPath = path.resolve(__dirname, "../../../packages/api-client/openapi.json");
const document = generateOpenApiDocument();
writeFileSync(outPath, JSON.stringify(document, null, 2));
// eslint-disable-next-line no-console
console.log(`Wrote OpenAPI document to ${outPath}`);
