import type { RoleKey } from "@vidyut/types";

export interface RequestAuth {
  userId: string;
  tenantId: string;
  roles: RoleKey[];
  branchIds: string[];
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: RequestAuth;
      /** Raw request body bytes, captured by express.json()'s verify hook — needed for webhook signature verification (Unit 13). */
      rawBody?: Buffer;
    }
  }
}
