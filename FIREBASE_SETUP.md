# Body & Seoul Firebase Setup

Connected Firebase project: `body-and-soul-ma` (`Body and Soul`).

Created locally:
- `.firebaserc`
- `firebase.json`
- `firestore.rules`
- `firestore.indexes.json`
- `js/firebase-config.js` with the Web app config
- `firebase-functions/` email function template

Collections used:
- `customers/{uid}` for registered account profiles
- `orders/{orderId}` for checkout orders

Email confirmations require SMTP config before deploying functions:

```bash
cd /Users/ayoubkhalil/Downloads/Body-Seoul-main
firebase functions:config:set \
  mail.host="smtp.example.com" \
  mail.port="587" \
  mail.secure="false" \
  mail.user="SMTP_USER" \
  mail.pass="SMTP_PASSWORD" \
  mail.from="Body & Seoul <orders@bodyandseoul.ma>" \
  mail.owner="YOUR_SHOP_EMAIL@example.com"
firebase deploy --only functions
```

Do not place SMTP passwords in frontend JavaScript.
