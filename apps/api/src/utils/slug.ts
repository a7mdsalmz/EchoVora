import { nanoid } from "nanoid";

export function slugify(input: string): string {
  const base = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return base.length > 0 ? base : `biz-${nanoid(8).toLowerCase()}`;
}

export function businessSlugFromName(name: string): string {
  const base = slugify(name);
  return `${base}-${nanoid(6).toLowerCase()}`;
}

