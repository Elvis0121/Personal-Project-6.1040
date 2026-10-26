import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Db } from "mongodb";
import { getBlob, proofKey, putBlob } from "./file-store.ts";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Map([
  ["application/pdf", "pdf"],
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

export function proofDir() {
  return process.env.PROOF_DIR ?? path.join(process.cwd(), "data", "proofs");
}

export function contentTypeOf(filename: string) {
  const ext = path.extname(filename).toLowerCase();
  if (ext === ".pdf") return "application/pdf";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  return "application/octet-stream";
}

export function safeFilename(name: string) {
  return path.basename(name).replace(/[^\w.\-]+/g, "-").slice(0, 80) || "document";
}

export function checkProofFile(file: File) {
  if (file.size === 0) throw new Error("empty");
  if (file.size > MAX_BYTES) throw new Error("too-large");
  const type = file.type || contentTypeOf(file.name);
  if (!ALLOWED.has(type)) throw new Error("type");
  const ext = ALLOWED.get(type)!;
  const filename = safeFilename(file.name.endsWith(`.${ext}`) ? file.name : `${file.name}.${ext}`);
  return { filename, type };
}

async function tryDiskWrite(filePath: string, bytes: Buffer) {
  try {
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, bytes);
  } catch {
    // live disk is often read-only
  }
}

export async function saveProofFile(verification: string, file: File, database: Db) {
  const { filename, type } = checkProofFile(file);
  const bytes = Buffer.from(await file.arrayBuffer());
  await putBlob(database, proofKey(verification), bytes, { filename, type });
  await tryDiskWrite(path.join(proofDir(), verification), bytes);
  return { filename, type };
}

export async function readProofFile(verification: string, database: Db) {
  const fromDb = await getBlob(database, proofKey(verification));
  if (fromDb) return fromDb;
  try {
    return await readFile(path.join(proofDir(), verification));
  } catch {
    return null;
  }
}
