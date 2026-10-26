/**
 * Extra-http (multipart photos / proof) cannot go through the json policy.
 * Same origin list, same session cookie, same OwnedOpen predicate as Confirm
 * and SubmitProof. Errors mapped through policy.publicErrors so the codes match.
 */
import type { assembleApplication } from "./assembly.ts";
import { UnknownSession } from "./concepts/Sessioning.ts";
import { policy } from "./http.ts";

type App = ReturnType<typeof assembleApplication>;

const STATUS: Record<string, number> = {
  INVALID_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
};

function isRefusal(value: unknown): value is { error: string } {
  return typeof value === "object" && value !== null && "error" in value && typeof (value as { error: unknown }).error === "string";
}

export function publicJson(error: string, status?: number) {
  const mapped = policy.publicErrors?.[error] ?? error;
  return Response.json({ error: mapped }, { status: status ?? STATUS[mapped] ?? 400 });
}

export function originAllowed(request: Request) {
  const origin = request.headers.get("Origin");
  if (!origin) return true;
  const origins = policy.requestOrigins;
  const allowed = origins && typeof origins === "object" ? origins.allowed : [policy.publicOrigin ?? "http://127.0.0.1:8080"];
  return allowed.includes(origin);
}

export function sessionCookie(request: Request) {
  const cookie = request.headers.get("Cookie") ?? "";
  const match =
    cookie.match(/(?:^|; )__Host-kumba-session=([^;]+)/) ??
    cookie.match(/(?:^|; )__Secure-kumba-session=([^;]+)/) ??
    cookie.match(/(?:^|; )kumba-session=([^;]+)/);
  return match ? decodeURIComponent(match[1]!) : "";
}

export async function accountOf(request: Request, application: App) {
  const current = await application.concepts.Sessioning.current({ session: sessionCookie(request) });
  if (isRefusal(current) || typeof current.subject !== "string") throw new UnknownSession();
  return current.subject;
}

/** Same as the OwnedOpen view: exists, this owner, OPEN. */
export async function ownedOpen(application: App, listing: string, owner: string) {
  const found = (await application.concepts.Listing._get({ listing }))[0];
  if (!found) return { error: "NO_SUCH_LISTING" as const };
  if (found.owner !== owner) return { error: "NOT_OWNER" as const };
  if (found.status !== "OPEN") return { error: "NOT_OPEN" as const };
  return { ok: true as const, listing };
}

export type OwnedListing = { listing: string; owner: string };

export function isOwned(value: Response | OwnedListing): value is OwnedListing {
  return typeof value === "object" && value !== null && "listing" in value && "owner" in value;
}

export async function requireOwnedOpen(
  request: Request,
  application: App,
  listing: string,
): Promise<Response | OwnedListing> {
  if (!originAllowed(request)) return publicJson("FORBIDDEN", 403);
  let owner: string;
  try {
    owner = await accountOf(request, application);
  } catch (error) {
    if (error instanceof UnknownSession) return publicJson("UNKNOWN_SESSION");
    throw error;
  }
  const gate = await ownedOpen(application, listing, owner);
  if (!("ok" in gate)) return publicJson(gate.error);
  return { listing, owner };
}
