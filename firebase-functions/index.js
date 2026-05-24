const admin = require("firebase-admin");
const functions = require("firebase-functions");
const nodemailer = require("nodemailer");

admin.initializeApp();

function money(value) {
  return `${Number(value || 0)} DHS`;
}

function orderLines(items = []) {
  return items.map(item => {
    const quantity = Number(item.quantity) || 1;
    return `- ${item.title} x ${quantity} — ${money(Number(item.price || 0) * quantity)}`;
  }).join("\n");
}

exports.sendOrderEmails = functions.firestore
  .document("orders/{orderId}")
  .onCreate(async (snapshot, context) => {
    const order = snapshot.data();
    const customer = order.customer || {};
    const ownerEmail = functions.config().mail.owner;

    const transporter = nodemailer.createTransport({
      host: functions.config().mail.host,
      port: Number(functions.config().mail.port || 587),
      secure: functions.config().mail.secure === "true",
      auth: {
        user: functions.config().mail.user,
        pass: functions.config().mail.pass
      }
    });

    const lines = orderLines(order.items);
    const ownerBody = `Nouvelle commande ${context.params.orderId}

Client: ${customer.name}
Téléphone: ${customer.phone}
Adresse: ${customer.address}
Notes: ${customer.notes || "-"}

Produits:
${lines}

Total: ${money(order.total)}`;

    const customerBody = `Bonjour ${customer.name},

Merci pour votre commande Body & Seoul.

Produits:
${lines}

Total: ${money(order.total)}

Nous vous contacterons bientôt pour confirmer la livraison.`;

    const messages = [
      transporter.sendMail({
        from: functions.config().mail.from,
        to: ownerEmail,
        subject: `Nouvelle commande Body & Seoul - ${context.params.orderId}`,
        text: ownerBody
      })
    ];

    if (customer.email) {
      messages.push(transporter.sendMail({
        from: functions.config().mail.from,
        to: customer.email,
        subject: "Confirmation de votre commande Body & Seoul",
        text: customerBody
      }));
    }

    await Promise.all(messages);
    await snapshot.ref.update({ emailStatus: "sent" });
  });
