# Kumba application types

Everyone in Kumba is identified by their Authenticating account, which is their
username. The same account can advertise one place and search for another, so
there is no separate tenant or landlord role.

- A session stands for the account whose password was accepted.
- A listing's owner is the account that published it.
- An introduction's requester is the tenant's account and its holder is the
  listing owner's account.
- An introduction is about a listing.

```instances
instantiate Authenticating

instantiate Sessioning with
  Subject is Authenticating.Account

instantiate Listing with
  User is Authenticating.Account

instantiate Introducing with
  User is Authenticating.Account
  Subject is Listing.Listing
```
