# Review

VERIFIED is on the listing, not the person. tenants see the label. they never
see the evidence.

## The review queue

[Whether the current account is the reviewer](reaction:Review.Access.Access)
is [a flag on that account](former:Review.Access.AccessFlag). Review link only
shows if that's true. anyone else hitting the queue is refused.

```endpoints
Review.Access.Access at /review/access
```

The reviewer [reads the queue](reaction:Review.Queue.Queue) of pending proof.
The [queue](former:Review.Queue.QueueItems) joins each pending verification to
the listing's public terms and to the evidence, which
[only the reviewer can read](view:Review.Queue.ReviewerEvidence). if evidence
names a file they open it here. tenant or advertiser calling the same queue
is refused, so the file doesnt leave this screen.

```endpoints
Review.Queue.Queue at /review/queue
```

The reviewer [verifies](reaction:Review.Deciding.Verify) or
[rejects](reaction:Review.Deciding.Reject) a pending item. records them as
`decidedBy`. anyone else is refused by Verifying itself.

```endpoints
Review.Deciding.Verify at /review/verify
Review.Deciding.Reject at /review/reject
```
