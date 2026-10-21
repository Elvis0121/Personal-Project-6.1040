export type Page =
  | { name: "landing" }
  | { name: "search" }
  | { name: "listing"; listing: string }
  | { name: "liked" }
  | { name: "mine" }
  | { name: "review" }
  | { name: "sign-in" }
  | { name: "sign-up" };

export function pageFromHash(hash: string): Page {
  const path = hash.replace(/^#/, "") || "/";
  const listing = path.match(/^\/listing\/(.+)$/);
  if (listing) return { name: "listing", listing: decodeURIComponent(listing[1]!) };
  if (path === "/homes") return { name: "search" };
  if (path === "/liked") return { name: "liked" };
  if (path === "/mine") return { name: "mine" };
  if (path === "/review") return { name: "review" };
  if (path === "/sign-in") return { name: "sign-in" };
  if (path === "/sign-up") return { name: "sign-up" };
  return { name: "landing" };
}
