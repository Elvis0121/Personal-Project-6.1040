import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

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

export async function saveProofFile(verification: string, file: File) {
  const { filename, type } = checkProofFile(file);
  const dir = proofDir();
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, verification), Buffer.from(await file.arrayBuffer()));
  return { filename, type };
}

export async function readProofFile(verification: string) {
  try {
    return await readFile(path.join(proofDir(), verification));
  } catch {
    return null;
  }
}
