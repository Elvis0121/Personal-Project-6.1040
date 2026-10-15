# Sessioning

## Purpose

Keep a short-lived opaque session for an external subject, so temporary access
can end without changing that subject's identity.

## Principle

A session is started for subject `tinashe`. Until it expires, `current`
resolves the session to `tinashe`. Ending the session makes it unknown, so
another `current` call is refused. An invented or expired session is refused in
the same way.

## Types

```types
external Subject
  The identity a session stands for.
```

## State

```state
a set of Sessions with
  a subject Subject
  an expiresAt DateTime
```

## Actions

```actions
start (subject: Subject) : returns (session: Session, expiresAt: DateTime)
  where true
  then
    delete every expired session
    add a new opaque session for subject expiring 24 hours from now
    returns session, expiresAt

current (session: Session) : returns (subject: Subject)
  where session is unknown, ended, or expired
  then
    delete the session if it is expired
    refuses UNKNOWN_SESSION "You are not signed in, or your session has ended."
  where session is active
  then
    returns subject

end (session: Session) : returns (ended: Flag)
  where session is unknown, ended, or expired
  then
    delete the session if it is expired
    refuses UNKNOWN_SESSION "You are not signed in, or your session has ended."
  where session is active
  then
    delete session
    returns ended
```

## Queries

```queries
_active (session: Session) : optional (subject: Subject, expiresAt: DateTime)
  answers no row for an unknown, ended, or expired session
```
