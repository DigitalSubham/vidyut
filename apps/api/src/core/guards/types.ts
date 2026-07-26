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
    }
  }
}
