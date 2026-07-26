import { config } from "dotenv";
import path from "node:path";

config({ path: path.resolve(__dirname, "../.env") });

if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}
