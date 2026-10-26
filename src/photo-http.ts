import { isOwned, publicJson, requireOwnedOpen } from "./access.ts";
import type { assembleApplication } from "./assembly.ts";
import { db } from "./db.ts";
import { filesDb } from "./file-store.ts";
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

const ATTACH = new Set(["/api/listings/search", "/api/listings/view", "/api/listings/mine"]);

function fileError(error: unknown): Response {
  if (!(error instanceof Error)) return publicJson("INTERNAL_ERROR", 500);
  if (error.message === "too-large" || error.message === "type" || error.message === "empty" || error.message === "id") {
    return publicJson("INVALID_REQUEST");
  }
  if (error.message === "full") return publicJson("CONFLICT", 409);
  if (error.message === "missing") return publicJson("NOT_FOUND");
  throw error;
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
  try {
    const form = await request.formData();
    const gate = await requireOwnedOpen(request, application, listingFrom(form));
    if (!isOwned(gate)) return gate;
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) return publicJson("INVALID_REQUEST");
    return Response.json(await saveListingPhoto(gate.listing, file, filesDb(application, db)));
  } catch (error) {
    return fileError(error);
  }
}

export async function chooseDisplayPhoto(request: Request, application: App) {
  const body = await readJson(request);
  if (!body) return publicJson("INVALID_REQUEST");
  try {
    const gate = await requireOwnedOpen(request, application, listingFrom(body));
    if (!isOwned(gate)) return gate;
    return Response.json(await setDisplayPhoto(gate.listing, photoFrom(body), filesDb(application, db)));
  } catch (error) {
    return fileError(error);
  }
}

export async function dropListingPhoto(request: Request, application: App) {
  const body = await readJson(request);
  if (!body) return publicJson("INVALID_REQUEST");
  try {
    const gate = await requireOwnedOpen(request, application, listingFrom(body));
    if (!isOwned(gate)) return gate;
    return Response.json(await removeListingPhoto(gate.listing, photoFrom(body), filesDb(application, db)));
  } catch (error) {
    return fileError(error);
  }
}

export async function serveListingPhoto(listing: string, photo: string, database = db) {
  const file = await readListingPhoto(listing, photo, database);
  if (!file) return publicJson("NO_SUCH_LISTING");
  return new Response(file.bytes, {
    headers: {
      "Content-Type": contentTypeOf(file.filename),
      "Cache-Control": "public, max-age=3600",
    },
  });
}

async function attachPhotos(payload: unknown, database: import("mongodb").Db) {
  if (!payload || typeof payload !== "object") return;
  const body = payload as Record<string, unknown>;

  const results = body.results;
  if (results && typeof results === "object" && Array.isArray((results as { listings?: unknown }).listings)) {
    for (const row of (results as { listings: Record<string, unknown>[] }).listings) {
      const listing = typeof row.listing === "string" ? row.listing : "";
      row.displayPhoto = listing ? await displayPhotoUrl(listing, database) : null;
    }
  }

  const terms = body.terms;
  if (terms && typeof terms === "object") {
    const listing = typeof (terms as { listing?: unknown }).listing === "string"
      ? (terms as { listing: string }).listing
      : "";
    const photos = listing ? await galleryOf(listing, database) : [];
    (terms as Record<string, unknown>).photos = photos;
    (terms as Record<string, unknown>).displayPhoto = photos.find((shot) => shot.display)?.url ?? photos[0]?.url ?? null;
  }

  const mine = body.mine;
  if (mine && typeof mine === "object" && Array.isArray((mine as { listings?: unknown }).listings)) {
    for (const row of (mine as { listings: Record<string, unknown>[] }).listings) {
      const listing = typeof row.listing === "string" ? row.listing : "";
      const photos = listing ? await galleryOf(listing, database) : [];
      row.photos = photos;
      row.displayPhoto = photos.find((shot) => shot.display)?.url ?? photos[0]?.url ?? null;
    }
  }
}

async function withGallery(response: Response, pathname: string, database: import("mongodb").Db) {
  if (!ATTACH.has(pathname) || !response.ok) return response;
  const type = response.headers.get("Content-Type") ?? "";
  if (!type.includes("application/json")) return response;
  const payload = await response.json();
  await attachPhotos(payload, database);
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
      return serveListingPhoto(decodeURIComponent(file[1]!), decodeURIComponent(file[2]!), filesDb(application, db));
    }
    const response = await jsonApi(request);
    if (!response) return publicJson("NOT_FOUND", 404);
    return withGallery(response, url.pathname, filesDb(application, db));
  };
}
