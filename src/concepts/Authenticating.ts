import { MongoServerError, type Collection, type Db } from "mongodb";

export class InvalidUsername extends Error {}
export class WeakPassword extends Error {}
export class UsernameTaken extends Error {}
export class InvalidCredentials extends Error {}

/** An account is identified by its username, which is also its `_id`. */
interface Account {
  _id: string;
  passwordVerifier: string;
}

const USERNAME = /^[A-Za-z0-9_-]{3,32}$/;

export class AuthenticatingConcept {
  private readonly accounts: Collection<Account>;

  constructor(db: Db) {
    this.accounts = db.collection<Account>("authenticating.accounts");
  }

  async register({ username, password }: { username: string; password: string }) {
    if (!USERNAME.test(username)) {
      throw new InvalidUsername(
        "A username must contain 3 to 32 letters, numbers, underscores, or hyphens.",
      );
    }
    if (password.length < 8 || password.length > 128) {
      throw new WeakPassword("A password must contain 8 to 128 characters.");
    }
    // Bun.password.hash salts the password and keeps the salt inside the verifier.
    const passwordVerifier = await Bun.password.hash(password);
    try {
      await this.accounts.insertOne({ _id: username, passwordVerifier });
    } catch (error) {
      if (error instanceof MongoServerError && error.code === 11000) {
        throw new UsernameTaken("That username is already registered.");
      }
      throw error;
    }
    return { account: username };
  }

  async authenticate({ username, password }: { username: string; password: string }) {
    const found = await this.accounts.findOne({ _id: username });
    if (!found || !(await Bun.password.verify(password, found.passwordVerifier))) {
      throw new InvalidCredentials("The username or password is incorrect.");
    }
    return { account: found._id };
  }
}
