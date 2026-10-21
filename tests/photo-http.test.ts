/**
 * Listing photos sit beside Listing, like proof files sit beside Verifying.
 * Search and view receive a public URL. Tenants never upload; only the owner does.
 */
import { afterAll, beforeAll, beforeEach, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createGateway } from "@mit-sdg/sync-engine/boundary";
import { createHttpHandler } from "@mit-sdg/sync-engine-http/handler";
import { assembleApplication } from "../src/assembly.ts";
import { policy } from "../src/http.ts";
import { withPhotoRoutes } from "../src/photo-http.ts";
import { withProofRoutes } from "../src/proof-http.ts";
import { openTestDb, type TestDb } from "./test-db.ts";

const ORIGIN = "http://127.0.0.1:8080";
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
let photoDir: string;
let previousPhotoDir: string | undefined;
let application: ReturnType<typeof assembleApplication>;
let handle: (request: Request) => Promise<Response>;

beforeAll(async () => {
  testDb = await openTestDb();
  previousPhotoDir = process.env.PHOTO_DIR;
  photoDir = await mkdtemp(path.join(os.tmpdir(), "kumba-photo-"));
  process.env.PHOTO_DIR = photoDir;
});

beforeEach(async () => {
  await testDb.db.dropDatabase();
  application = assembleApplication(testDb.db);
  handle = withPhotoRoutes(
    withProofRoutes(createHttpHandler({ application, gateway: createGateway({ application }), policy }), application),
    application,
  );
});

afterAll(async () => {
  await testDb.close();
  await rm(photoDir, { recursive: true, force: true });
  if (previousPhotoDir === undefined) delete process.env.PHOTO_DIR;
  else process.env.PHOTO_DIR = previousPhotoDir;
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

function jpeg() {
  return new File([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], "front.jpg", { type: "image/jpeg" });
}

async function upload(listing: string, cookie: string, file = jpeg()) {
  const form = new FormData();
  form.set("listing", listing);
  form.set("file", file);
  const response = await handle(
    new Request("http://127.0.0.1:3000/api/listings/photos", {
      method: "POST",
      headers: { Origin: ORIGIN, Cookie: cookie },
      body: form,
    }),
  );
  return { status: response.status, body: (await response.json()) as Record<string, string> };
}

test("the advertiser can upload a photo; search and view point at it as the display photo", async () => {
  const dube = await register("mrsdube", "avondale-cottage");
  const { listing } = (await post("/listings/publish", cottage, dube)).body;
  const uploaded = await upload(listing, dube);
  expect(uploaded.status).toBe(200);
  expect(uploaded.body.photo).toBeString();
  expect(uploaded.body.display).toBe(true);
  expect(uploaded.body.url).toBe(`/api/listings/photo/${listing}/${uploaded.body.photo}`);

  const bytes = await handle(new Request(`http://127.0.0.1:3000${uploaded.body.url}`));
  expect(bytes.status).toBe(200);
  expect(bytes.headers.get("Content-Type")).toBe("image/jpeg");

  const search = await post("/listings/search", { area: "avondale", maxRent: 200 });
  expect(search.body.results.listings[0].displayPhoto).toBe(uploaded.body.url);

  const view = await post("/listings/view", { listing });
  expect(view.body.terms.displayPhoto).toBe(uploaded.body.url);
  expect(view.body.terms.photos).toEqual([
    { photo: uploaded.body.photo, filename: "front.jpg", display: true, url: uploaded.body.url },
  ]);
});

test("a stranger cannot upload or pick the display photo; a second photo can become the display", async () => {
  const dube = await register("mrsdube", "avondale-cottage");
  const tinashe = await register("tinashe", "mbare-2026");
  const { listing } = (await post("/listings/publish", cottage, dube)).body;
  const first = await upload(listing, dube);
  expect((await upload(listing, tinashe)).status).toBe(403);
  expect((await upload(listing, tinashe)).body.error).toBe("FORBIDDEN");

  const second = await upload(listing, dube, new File([new Uint8Array([0xff, 0xd8, 0xff, 0xda])], "yard.png", { type: "image/png" }));
  expect(second.status).toBe(200);
  expect(second.body.display).toBe(false);

  const chosen = await post("/listings/photos/display", { listing, photo: second.body.photo }, dube);
  expect(chosen.status).toBe(200);
  expect((await post("/listings/search", { area: "avondale", maxRent: 200 })).body.results.listings[0].displayPhoto).toBe(
    second.body.url,
  );

  expect((await post("/listings/photos/display", { listing, photo: second.body.photo }, tinashe)).body.error).toBe(
    "FORBIDDEN",
  );

  const removed = await post("/listings/photos/remove", { listing, photo: second.body.photo }, dube);
  expect(removed.status).toBe(200);
  const mine = await post("/listings/mine", {}, dube);
  expect(mine.body.mine.listings[0].photos).toHaveLength(1);
  expect(mine.body.mine.listings[0].displayPhoto).toBe(first.body.url);
});

test("unsigned visitors cannot upload, and a missing photo is not found", async () => {
  const dube = await register("mrsdube", "avondale-cottage");
  const { listing } = (await post("/listings/publish", cottage, dube)).body;
  expect((await upload(listing, "")).status).toBe(401);
  const missing = await handle(new Request("http://127.0.0.1:3000/api/listings/photo/no-such/no-such"));
  expect(missing.status).toBe(404);
});
