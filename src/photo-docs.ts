import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Db } from "mongodb";
import { deleteBlob, getBlob, manifestKey, photoKey, putBlob } from "./file-store.ts";

export const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
export const MAX_PHOTOS = 8;

const ALLOWED = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

interface Manifest {
  photos: { id: string; filename: string }[];
  display: string | null;
}

export function photoDir() {
  return process.env.PHOTO_DIR ?? path.join(process.cwd(), "data", "photos");
}

export function publicPhotoUrl(listing: string, photo: string) {
  return `/api/listings/photo/${encodeURIComponent(listing)}/${encodeURIComponent(photo)}`;
}

export function isSafeId(id: string) {
  return typeof id === "string" && /^[\w-]+$/.test(id) && id.length < 80;
}

export function contentTypeOf(filename: string) {
  const ext = path.extname(filename).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  return "application/octet-stream";
}

function listingDir(listing: string) {
  if (!isSafeId(listing)) throw new Error("id");
  return path.join(photoDir(), listing);
}

function emptyManifest(): Manifest {
  return { photos: [], display: null };
}

function tidyManifest(parsed: Manifest): Manifest {
  const photos = Array.isArray(parsed.photos)
    ? parsed.photos.filter((row) => row && isSafeId(row.id) && typeof row.filename === "string")
    : [];
  const display =
    typeof parsed.display === "string" && photos.some((row) => row.id === parsed.display)
      ? parsed.display
      : (photos[0]?.id ?? null);
  return { photos, display };
}

async function tryDiskWrite(filePath: string, bytes: Buffer | string) {
  try {
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, bytes);
  } catch {
    // live disk is often read-only
  }
}

export async function readManifest(listing: string, database: Db): Promise<Manifest> {
  if (!isSafeId(listing)) return emptyManifest();
  const fromDb = await getBlob(database, manifestKey(listing));
  if (fromDb) {
    try {
      return tidyManifest(JSON.parse(fromDb.toString("utf8")) as Manifest);
    } catch {
      // fall through to disk
    }
  }
  try {
    const parsed = JSON.parse(await readFile(path.join(listingDir(listing), "manifest.json"), "utf8")) as Manifest;
    return tidyManifest(parsed);
  } catch {
    return emptyManifest();
  }
}

async function writeManifest(listing: string, manifest: Manifest, database: Db) {
  const json = JSON.stringify(manifest);
  await putBlob(database, manifestKey(listing), Buffer.from(json), { type: "application/json" });
  await tryDiskWrite(path.join(listingDir(listing), "manifest.json"), json);
}

export function checkPhotoFile(file: File) {
  if (file.size === 0) throw new Error("empty");
  if (file.size > MAX_PHOTO_BYTES) throw new Error("too-large");
  const type = file.type || contentTypeOf(file.name);
  if (!ALLOWED.has(type)) throw new Error("type");
  const ext = ALLOWED.get(type)!;
  const base = path.basename(file.name).replace(/[^\w.\-]+/g, "-").slice(0, 80) || `photo.${ext}`;
  const filename = base.toLowerCase().endsWith(`.${ext}`) ? base : `${base}.${ext}`;
  return { filename, type };
}

export async function galleryOf(listing: string, database: Db) {
  const manifest = await readManifest(listing, database);
  return manifest.photos.map((row) => ({
    photo: row.id,
    filename: row.filename,
    display: manifest.display === row.id,
    url: publicPhotoUrl(listing, row.id),
  }));
}

export async function displayPhotoUrl(listing: string, database: Db) {
  const manifest = await readManifest(listing, database);
  return manifest.display ? publicPhotoUrl(listing, manifest.display) : null;
}

export async function saveListingPhoto(listing: string, file: File, database: Db) {
  const { filename, type } = checkPhotoFile(file);
  const manifest = await readManifest(listing, database);
  if (manifest.photos.length >= MAX_PHOTOS) throw new Error("full");
  const id = Bun.randomUUIDv7();
  const bytes = Buffer.from(await file.arrayBuffer());
  await putBlob(database, photoKey(listing, id), bytes, { filename, type });
  await tryDiskWrite(path.join(listingDir(listing), id), bytes);
  manifest.photos.push({ id, filename });
  if (!manifest.display) manifest.display = id;
  await writeManifest(listing, manifest, database);
  return { photo: id, filename, type, display: manifest.display === id, url: publicPhotoUrl(listing, id) };
}

export async function setDisplayPhoto(listing: string, photo: string, database: Db) {
  if (!isSafeId(photo)) throw new Error("id");
  const manifest = await readManifest(listing, database);
  if (!manifest.photos.some((row) => row.id === photo)) throw new Error("missing");
  manifest.display = photo;
  await writeManifest(listing, manifest, database);
  return { photo, url: publicPhotoUrl(listing, photo) };
}

export async function removeListingPhoto(listing: string, photo: string, database: Db) {
  if (!isSafeId(photo)) throw new Error("id");
  const manifest = await readManifest(listing, database);
  if (!manifest.photos.some((row) => row.id === photo)) throw new Error("missing");
  manifest.photos = manifest.photos.filter((row) => row.id !== photo);
  if (manifest.display === photo) manifest.display = manifest.photos[0]?.id ?? null;
  await writeManifest(listing, manifest, database);
  await deleteBlob(database, photoKey(listing, photo));
  await rm(path.join(listingDir(listing), photo), { force: true }).catch(() => undefined);
  return { photo, display: manifest.display };
}

export async function readListingPhoto(listing: string, photo: string, database: Db) {
  if (!isSafeId(listing) || !isSafeId(photo)) return null;
  const manifest = await readManifest(listing, database);
  const row = manifest.photos.find((item) => item.id === photo);
  if (!row) return null;
  const fromDb = await getBlob(database, photoKey(listing, photo));
  if (fromDb) return { bytes: fromDb, filename: row.filename };
  try {
    return { bytes: await readFile(path.join(listingDir(listing), photo)), filename: row.filename };
  } catch {
    return null;
  }
}
