import { createGateway } from "@mit-sdg/sync-engine/boundary";
import { createHttpHandler } from "@mit-sdg/sync-engine-http/handler";
import { assembleApplication } from "./assembly.ts";
import { AuthenticatingConcept, UsernameTaken } from "./concepts/Authenticating.ts";
import { AlreadyAppointed, VerifyingConcept } from "./concepts/Verifying.ts";
import { db } from "./db.ts";
import { policy } from "./http.ts";

/** Seed lives here, not in assemble: generate and check must not talk to Mongo. */
async function seedReviewer() {
  const reviewer = process.env.REVIEWER ?? "kumba";
  const password = process.env.REVIEWER_PASSWORD ?? "kumba-lets-2026";
  const authenticating = new AuthenticatingConcept(db);
  const verifying = new VerifyingConcept(db);
  try {
    await authenticating.register({ username: reviewer, password });
  } catch (error) {
    if (!(error instanceof UsernameTaken)) throw error;
  }
  try {
    await verifying.appoint({ reviewer });
  } catch (error) {
    if (!(error instanceof AlreadyAppointed)) throw error;
  }
}

await seedReviewer();

const application = assembleApplication();
const gateway = createGateway({ application });
const api = createHttpHandler({ application, gateway, policy });

const server = Bun.serve({
  hostname: process.env.HOST ?? "127.0.0.1",
  port: Number(process.env.PORT ?? 3000),
  routes: {
    "/api/*": api,
    "/health": async () => {
      try {
        await db.command({ ping: 1 }, { timeoutMS: 3000 });
        return Response.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
      } catch {
        return Response.json(
          { status: "unavailable" },
          { status: 503, headers: { "Cache-Control": "no-store" } },
        );
      }
    },
  },
});

console.log(`Backend listening on ${server.url}`);
