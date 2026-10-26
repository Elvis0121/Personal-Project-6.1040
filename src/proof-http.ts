import { accountOf, isOwned, originAllowed, publicJson, requireOwnedOpen } from "./access.ts";
import type { assembleApplication } from "./assembly.ts";
import { AlreadyCurrent, EmptyEvidence } from "./concepts/Verifying.ts";
import { UnknownSession } from "./concepts/Sessioning.ts";
import { db } from "./db.ts";
import { filesDb } from "./file-store.ts";
import { checkProofFile, contentTypeOf, readProofFile, saveProofFile } from "./proof-docs.ts";
import { formatEvidence, parseEvidence } from "./proof.ts";

type App = ReturnType<typeof assembleApplication>;

export async function submitProofUpload(request: Request, application: App) {
  const form = await request.formData();
  const listing = String(form.get("listing") ?? "");
  const gate = await requireOwnedOpen(request, application, listing);
  if (!isOwned(gate)) return gate;
  const kind = String(form.get("kind") ?? "");
  const note = String(form.get("note") ?? "");
  const file = form.get("file");
  let filename: string | undefined;
  const upload = file instanceof File && file.size > 0 ? file : null;
  if (!kind && !note.trim() && !upload) return publicJson("INVALID_REQUEST");
  if (upload) {
    try {
      ({ filename } = checkProofFile(upload));
    } catch (error) {
      if (error instanceof Error && (error.message === "too-large" || error.message === "type" || error.message === "empty")) {
        return publicJson("INVALID_REQUEST");
      }
      throw error;
    }
  }
  const evidence = formatEvidence({ kind, filename, note });
  try {
    const submitted = await application.concepts.Verifying.submit({
      advertiser: gate.owner,
      subject: gate.listing,
      evidence,
    });
    if (submitted && typeof submitted === "object" && "error" in submitted) {
      const error = (submitted as { error: string }).error;
      if (error === "EMPTY_EVIDENCE") return publicJson("EMPTY_EVIDENCE");
      if (error === "ALREADY_CURRENT") return publicJson("ALREADY_CURRENT");
      return publicJson("INVALID_REQUEST");
    }
    const verification = "verification" in submitted ? submitted.verification : undefined;
    if (typeof verification !== "string") return publicJson("INVALID_REQUEST");
    if (upload) await saveProofFile(verification, upload, filesDb(application, db));
    return Response.json({ verification });
  } catch (error) {
    if (error instanceof EmptyEvidence) return publicJson("EMPTY_EVIDENCE");
    if (error instanceof AlreadyCurrent) return publicJson("ALREADY_CURRENT");
    throw error;
  }
}

export async function downloadProof(request: Request, application: App, verification: string) {
  if (request.headers.get("Origin") && !originAllowed(request)) return publicJson("FORBIDDEN", 403);
  let reviewer: string;
  try {
    reviewer = await accountOf(request, application);
  } catch (error) {
    if (error instanceof UnknownSession) return publicJson("UNKNOWN_SESSION");
    throw error;
  }
  const { appointed } = await application.concepts.Verifying._isReviewer({ user: reviewer });
  if (!appointed) return publicJson("NOT_REVIEWER");
  const rows = await application.concepts.Verifying._evidence({ reviewer, verification });
  if (rows.length === 0) return publicJson("NO_SUCH_VERIFICATION");
  const bytes = await readProofFile(verification, filesDb(application, db));
  if (!bytes) return publicJson("NO_SUCH_VERIFICATION");
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
