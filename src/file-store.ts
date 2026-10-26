/**
 * Bytes next to the concepts, not in them. Disk first (local / tests),
 * then Mongo so a new deploy machine still has the file.
 */
import { Binary, type Db } from "mongodb";

const stores = new WeakMap<object, Db>();

export function rememberFilesDb(application: object, database: Db) {
  stores.set(application, database);
}

export function filesDb(application: object, fallback: Db) {
  return stores.get(application) ?? fallback;
}

interface BlobDoc {
  _id: string;
  bytes: Binary;
  filename?: string;
  type?: string;
}

export async function putBlob(database: Db, key: string, bytes: Uint8Array, extra: { filename?: string; type?: string } = {}) {
  await database.collection<BlobDoc>("files.blobs").updateOne(
    { _id: key },
    { $set: { bytes: new Binary(Buffer.from(bytes)), filename: extra.filename, type: extra.type } },
    { upsert: true },
  );
}

export async function getBlob(database: Db, key: string) {
  const found = await database.collection<BlobDoc>("files.blobs").findOne({ _id: key });
  if (!found) return null;
  return Buffer.from(found.bytes.buffer);
}

export async function deleteBlob(database: Db, key: string) {
  await database.collection<BlobDoc>("files.blobs").deleteOne({ _id: key });
}

export function proofKey(verification: string) {
  return `proof:${verification}`;
}

export function photoKey(listing: string, photo: string) {
  return `photo:${listing}:${photo}`;
}

export function manifestKey(listing: string) {
  return `manifest:${listing}`;
}
