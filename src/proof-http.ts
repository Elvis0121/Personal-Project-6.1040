import type { assembleApplication } from "./assembly.ts";
import { AlreadyCurrent, EmptyEvidence } from "./concepts/Verifying.ts";
import { UnknownSession } from "./concepts/Sessioning.ts";
import { checkProofFile, contentTypeOf, readProofFile, saveProofFile } from "./proof-docs.ts";
import { formatEvidence, parseEvidence } from "./proof.ts";

type App = ReturnType<typeof assembleApplication>;

const ORIGIN = process.env.PUBLIC_ORIGIN ?? "http://127.0.0.1:8080";

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

async function userOf(request: Request, application: App) {
  const current = await application.concepts.Sessioning.current({ session: sessionCookie(request) });
  if (isRefusal(current) || typeof current.subject !== "string") throw new UnknownSession();
  return current.subject;
}

export async function submitProofUpload(request: Request, application: App) {
  const origin = request.headers.get("Origin");
  if (origin && origin !== ORIGIN) return json("FORBIDDEN", 403);
  let advertiser: string;
  try {
    advertiser = await userOf(request, application);
  } catch (error) {
    if (error instanceof UnknownSession) return json("UNAUTHORIZED", 401);
    throw error;
  }
  const form = await request.formData();
  const listing = String(form.get("listing") ?? "");
  const kind = String(form.get("kind") ?? "");
  const note = String(form.get("note") ?? "");
  const file = form.get("file");
  const found = (await application.concepts.Listing._get({ listing }))[0];
  if (!found) return json("NOT_FOUND", 404);
  if (found.owner !== advertiser) return json("FORBIDDEN", 403);
  if (found.status !== "OPEN") return json("CONFLICT", 409);
  let filename: string | undefined;
  const upload = file instanceof File && file.size > 0 ? file : null;
  if (!kind && !note.trim() && !upload) return json("INVALID_REQUEST", 400);
  if (upload) {
    try {
      ({ filename } = checkProofFile(upload));
    } catch (error) {
      if (error instanceof Error && (error.message === "too-large" || error.message === "type" || error.message === "empty")) {
        return json("INVALID_REQUEST", 400);
      }
      throw error;
    }
  }
  const evidence = formatEvidence({ kind, filename, note });
  try {
    const submitted = await application.concepts.Verifying.submit({
      advertiser,
      subject: listing,
      evidence,
    });
    if (isRefusal(submitted)) {
      if (submitted.error === "EMPTY_EVIDENCE") return json("INVALID_REQUEST", 400);
      if (submitted.error === "ALREADY_CURRENT") return json("CONFLICT", 409);
      return json("INVALID_REQUEST", 400);
    }
    if (upload) await saveProofFile(submitted.verification, upload);
    return Response.json({ verification: submitted.verification });
  } catch (error) {
    if (error instanceof EmptyEvidence) return json("INVALID_REQUEST", 400);
    if (error instanceof AlreadyCurrent) return json("CONFLICT", 409);
    throw error;
  }
}

export async function downloadProof(request: Request, application: App, verification: string) {
  let reviewer: string;
  try {
    reviewer = await userOf(request, application);
  } catch (error) {
    if (error instanceof UnknownSession) return json("UNAUTHORIZED", 401);
    throw error;
  }
  const { appointed } = await application.concepts.Verifying._isReviewer({ user: reviewer });
  if (!appointed) return json("FORBIDDEN", 403);
  const rows = await application.concepts.Verifying._evidence({ reviewer, verification });
  if (rows.length === 0) return json("NOT_FOUND", 404);
  const bytes = await readProofFile(verification);
  if (!bytes) return json("NOT_FOUND", 404);
  const { filename } = parseEvidence(rows[0]!.evidence);
  const downloadName = filename ?? "document";
  return new Response(bytes, {
    headers: {
      "Content-Type": contentTypeOf(downloadName),
      "Content-Disposition": `attachment; filename="${downloadName.replaceAll('"', "")}"`,
      "Cache-Control": "no-store",
    },
  });
}

export function withProofRoutes(jsonApi: (request: Request) => Promise<Response>, application: App) {
  return async (request: Request) => {
    const url = new URL(request.url);
    const type = request.headers.get("Content-Type") ?? "";
    if (
      request.method === "POST" &&
      url.pathname === "/api/listings/submit-proof" &&
      type.includes("multipart/form-data")
    ) {
      return submitProofUpload(request, application);
    }
    const file = url.pathname.match(/^\/api\/review\/proof\/([^/]+)$/);
    if (request.method === "GET" && file) return downloadProof(request, application, decodeURIComponent(file[1]!));
    return jsonApi(request);
  };
}
