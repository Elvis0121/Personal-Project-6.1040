import type { Collection, Db } from "mongodb";

export class UnknownSession extends Error {}

interface Session {
  _id: string;
  subject: string;
  expiresAt: Date;
}

const SESSION_LIFETIME_MS = 24 * 60 * 60 * 1000;
const UNKNOWN = "You are not signed in, or your session has ended.";

export class SessioningConcept {
  private readonly sessions: Collection<Session>;

  constructor(
    db: Db,
    private readonly clock: () => Date = () => new Date(),
  ) {
    this.sessions = db.collection<Session>("sessioning.sessions");
  }

  async start({ subject }: { subject: string }) {
    const now = this.clock();
    await this.sessions.deleteMany({ expiresAt: { $lte: now } });
    const session = crypto.randomUUID();
    const expiresAt = new Date(now.getTime() + SESSION_LIFETIME_MS);
    await this.sessions.insertOne({ _id: session, subject, expiresAt });
    return { session, expiresAt };
  }

  async current({ session }: { session: string }) {
    const found = await this.#active(session);
    return { subject: found.subject };
  }

  async end({ session }: { session: string }) {
    await this.#active(session);
    await this.sessions.deleteOne({ _id: session });
    return { ended: true };
  }

  async _active({ session }: { session: string }) {
    if (typeof session !== "string") return [];
    const found = await this.sessions.findOne({ _id: session, expiresAt: { $gt: this.clock() } });
    return found ? [{ subject: found.subject, expiresAt: found.expiresAt }] : [];
  }

  /** The session cookie is `null` when the browser has none, so the type is checked here. */
  async #active(session: string): Promise<Session> {
    if (typeof session !== "string") throw new UnknownSession(UNKNOWN);
    const found = await this.sessions.findOne({ _id: session });
    if (!found) throw new UnknownSession(UNKNOWN);
    if (found.expiresAt <= this.clock()) {
      await this.sessions.deleteOne({ _id: session });
      throw new UnknownSession(UNKNOWN);
    }
    return found;
  }
}
