/**
 * Multipart proof sits beside the JSON submit-proof route. The file lives on
 * disk; the evidence string only names the kind and the filename. Tenants never
 * receive either.
 */
import { afterAll, beforeAll, beforeEach, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createGateway } from "@mit-sdg/sync-engine/boundary";
import { createHttpHandler } from "@mit-sdg/sync-engine-http/handler";
import { assembleApplication } from "../src/assembly.ts";
import { VerifyingConcept } from "../src/concepts/Verifying.ts";
import { policy } from "../src/http.ts";
import { withProofRoutes } from "../src/proof-http.ts";
import { parseEvidence } from "../src/proof.ts";
import { openTestDb, type TestDb } from "./test-db.ts";

const ORIGIN = "http://127.0.0.1:8080";
const bill = "rates bill, City of Harare, Avondale cottage, Sept 2026";
const cottage = {
  location: "Avondale, Harare",
  kind: "Cottage",
  currency: "USD",
  rent: 150,
  deposit: 150,
  extras: "Water billed separately. No viewing fee.",
  moveIn: "2026-11-01",
  contact: "0772 429 864",
};

let testDb: TestDb;
let proofDir: string;
let previousProofDir: string | undefined;
let application: ReturnType<typeof assembleApplication>;
let handle: (request: Request) => Promise<Response>;

beforeAll(async () => {
  testDb = await openTestDb();
  previousProofDir = process.env.PROOF_DIR;
  proofDir = await mkdtemp(path.join(os.tmpdir(), "kumba-proof-"));
  process.env.PROOF_DIR = proofDir;
});

beforeEach(async () => {
  await testDb.db.dropDatabase();
  application = assembleApplication(testDb.db);
  handle = withProofRoutes(createHttpHandler({ application, gateway: createGateway({ application }), policy }), application);
});

afterAll(async () => {
  await testDb.close();
  await rm(proofDir, { recursive: true, force: true });
  if (previousProofDir === undefined) delete process.env.PROOF_DIR;
  else process.env.PROOF_DIR = previousProofDir;
});

async function post(pathName: string, body: object, cookie?: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json", Origin: ORIGIN };
  if (cookie) headers.Cookie = cookie;
  const response = await handle(
    new Request(`http://127.0.0.1:3000/api${pathName}`, { method: "POST", headers, body: JSON.stringify(body) }),
  );
  return { status: response.status, body: await response.json(), setCookie: response.headers.get("set-cookie") };
}

async function register(username: string, password: string): Promise<string> {
  const { status, setCookie } = await post("/auth/register", { username, password });
  expect(status).toBe(200);
  return setCookie!.split(";")[0]!;
}

test("JSON submit-proof still works when the upload routes are wrapped in", async () => {
  await new VerifyingConcept(testDb.db).appoint({ reviewer: "kumba" });
  const dube = await register("mrsdube", "avondale-cottage");
  const { listing } = (await post("/listings/publish", cottage, dube)).body;
  const submitted = await post("/listings/submit-proof", { listing, evidence: bill }, dube);
  expect(submitted.status).toBe(200);
  expect(submitted.body.verification).toBeString();
});

test("an advertiser can upload a classified document; only the reviewer can open it", async () => {
  const kumba = await register("kumba", "kumba-lets-2026");
  await new VerifyingConcept(testDb.db).appoint({ reviewer: "kumba" });
  const dube = await register("mrsdube", "avondale-cottage");
  const tinashe = await register("tinashe", "mbare-2026");
  const { listing } = (await post("/listings/publish", cottage, dube)).body;

  const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
  const form = new FormData();
  form.set("listing", listing);
  form.set("kind", "Electricity bill");
  form.set("note", "ZESA, Sept 2026");
  form.set("file", new File([bytes], "zesa.jpg", { type: "image/jpeg" }));

  const uploaded = await handle(
    new Request("http://127.0.0.1:3000/api/listings/submit-proof", {
      method: "POST",
      headers: { Origin: ORIGIN, Cookie: dube },
      body: form,
    }),
  );
  const uploadedBody = (await uploaded.json()) as { verification?: string; error?: string };
  expect(uploaded.status).toBe(200);
  const verification = uploadedBody.verification!;
  expect(verification).toBeString();

  const queue = await post("/review/queue", {}, kumba);
  expect(queue.body.queue.items[0].evidence).toBe("Electricity bill\nfile:zesa.jpg\nZESA, Sept 2026");
  expect(parseEvidence(queue.body.queue.items[0].evidence)).toEqual({
    kind: "Electricity bill",
    filename: "zesa.jpg",
    note: "ZESA, Sept 2026",
  });

  const search = await post("/listings/search", { area: "avondale", maxRent: 200 });
  expect(JSON.stringify(search.body)).not.toContain("zesa.jpg");
  expect(JSON.stringify(search.body)).not.toContain("Electricity bill");
  expect(JSON.stringify(search.body)).not.toContain("ZESA");

  const asTenant = await handle(
    new Request(`http://127.0.0.1:3000/api/review/proof/${verification}`, { headers: { Cookie: tinashe } }),
  );
  expect(asTenant.status).toBe(403);

  const asReviewer = await handle(
    new Request(`http://127.0.0.1:3000/api/review/proof/${verification}`, { headers: { Cookie: kumba } }),
  );
  expect(asReviewer.status).toBe(200);
  expect(asReviewer.headers.get("Content-Type")).toBe("image/jpeg");
  expect(asReviewer.headers.get("Content-Disposition")).toContain("zesa.jpg");
  expect(new Uint8Array(await asReviewer.arrayBuffer())).toEqual(bytes);

  await rm(path.join(proofDir, verification), { force: true });
  const afterDiskGone = await handle(
    new Request(`http://127.0.0.1:3000/api/review/proof/${verification}`, { headers: { Cookie: kumba } }),
  );
  expect(afterDiskGone.status).toBe(200);
  expect(new Uint8Array(await afterDiskGone.arrayBuffer())).toEqual(bytes);
});

test("a text file is not proof", async () => {
  await new VerifyingConcept(testDb.db).appoint({ reviewer: "kumba" });
  const dube = await register("mrsdube", "avondale-cottage");
  const { listing } = (await post("/listings/publish", cottage, dube)).body;
  const form = new FormData();
  form.set("listing", listing);
  form.set("kind", "Other");
  form.set("file", new File(["hello"], "notes.txt", { type: "text/plain" }));
  const response = await handle(
    new Request("http://127.0.0.1:3000/api/listings/submit-proof", {
      method: "POST",
      headers: { Origin: ORIGIN, Cookie: dube },
      body: form,
    }),
  );
  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({ error: "INVALID_REQUEST" });
});
