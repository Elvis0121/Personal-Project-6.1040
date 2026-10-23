import type { assembleApplication } from "./assembly.ts";
import { UnknownSession } from "./concepts/Sessioning.ts";
import {
  contentTypeOf,
  displayPhotoUrl,
  galleryOf,
  readListingPhoto,
  removeListingPhoto,
  saveListingPhoto,
  setDisplayPhoto,
} from "./photo-docs.ts";

type App = ReturnType<typeof assembleApplication>;

/** Same Origin rule as src/http.ts. Multipart never goes through that policy, so this door has to match. */
const ORIGIN = process.env.PUBLIC_ORIGIN ?? "http://127.0.0.1:8080";
const ATTACH = new Set(["/api/listings/search", "/api/listings/view", "/api/listings/mine"]);

function json(error: string, status: number) {
  return Response.json({ error }, { status });
}

function sessionCookie(request: Request) {
  const cookie = request.headers.get("Cookie") ?? "";
  const match =
    cookie.match(/(?:^|; )__Host-kumba-session=([^;]+)/) ??
    cookie.match(/(?:^|; )__Secure-kumba-session=([^;]+)/) ??
    cookie.match(/(?:^|; )kumba-session=([^;]+)/);
  return match ? decodeURIComponent(match[1]!) : "";
}

function isRefusal(value: unknown): value is { error: string } {
  return typeof value === "object" && value !== null && "error" in value && typeof (value as { error: unknown }).error === "string";
}

function fileError(error: unknown): Response {
  if (!(error instanceof Error)) return json("INTERNAL_ERROR", 500);
  if (error.message === "too-large" || error.message === "type" || error.message === "empty" || error.message === "id") {
    return json("INVALID_REQUEST", 400);
  }
  if (error.message === "full") return json("CONFLICT", 409);
  if (error.message === "missing") return json("NOT_FOUND", 404);
  throw error;
}

async function userOf(request: Request, application: App) {
  const current = await application.concepts.Sessioning.current({ session: sessionCookie(request) });
  if (isRefusal(current) || typeof current.subject !== "string") throw new UnknownSession();
  return current.subject;
}

async function ownerOf(request: Request, application: App, listing: string, open = false) {
  const owner = await userOf(request, application);
  const found = (await application.concepts.Listing._get({ listing }))[0];
  if (!found) return json("NOT_FOUND", 404);
  if (found.owner !== owner) return json("FORBIDDEN", 403);
  if (open && found.status !== "OPEN") return json("CONFLICT", 409);
  return { listing };
}

function listingFrom(form: FormData | Record<string, unknown>) {
  if (form instanceof FormData) return String(form.get("listing") ?? "");
  return typeof form.listing === "string" ? form.listing : "";
}

function photoFrom(body: Record<string, unknown>) {
  return typeof body.photo === "string" ? body.photo : "";
}

async function readJson(request: Request) {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function uploadListingPhoto(request: Request, application: App) {
  const origin = request.headers.get("Origin");
  if (origin && origin !== ORIGIN) return json("FORBIDDEN", 403);
  let listing: string;
  try {
    const form = await request.formData();
    listing = listingFrom(form);
    const owned = await ownerOf(request, application, listing, true);
    if (owned instanceof Response) return owned;
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) return json("INVALID_REQUEST", 400);
    return Response.json(await saveListingPhoto(listing, file));
  } catch (error) {
    if (error instanceof UnknownSession) return json("UNAUTHORIZED", 401);
    return fileError(error);
  }
}

export async function chooseDisplayPhoto(request: Request, application: App) {
  const origin = request.headers.get("Origin");
  if (origin && origin !== ORIGIN) return json("FORBIDDEN", 403);
  const body = await readJson(request);
  if (!body) return json("INVALID_REQUEST", 400);
  try {
    const owned = await ownerOf(request, application, listingFrom(body), true);
    if (owned instanceof Response) return owned;
    return Response.json(await setDisplayPhoto(owned.listing, photoFrom(body)));
  } catch (error) {
    if (error instanceof UnknownSession) return json("UNAUTHORIZED", 401);
    return fileError(error);
  }
}

export async function dropListingPhoto(request: Request, application: App) {
  const origin = request.headers.get("Origin");
  if (origin && origin !== ORIGIN) return json("FORBIDDEN", 403);
  const body = await readJson(request);
  if (!body) return json("INVALID_REQUEST", 400);
  try {
    const owned = await ownerOf(request, application, listingFrom(body), true);
    if (owned instanceof Response) return owned;
    return Response.json(await removeListingPhoto(owned.listing, photoFrom(body)));
  } catch (error) {
    if (error instanceof UnknownSession) return json("UNAUTHORIZED", 401);
    return fileError(error);
  }
}

export async function serveListingPhoto(listing: string, photo: string) {
  const file = await readListingPhoto(listing, photo);
  if (!file) return json("NOT_FOUND", 404);
  return new Response(file.bytes, {
    headers: {
      "Content-Type": contentTypeOf(file.filename),
      "Cache-Control": "public, max-age=3600",
    },
  });
}

async function attachPhotos(payload: unknown) {
  if (!payload || typeof payload !== "object") return;
  const body = payload as Record<string, unknown>;

  const results = body.results;
  if (results && typeof results === "object" && Array.isArray((results as { listings?: unknown }).listings)) {
    for (const row of (results as { listings: Record<string, unknown>[] }).listings) {
      const listing = typeof row.listing === "string" ? row.listing : "";
      row.displayPhoto = listing ? await displayPhotoUrl(listing) : null;
    }
  }

  const terms = body.terms;
  if (terms && typeof terms === "object") {
    const listing = typeof (terms as { listing?: unknown }).listing === "string"
      ? (terms as { listing: string }).listing
      : "";
    const photos = listing ? await galleryOf(listing) : [];
    (terms as Record<string, unknown>).photos = photos;
    (terms as Record<string, unknown>).displayPhoto = photos.find((shot) => shot.display)?.url ?? photos[0]?.url ?? null;
  }

  const mine = body.mine;
  if (mine && typeof mine === "object" && Array.isArray((mine as { listings?: unknown }).listings)) {
    for (const row of (mine as { listings: Record<string, unknown>[] }).listings) {
      const listing = typeof row.listing === "string" ? row.listing : "";
      const photos = listing ? await galleryOf(listing) : [];
      row.photos = photos;
      row.displayPhoto = photos.find((shot) => shot.display)?.url ?? photos[0]?.url ?? null;
    }
  }
}

async function withGallery(response: Response, pathname: string) {
  if (!ATTACH.has(pathname) || !response.ok) return response;
  const type = response.headers.get("Content-Type") ?? "";
  if (!type.includes("application/json")) return response;
  const payload = await response.json();
  await attachPhotos(payload);
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  return Response.json(payload, { status: response.status, headers });
}

export function withPhotoRoutes(
  jsonApi: (request: Request) => Promise<Response | undefined>,
  application: App,
): (request: Request) => Promise<Response> {
  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    const type = request.headers.get("Content-Type") ?? "";
    if (request.method === "POST" && url.pathname === "/api/listings/photos" && type.includes("multipart/form-data")) {
      return uploadListingPhoto(request, application);
    }
    if (request.method === "POST" && url.pathname === "/api/listings/photos/display") {
      return chooseDisplayPhoto(request, application);
    }
    if (request.method === "POST" && url.pathname === "/api/listings/photos/remove") {
      return dropListingPhoto(request, application);
    }
    const file = url.pathname.match(/^\/api\/listings\/photo\/([^/]+)\/([^/]+)$/);
    if (request.method === "GET" && file) {
      return serveListingPhoto(decodeURIComponent(file[1]!), decodeURIComponent(file[2]!));
    }
    const response = await jsonApi(request);
    if (!response) return json("NOT_FOUND", 404);
    return withGallery(response, url.pathname);
  };
}
