import type { Collection, Db } from "mongodb";

export class InvalidReviewer extends Error {}
export class AlreadyAppointed extends Error {}
export class EmptyEvidence extends Error {}
export class AlreadyCurrent extends Error {}
export class NotReviewer extends Error {}
export class NoSuchVerification extends Error {}
export class NotPending extends Error {}
export class NotVerified extends Error {}

export type Status = "PENDING" | "VERIFIED" | "REJECTED";

interface Appointed {
  _id: string;
}

interface VerificationDoc {
  _id: string;
  advertiser: string;
  subject: string;
  evidence: string;
  status: Status;
  decidedBy?: string;
}

export class VerifyingConcept {
  private readonly appointed: Collection<Appointed>;
  private readonly verifications: Collection<VerificationDoc>;

  constructor(db: Db) {
    this.appointed = db.collection<Appointed>("verifying.appointed");
    this.verifications = db.collection<VerificationDoc>("verifying.verifications");
  }

  async appoint({ reviewer }: { reviewer: string }) {
    if (typeof reviewer !== "string" || reviewer.trim() === "") {
      throw new InvalidReviewer("A reviewer needs a username.");
    }
    const name = reviewer.trim();
    if ((await this.appointed.countDocuments({}, { limit: 1 })) > 0) {
      throw new AlreadyAppointed("A reviewer has already been appointed.");
    }
    await this.appointed.insertOne({ _id: name });
    return { reviewer: name };
  }

  async submit({
    advertiser,
    subject,
    evidence,
  }: {
    advertiser: string;
    subject: string;
    evidence: string;
  }) {
    if (typeof evidence !== "string" || evidence.trim() === "") {
      throw new EmptyEvidence("Proof cannot be empty.");
    }
    const current = await this.verifications.findOne({
      subject,
      status: { $in: ["PENDING", "VERIFIED"] },
    });
    if (current) throw new AlreadyCurrent("This already has proof waiting or verified.");
    const verification = Bun.randomUUIDv7();
    await this.verifications.insertOne({
      _id: verification,
      advertiser,
      subject,
      evidence: evidence.trim(),
      status: "PENDING",
    });
    return { verification };
  }

  async verify({ reviewer, verification }: { reviewer: string; verification: string }) {
    await this.#requireReviewer(reviewer);
    const found = await this.#pending(verification);
    await this.verifications.updateOne(
      { _id: verification, status: "PENDING" },
      { $set: { status: "VERIFIED", decidedBy: reviewer } },
    );
    return { verification: found._id };
  }

  async reject({ reviewer, verification }: { reviewer: string; verification: string }) {
    await this.#requireReviewer(reviewer);
    const found = await this.#pending(verification);
    await this.verifications.updateOne(
      { _id: verification, status: "PENDING" },
      { $set: { status: "REJECTED", decidedBy: reviewer } },
    );
    return { verification: found._id };
  }

  async revoke({ subject }: { subject: string }) {
    const found = await this.verifications.findOne({ subject, status: "VERIFIED" });
    if (!found) throw new NotVerified("This is not verified.");
    // Status only. decidedBy stays so a false verification still has an author.
    const result = await this.verifications.updateOne(
      { _id: found._id, status: "VERIFIED" },
      { $set: { status: "REJECTED" } },
    );
    if (result.matchedCount === 0) throw new NotVerified("This is not verified.");
    return {};
  }

  async _isReviewer({ user }: { user: string }) {
    return { appointed: (await this.appointed.countDocuments({ _id: user }, { limit: 1 })) > 0 };
  }

  async _isVerified({ subject }: { subject: string }) {
    const count = await this.verifications.countDocuments(
      { subject, status: "VERIFIED" },
      { limit: 1 },
    );
    return { verified: count > 0 };
  }

  async _forSubject({ subject }: { subject: string }) {
    const found = await this.verifications.findOne({
      subject,
      status: { $in: ["PENDING", "VERIFIED"] },
    });
    if (!found) return [];
    return [
      {
        verification: found._id,
        status: found.status,
        decidedBy: found.decidedBy ?? null,
      },
    ];
  }

  async _pending(_input: Record<string, never>) {
    const rows = await this.verifications.find({ status: "PENDING" }).sort({ _id: 1 }).toArray();
    return rows.map(({ _id, advertiser, subject }) => ({
      verification: _id,
      advertiser,
      subject,
    }));
  }

  async _get({ verification }: { verification: string }) {
    const found = await this.verifications.findOne({ _id: verification });
    if (!found) return [];
    return [
      {
        advertiser: found.advertiser,
        subject: found.subject,
        status: found.status,
        decidedBy: found.decidedBy ?? null,
      },
    ];
  }

  async _evidence({ reviewer, verification }: { reviewer: string; verification: string }) {
    if (!(await this.#isAppointed(reviewer))) return [];
    const found = await this.verifications.findOne({ _id: verification });
    return found ? [{ evidence: found.evidence }] : [];
  }

  async #isAppointed(user: string) {
    return (await this.appointed.countDocuments({ _id: user }, { limit: 1 })) > 0;
  }

  async #requireReviewer(reviewer: string) {
    if (!(await this.#isAppointed(reviewer))) {
      throw new NotReviewer("Only the appointed reviewer can decide this.");
    }
  }

  async #pending(verification: string): Promise<VerificationDoc> {
    const found = await this.verifications.findOne({ _id: verification });
    if (!found) throw new NoSuchVerification("There is no such proof.");
    if (found.status !== "PENDING") throw new NotPending("This proof has already been decided.");
    return found;
  }
}
