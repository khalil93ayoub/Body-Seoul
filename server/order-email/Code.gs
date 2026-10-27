// Run only as an authorized Firebase project administrator in Google Apps Script.
// No public web endpoint, customer emails, or product/stock writes.
const EMAIL_PROJECT = "body-and-soul-ma";
const EMAIL_RECIPIENT = "bodyandseoul.support@gmail.com";
const EMAIL_ROOT = "projects/" + EMAIL_PROJECT + "/databases/(default)/documents";

function emailProperties() {
  return PropertiesService.getScriptProperties();
}

function firestoreRequest(path, body) {
  const response = UrlFetchApp.fetch("https://firestore.googleapis.com/v1/" + path, {
    method: "post",
    contentType: "application/json",
    headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() },
    payload: JSON.stringify(body),
    muteHttpExceptions: true
  });
  if (response.getResponseCode() !== 200) {
    // Do not log order details or access tokens.
    throw new Error("Firestore query failed: HTTP " + response.getResponseCode());
  }
  return JSON.parse(response.getContentText());
}

function queryEmailOrders(cursor, startAt) {
  const query = {
    from: [{ collectionId: "orders" }],
    where: { fieldFilter: {
      field: { fieldPath: "createdAt" }, op: "GREATER_THAN_OR_EQUAL",
      value: { timestampValue: startAt }
    }},
    orderBy: [
      { field: { fieldPath: "createdAt" }, direction: "ASCENDING" },
      { field: { fieldPath: "__name__" }, direction: "ASCENDING" }
    ],
    limit: 20
  };
  if (cursor) {
    query.startAt = {
      values: [{ timestampValue: cursor.time }, { referenceValue: cursor.name }],
      before: false
    };
  }
  return firestoreRequest(EMAIL_ROOT + ":runQuery", { structuredQuery: query })
    .filter(row => row.document).map(row => row.document);
}

function decodeEmailValue(value) {
  if (!value) return null;
  if ("stringValue" in value) return value.stringValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue;
  if ("timestampValue" in value) return value.timestampValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("arrayValue" in value) return (value.arrayValue.values || []).map(decodeEmailValue);
  if ("mapValue" in value) {
    return Object.fromEntries(Object.entries(value.mapValue.fields || {})
      .map(([key, item]) => [key, decodeEmailValue(item)]));
  }
  return null;
}

function notificationForOrder(document) {
  const order = decodeEmailValue({ mapValue: { fields: document.fields } });
  const id = document.name.split("/").pop();
  const customer = order.customer || {};
  const items = Array.isArray(order.items) ? order.items : [];
  const lines = items.map(item =>
    String(item.title || item.id || "Produit") + " x " + item.quantity +
    " — " + (Number(item.price) * Number(item.quantity)) + " DHS");
  return {
    to: EMAIL_RECIPIENT,
    subject: "Nouvelle commande Body & Seoul - " + id,
    body: [
      "Commande ID : " + id,
      "Nom : " + (customer.name || "-"),
      "Téléphone : " + (customer.phone || "-"),
      "Email : " + (customer.email || "-"),
      "Adresse : " + (customer.address || "-"),
      "Notes : " + (customer.notes || "-"),
      "", ...lines, "",
      "Sous-total : " + order.subtotal + " DHS",
      "Livraison : " + order.deliveryFee + " DHS",
      "Total : " + order.total + " DHS"
    ].join("\n"),
    name: "Body & Seoul"
  };
}

// Read-only preflight: no email, trigger, or Firestore writes.
function verifyOrderEmailAccess() {
  queryEmailOrders(null, new Date().toISOString());
  return { project: EMAIL_PROJECT, recipient: EMAIL_RECIPIENT,
    remainingEmailQuota: MailApp.getRemainingDailyQuota() };
}

// Run once only after owner authorization and review of the rollout README.
function activateOrderEmails() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) throw new Error("Email worker is busy.");
  try {
    verifyOrderEmailAccess();
    const props = emailProperties();
    if (!props.getProperty("ORDER_EMAIL_START")) {
      props.setProperty("ORDER_EMAIL_START", new Date().toISOString());
    }
    const exists = ScriptApp.getProjectTriggers()
      .some(trigger => trigger.getHandlerFunction() === "pollOrderEmails");
    if (!exists) ScriptApp.newTrigger("pollOrderEmails").timeBased().everyMinutes(1).create();
    props.setProperty("ORDER_EMAIL_ENABLED", "true");
  } finally {
    lock.releaseLock();
  }
}

// Disables sending; preserves the cursor so resuming does not resend old orders.
function pauseOrderEmails() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) throw new Error("Email worker is busy; try again.");
  try { emailProperties().setProperty("ORDER_EMAIL_ENABLED", "false"); }
  finally { lock.releaseLock(); }
}

function pollOrderEmails() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return;
  try {
    const props = emailProperties();
    if (props.getProperty("ORDER_EMAIL_ENABLED") !== "true") return;
    const startAt = props.getProperty("ORDER_EMAIL_START");
    if (!startAt) throw new Error("Missing activation time; sending disabled.");
    const storedCursor = props.getProperty("ORDER_EMAIL_CURSOR");
    const cursor = storedCursor ? JSON.parse(storedCursor) : null;
    const documents = queryEmailOrders(cursor, startAt);
    const deadline = Date.now() + 45000;
    for (const document of documents) {
      if (Date.now() >= deadline) break;
      const fields = document.fields || {};
      const timestamp = fields.createdAt && fields.createdAt.timestampValue;
      if (!timestamp) throw new Error("Order is missing a server timestamp.");
      // Older pages continue using FormSubmit. Do not send those orders again.
      if (fields.emailStatus && fields.emailStatus.stringValue === "server_pending") {
        if (MailApp.getRemainingDailyQuota() < 1) {
          throw new Error("Daily email quota exhausted. Unsent orders remain pending.");
        }
        // Cursor advances only after MailApp accepts the message.
        // If sending throws, a later trigger retries this same order.
        MailApp.sendEmail(notificationForOrder(document));
      }
      props.setProperty("ORDER_EMAIL_CURSOR", JSON.stringify({
        time: timestamp, name: document.name
      }));
    }
  } finally {
    lock.releaseLock();
  }
}
