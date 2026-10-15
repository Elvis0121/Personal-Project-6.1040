# Sessions

Sessions connect an accepted username and password to an opaque session, which
the browser keeps in a cookie. Every other request is resolved through that
session, so a caller can never claim to be someone else.

[Registering creates an account and starts a session](reaction:Sessions.EnteringApplication.Register)
for it, and [signing in checks the password and starts a new session](reaction:Sessions.EnteringApplication.SignIn).
In both cases the session's subject is the account that Authenticating
returned, never one the caller chose.

```endpoints
Sessions.EnteringApplication.Register at /auth/register
Sessions.EnteringApplication.SignIn at /auth/sign-in
```

An [active session resolves to its account](reaction:Sessions.CurrentAccount.CurrentUser),
which lets the interface show who is signed in after a reload. An unknown,
ended, or expired session is refused.

```endpoints
Sessions.CurrentAccount.CurrentUser at /auth/current
```

[Signing out ends the session](reaction:Sessions.LeavingApplication.SignOut),
after which it no longer grants access to anything.

```endpoints
Sessions.LeavingApplication.SignOut at /auth/sign-out
```
