# Body & Seoul Firebase Setup

Connected Firebase project: `body-and-soul-ma` (`Body and Soul`).

Created locally:
- `.firebaserc`
- `firebase.json`
- `firestore.rules`
- `firestore.indexes.json`
- `js/firebase-config.js` with the Web app config

Collections used:
- `customers/{uid}` for registered account profiles
- `orders/{orderId}` for checkout orders
- `products/{productId}` for stock and sold counters

Email confirmations are currently handled by FormSubmit from the checkout page, so Firebase Cloud Functions are not used. Do not place passwords or private keys in frontend JavaScript.
