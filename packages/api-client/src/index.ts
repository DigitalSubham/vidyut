import createClient from "openapi-fetch";
import type { paths } from "./schema";

export type { paths } from "./schema";

/** Thin typed client generated from apps/api's OpenAPI document (see `pnpm generate`). */
export function createApiClient(baseUrl: string) {
  return createClient<paths>({ baseUrl });
}
