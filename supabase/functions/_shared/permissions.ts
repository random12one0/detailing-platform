// The permission vocabulary and the one check that reads it. Lifted out of
// `tenant.ts` (ROADMAP 97.13) because that file opens the database client, so
// a Node test could not import the real `can` and would have to copy it — and
// a copied permission rule is the kind that stops agreeing with the original.
// `tenant.ts` re-exports all of this, so no caller changed.

// The closed permission vocabulary, mirroring the check constraint in
// 20260904000000_custom_roles.sql. An unknown string is rejected rather than
// stored, because a permission nothing recognises grants nothing and looks
// exactly like one that was never ticked.
export const PERMISSIONS = ["money", "marketing", "settings", "requests"] as const;
export type Permission = (typeof PERMISSIONS)[number];

export type Member = { userId: string; businessId: string; role: string; permissions: string[] };

// An owner has everything, always — the same fold `has_business_permission()`
// does in SQL, so a caller can never write a check that forgets owners.
export function can(member: Member, permission: Permission): boolean {
  return member.role === "owner" || member.permissions.includes(permission);
}
