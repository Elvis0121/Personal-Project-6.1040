import { MongoServerError, type Collection, type Db } from "mongodb";

export class InvalidDuration extends Error {}
export class AlreadyTimed extends Error {}
export class NoSuchTimer extends Error {}
export class NotCurrent extends Error {}
export class StillCurrent extends Error {}

interface Timer {
  _id: string;
  deadline: Date;
}

const INVALID_DURATION = "A timer needs a positive duration.";
const NO_SUCH_TIMER = "There is no timer for this.";

export class ExpiringConcept {
  private readonly timers: Collection<Timer>;

  constructor(
    db: Db,
    private readonly clock: () => Date = () => new Date(),
  ) {
    this.timers = db.collection<Timer>("expiring.timers");
  }

  async start({ resource, duration }: { resource: string; duration: number }) {
    const ms = this.#duration(duration);
    const deadline = new Date(this.clock().getTime() + ms);
    try {
      await this.timers.insertOne({ _id: resource, deadline });
    } catch (error) {
      if (error instanceof MongoServerError && error.code === 11000) {
        throw new AlreadyTimed("This already has a timer.");
      }
      throw error;
    }
    return { resource, deadline };
  }

  async reschedule({ resource, duration }: { resource: string; duration: number }) {
    const ms = this.#duration(duration);
    const found = await this.#requireTimer(resource);
    const deadline = new Date(this.clock().getTime() + ms);
    await this.timers.updateOne({ _id: found._id }, { $set: { deadline } });
    return { resource, deadline };
  }

  async renew({ resource, duration }: { resource: string; duration: number }) {
    const ms = this.#duration(duration);
    const found = await this.#requireTimer(resource);
    if (found.deadline.getTime() <= this.clock().getTime()) {
      throw new NotCurrent("This is no longer current.");
    }
    const deadline = new Date(this.clock().getTime() + ms);
    await this.timers.updateOne({ _id: found._id }, { $set: { deadline } });
    return { resource, deadline };
  }

  async expire({ resource }: { resource: string }) {
    const found = await this.#requireTimer(resource);
    if (found.deadline.getTime() > this.clock().getTime()) {
      throw new StillCurrent("This is still current.");
    }
    await this.timers.deleteOne({ _id: found._id });
    return { resource };
  }

  async _isCurrent({ resource }: { resource: string }) {
    const found = await this.timers.findOne({ _id: resource });
    return { current: !!found && found.deadline.getTime() > this.clock().getTime() };
  }

  async _get({ resource }: { resource: string }) {
    const found = await this.timers.findOne({ _id: resource });
    return found ? [{ deadline: found.deadline }] : [];
  }

  async _due(_input: Record<string, never>) {
    const now = this.clock();
    const rows = await this.timers.find({ deadline: { $lte: now } }).sort({ deadline: 1, _id: 1 }).toArray();
    return rows.map(({ _id, deadline }) => ({ resource: _id, deadline }));
  }

  #duration(duration: number) {
    if (!Number.isFinite(duration) || duration <= 0) {
      throw new InvalidDuration(INVALID_DURATION);
    }
    return duration;
  }

  async #requireTimer(resource: string) {
    const found = await this.timers.findOne({ _id: resource });
    if (!found) throw new NoSuchTimer(NO_SUCH_TIMER);
    return found;
  }
}
