# Review

Kumba's assurance that an advertiser can let a place sits on the listing, not
on the person. Tenants see a VERIFIED label. They never see the evidence.

## The review queue

[Whether the current account is the reviewer](reaction:Review.Access.Access)
is [a flag on that account](former:Review.Access.AccessFlag). The Review link
appears only when the flag is true. Anyone else calling the queue is refused.

```endpoints
Review.Access.Access at /review/access
```

The reviewer [reads the queue](reaction:Review.Queue.Queue) of pending proof.
The [queue](former:Review.Queue.QueueItems) joins each pending verification to
the listing's public terms and to the evidence, which
[only the reviewer can read](view:Review.Queue.ReviewerEvidence). When the
evidence names a file, the reviewer can open that file here. A tenant or
advertiser calling the same queue is refused, so the evidence never leaves
this screen.

```endpoints
Review.Queue.Queue at /review/queue
```

The reviewer [verifies](reaction:Review.Deciding.Verify) or
[rejects](reaction:Review.Deciding.Reject) a pending item. Verifying records
them as `decidedBy`. Anyone else is refused by Verifying itself.

```endpoints
Review.Deciding.Verify at /review/verify
Review.Deciding.Reject at /review/reject
```
