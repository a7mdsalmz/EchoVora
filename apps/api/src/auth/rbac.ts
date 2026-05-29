import type { RoleKey } from "@prisma/client";

const RoleWeight: Record<RoleKey, number> = {
  SUPER_ADMIN: 4,
  BUSINESS_OWNER: 3,
  MANAGER: 2,
  VIEWER: 1
};

export function hasRoleAtLeast(userRole: RoleKey, requiredRole: RoleKey): boolean {
  return RoleWeight[userRole] >= RoleWeight[requiredRole];
}

