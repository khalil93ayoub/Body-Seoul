# Body & Seoul Firebase Functions

This function sends emails when a new document is created in `orders`.

## Required Firebase setup

1. Enable Firebase Authentication with Email/Password.
2. Enable Firestore.
3. Add your frontend config in `js/firebase-config.js`.
4. Install and deploy functions:

```bash
cd firebase-functions
npm install
firebase functions:config:set   mail.host="smtp.example.com"   mail.port="587"   mail.secure="false"   mail.user="SMTP_USER"   mail.pass="SMTP_PASSWORD"   mail.from="Body & Seoul <orders@bodyandseoul.ma>"   mail.owner="YOUR_SHOP_EMAIL@example.com"
firebase deploy --only functions
```

Do not put SMTP passwords in frontend JavaScript.
