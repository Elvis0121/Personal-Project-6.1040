import { MongoClient, type Db } from "mongodb";

export interface TestDb {
  db: Db;
  close(): Promise<void>;
}

/** Opens a fresh database for one test file in the MongoDB from compose.yaml. */
export async function openTestDb(): Promise<TestDb> {
  const url = process.env.MONGODB_URL;
  if (!url) throw new Error("MONGODB_URL is not set. Add it to .env.");

  const client = new MongoClient(url, { serverSelectionTimeoutMS: 3000 });
  try {
    await client.connect();
  } catch {
    throw new Error("Could not reach MongoDB. Start it with `bun run db:up`.");
  }
  const db = client.db(`test-${crypto.randomUUID()}`);

  return {
    db,
    async close() {
      await db.dropDatabase();
      await client.close();
    },
  };
}
