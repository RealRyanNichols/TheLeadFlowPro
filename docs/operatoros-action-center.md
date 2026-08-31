# OperatorOS Action Center

The Action Center is the human-controlled bridge between an OperatorOS recommendation and a real external action.

## Operating rule

OperatorOS may research, draft, prioritize, schedule, and record. It does not send a prospect message from the Action Center.

The required sequence is:

1. Review the public evidence and observed business gap.
2. Load the decision-maker's business contact route and source.
3. Mark contact information verified only after a human checks it.
4. Edit the permission-first draft.
5. Approve the exact draft.
6. Send it through the selected human-controlled channel.
7. Mark it sent so the next action and audit trail advance.
8. Paste any real reply into the Response Planner.
9. Review the recommended answer and timing before another human send.

A changed draft automatically returns to the queued state and requires approval again.

## New routes

- `/admin/operator/action-center` — prioritized operating queue
- `/admin/operator/prospects/[id]` — decision-maker details, active drafts, response planning, and audit history
- `/admin/operator/setup` — readiness checks and non-secret operating inputs
- `/dashboard/war-room` — client mission and delivery view
- `/proof-floor` — public, aggregate operating proof

## Non-secret inputs

The Setup page stores:

- Sender display name
- Sender business email
- Sender business phone
- Booking URL
- Outbound owner
- Closer / decision owner
- Default market
- Daily new-contact and follow-up limits
- Reply-time target
- Allowed outreach channels
- Operating notes and exclusions

API keys, access tokens, webhook secrets, and service-role credentials must never be pasted into these fields or into chat. They belong in protected Vercel environment variables or the existing encrypted provider configuration.

## Provider and execution boundary

The Response Planner may use ChatGPT or Claude only when both conditions are true:

1. A supported provider key is configured server-side.
2. `OPERATOROS_EXECUTION_ENABLED` is exactly `true`.

Otherwise the planner uses the deterministic, permission-first fallback. This lets the workflow remain usable while the provider kill switch is on.

## Audit events

The Action Center writes durable events for:

- Prospect detail changes
- Draft edits
- Human approvals
- Reopened drafts
- Skipped actions
- Human-recorded sends
- Planned replies
- Declined / do-not-contact replies

Every send event explicitly records that OperatorOS did not perform the external send.

## Activation checklist

1. Confirm the sender identity and booking URL in Setup.
2. Confirm Pat's outbound authority and Ryan's decision boundary.
3. Confirm permitted channels and daily limits.
4. Load and verify the first five Priority A contacts.
5. Review any professional-practice compliance warning before approval.
6. Approve and manually send one controlled message.
7. Mark it sent and verify the next action advances.
8. Paste a test reply from an internal test record, not a real prospect, and verify the planner queues a new recommendation.
9. Confirm the public Proof Floor exposes only aggregate data.
10. Keep content publishing in draft-only mode until the Facebook connection is healthy and a human approves each post.
