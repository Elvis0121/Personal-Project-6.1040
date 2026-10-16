import { MongoServerError, type Collection, type Db } from "mongodb";

export class SelfIntroduction extends Error {}
export class AlreadyRequested extends Error {}
export class NoSuchIntroduction extends Error {}
export class NotHolder extends Error {}
export class AlreadyAnswered extends Error {}
export class MissingContact extends Error {}

export type Status = "PENDING" | "ACCEPTED" | "DECLINED";

interface IntroductionDoc {
  _id: string;
  requester: string;
  holder: string;
  subject: string;
  status: Status;
  contact?: string;
}

export class IntroducingConcept {
  private readonly introductions: Collection<IntroductionDoc>;
  private indexed = false;

  constructor(db: Db) {
    this.introductions = db.collection<IntroductionDoc>("introducing.introductions");
  }

  async request({ requester, holder, subject }: { requester: string; holder: string; subject: string }) {
    if (requester === holder) {
      throw new SelfIntroduction("You cannot ask to be introduced to yourself.");
    }
    if (!this.indexed) {
      // One introduction per requester and subject, even when two requests race.
      await this.introductions.createIndex({ requester: 1, subject: 1 }, { unique: true });
      this.indexed = true;
    }
    // Version 7 UUIDs sort by creation time, which orders requests as they arrived.
    const introduction = Bun.randomUUIDv7();
    try {
      await this.introductions.insertOne({ _id: introduction, requester, holder, subject, status: "PENDING" });
    } catch (error) {
      if (error instanceof MongoServerError && error.code === 11000) {
        throw new AlreadyRequested("You have already asked about this.");
      }
      throw error;
    }
    return { introduction };
  }

  async accept({ holder, introduction, contact }: { holder: string; introduction: string; contact: string }) {
    await this.#pendingFor(holder, introduction);
    if (typeof contact !== "string" || contact.trim() === "") {
      throw new MissingContact("A contact is needed to accept an introduction.");
    }
    await this.#answer(introduction, { status: "ACCEPTED", contact: contact.trim() });
    return { introduction };
  }

  async decline({ holder, introduction }: { holder: string; introduction: string }) {
    await this.#pendingFor(holder, introduction);
    await this.#answer(introduction, { status: "DECLINED" });
    return { introduction };
  }

  async reset({ subject }: { subject: string }) {
    await this.introductions.deleteMany({ subject, status: { $in: ["PENDING", "DECLINED"] } });
    return {};
  }

  async _get({ introduction }: { introduction: string }) {
    const found = await this.introductions.findOne({ _id: introduction });
    if (!found) return [];
    const { requester, holder, subject, status } = found;
    return [{ requester, holder, subject, status }];
  }

  async _mine({ requester, subject }: { requester: string; subject: string }) {
    const found = await this.introductions.findOne({ requester, subject });
    return found ? [{ introduction: found._id, status: found.status }] : [];
  }

  async _disclosed({ requester, subject }: { requester: string; subject: string }) {
    const found = await this.introductions.findOne({ requester, subject, status: "ACCEPTED" });
    return found?.contact ? [{ contact: found.contact }] : [];
  }

  async _received({ holder, subject }: { holder: string; subject: string }) {
    const rows = await this.introductions.find({ holder, subject }).sort({ _id: 1 }).toArray();
    return rows.map(({ _id, requester, status }) => ({ introduction: _id, requester, status }));
  }

  async #pendingFor(holder: string, introduction: string) {
    const found = await this.introductions.findOne({ _id: introduction });
    if (!found) throw new NoSuchIntroduction("There is no such introduction.");
    if (found.holder !== holder) {
      throw new NotHolder("Only the person who was asked can answer this request.");
    }
    if (found.status !== "PENDING") throw new AlreadyAnswered("This request has already been answered.");
  }

  /** Answers the request only if nobody answered it since it was read. */
  async #answer(introduction: string, answer: Partial<IntroductionDoc>) {
    const result = await this.introductions.updateOne(
      { _id: introduction, status: "PENDING" },
      { $set: answer },
    );
    if (result.matchedCount === 0) throw new AlreadyAnswered("This request has already been answered.");
  }
}
