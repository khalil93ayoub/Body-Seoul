# Draft: order email independent of the customer's browser

Status: prepared and mock-tested, NOT installed or activated. Do not deploy
orders.candidate.js until the Apps Script worker is authorized and tested.

The website saves an order with emailStatus=server_pending. An Apps Script time
trigger reads these saved orders every minute and sends one notification to
bodyandseoul.support@gmail.com. Closing the customer's tab after the saved-order
confirmation does not stop this worker. Closing before Firestore acknowledges
the write still cannot be treated as a successful order.

Stock stays manual. The worker only reads Firestore; it never changes products,
orders, rules, billing, or customer accounts. Customer confirmation emails are
not included. The recipient is fixed in Code.gs; order data cannot choose it.

## Cost and timing
No Firebase Blaze upgrade or SMTP subscription is needed for this proposed
Apps Script approach within Google's no-cost quotas. Consumer Apps Script
accounts currently allow 100 email recipients/day, 90 minutes of trigger runtime/day,
and 20,000 URL fetches/day. Firebase reads also count against the project's quota.
The script checks once per minute, but scheduling and inbox delivery may take
longer; this is not an instant-delivery guarantee.

## Owner setup (required before launch)
1. Create a standalone Apps Script project at https://script.google.com/ using a
   Google account authorized to read orders in Firebase project body-and-soul-ma.
   The Gmail connector in ChatGPT does not grant Apps Script this authorization.
2. Copy Code.gs into that project. Enable manifest visibility in Project Settings
   and copy appsscript.json. Do not add this script to checkout or expose it as a
   public web app. No service account key or password belongs in GitHub.
3. In Apps Script Project Settings, associate a suitable standard Google Cloud
   project (normally the existing Firebase project's project number), configure
   the OAuth consent screen for the owner, and ensure the Cloud Firestore API is
   enabled. The running Google account needs IAM permission to query Firestore
   (Datastore Viewer is enough for this read-only worker). Browser Firebase
   Authentication is not a substitute. Resolve any OAuth testing-mode refresh
   token expiration before relying on a long-running production trigger.
4. Run verifyOrderEmailAccess and approve the requested permissions. This
   function queries no historical order contents, sends no email and installs
   no trigger. It must succeed before proceeding.
5. Review the fixed recipient and run activateOrderEmails. This installs one
   minute trigger and records an activation time. It does not import old orders.
   Do not create another copy of the worker in another Apps Script project.
6. On a PRIVATE checkout preview, use orders.candidate.js instead of js/orders.js.
   Submit one clearly labelled test order and close the tab AFTER the order
   reference appears. Verify the actual inbox notification and Apps Script
   execution log. This is a real order/email test and has NOT been done here.
7. Only after that succeeds, publish orders.candidate.js as js/orders.js and bump
   the orders.js cache version in js/components-loader.js and that loader's
   version in checkout.html. Keep the worker running. Do not publish just the
   frontend without a functioning worker.

The checkout candidate preserves the saved-order receipt, disabled submit
button, manual stock and existing tracking behavior. It removes browser
FormSubmit sends. Existing cached pages remain on FormSubmit and are explicitly
skipped by this worker, so those pages retain the old limitation until refreshed.

## Retry behavior and monitoring
A failed send leaves the cursor on the same pending order; the next trigger
tries again. Quota exhaustion similarly preserves the backlog. The worker
processes up to 20 orders per run in timestamp/document-ID order, keeps a
persistent cursor, and uses a script lock to prevent overlapping runs.
The cursor is stored in Script Properties; do not delete or reset it casually.

MailApp accepting a message is not proof of inbox delivery. There is also a
small duplicate-notification risk if an email is accepted but execution stops
before the cursor is saved, or if a send reports an ambiguous failure.
This implementation favors retrying rather than silently losing the order.
It does not provide exactly-once email delivery.

A persistent failure on one order blocks subsequent queued orders. Monitor
Apps Script Executions and Google's trigger-failure notifications; resolve
the error, then allow the next run to retry. Runtime/API quota exhaustion can
delay the entire queue. The emailStatus field in Firestore is a routing marker,
not a delivered receipt; the worker does not update order documents.

Run pauseOrderEmails to pause future sending without deleting the cursor.
Run activateOrderEmails to resume. Do not pause during a frontend rollback until
all already-saved server_pending orders have been handled.

Previously missed test or customer orders need a separately reviewed recovery:
the old browser version left emailStatus=formsubmit_pending even when its
message succeeded, so that field cannot identify missing emails safely.
No historical orders are resent automatically by this draft.

## Validation
worker.test.cjs uses mocks only, with no network or real emails:
- saved-order details and fixed recipient
- repeat polling does not resend accepted orders
- send failure retries without advancing the cursor
- quota exhaustion resumes from the backlog
- Firestore authorization failure sends nothing
- disabled/concurrent workers cannot send
- old FormSubmit orders are skipped
- access preflight is read-only

Run with Node:
node -e "const fs=require('fs'); const t=require('./server/order-email/worker.test.cjs'); console.log(t.runWorkerTests(fs.readFileSync('./server/order-email/Code.gs','utf8')))"

Checkout candidate also passed mock tests for pending save, successful receipt,
failed save, manual stock, no browser email request and repeated-click prevention.
Production authorization, quota availability and end-to-end delivery remain unverified.

References:
- https://developers.google.com/apps-script/guides/triggers/installable
- https://developers.google.com/apps-script/guides/services/quotas
- https://firebase.google.com/docs/firestore/use-rest-api
