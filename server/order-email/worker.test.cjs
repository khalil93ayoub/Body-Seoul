function runWorkerTests(code) {
  function scenario(options = {}) {
    const data = options.disabled ? {} : {
      ORDER_EMAIL_ENABLED: "true", ORDER_EMAIL_START: "2026-10-27T00:00:00Z"
    };
    let failSend = !!options.failSend;
    let failQuery = !!options.failQuery;
    let quota = options.quota === undefined ? 100 : options.quota;
    const sent = [], requests = [];
    let released = 0;
    function order(id, status = "server_pending") {
      return { name: "projects/body-and-soul-ma/databases/(default)/documents/orders/" + id,
        fields: {
          createdAt: { timestampValue: "2026-10-27T18:00:00Z" },
          emailStatus: { stringValue: status },
          customer: { mapValue: { fields: { name: { stringValue: "Test" } } } },
          items: { arrayValue: { values: [{ mapValue: { fields: {
            title: { stringValue: "Test product" },
            quantity: { integerValue: "2" }, price: { integerValue: "100" }
          } } }] } },
          subtotal: { integerValue: "200" }, deliveryFee: { integerValue: "40" },
          total: { integerValue: "240" }
        }
      };
    }
    const docs = options.docs || [order("a"), order("b")];
    const env = {
      PropertiesService: { getScriptProperties: () => ({
        getProperty: key => data[key] || null,
        setProperty: (key, value) => { data[key] = value; }
      }) },
      LockService: { getScriptLock: () => ({
        tryLock: () => !options.locked, releaseLock: () => { released++; }
      }) },
      ScriptApp: { getOAuthToken: () => "MOCK_TOKEN" },
      UrlFetchApp: { fetch: (url, request) => {
        requests.push({ url, request });
        const query = JSON.parse(request.payload).structuredQuery;
        const after = query.startAt && query.startAt.values[1].referenceValue;
        return { getResponseCode: () => failQuery ? 403 : 200,
          getContentText: () => JSON.stringify(docs
            .filter(doc => !after || doc.name > after).map(document => ({ document })))
        };
      } },
      MailApp: {
        getRemainingDailyQuota: () => quota,
        sendEmail: message => {
          if (failSend) throw Error("mock transport failure");
          sent.push(message); quota--;
        }
      }
    };
    const worker = new Function(...Object.keys(env), code +
      ";return { pollOrderEmails, verifyOrderEmailAccess };")(...Object.values(env));
    return { worker, data, sent, requests, order,
      setFailSend: value => { failSend = value; },
      setFailQuery: value => { failQuery = value; },
      setQuota: value => { quota = value; }, released: () => released };
  }
  function assert(value, message) { if (!value) throw Error(message); }
  function throws(fn) { try { fn(); } catch { return true; } return false; }
  const passed = [];
  let test = scenario();
  test.worker.pollOrderEmails(); test.worker.pollOrderEmails();
  assert(test.sent.length === 2, "must not resend accepted orders");
  assert(test.sent[0].to === "bodyandseoul.support@gmail.com", "fixed recipient");
  assert(test.sent[0].body.includes("Test product x 2") &&
    test.sent[0].body.includes("Total : 240 DHS"), "full item quantities and totals");
  assert(test.requests.every(item => item.url.endsWith(":runQuery")), "no Firestore writes");
  assert(JSON.parse(test.requests[1].request.payload).structuredQuery.startAt.before === false,
    "exclusive cursor");
  passed.push("order contents, recipient, no duplicates on next poll, read-only database");
  test = scenario({ failSend: true });
  assert(throws(() => test.worker.pollOrderEmails()), "send failure must surface");
  assert(!test.data.ORDER_EMAIL_CURSOR && test.released() === 1, "failure preserves cursor and unlocks");
  test.setFailSend(false); test.worker.pollOrderEmails();
  assert(test.sent.length === 2, "retry after send failure");
  passed.push("failed send retried without losing orders");
  test = scenario({ quota: 1 });
  assert(throws(() => test.worker.pollOrderEmails()), "quota stops batch");
  assert(test.sent.length === 1, "quota does not send second order");
  test.setQuota(10); test.worker.pollOrderEmails();
  assert(test.sent.length === 2, "resume after quota reset");
  passed.push("quota exhaustion preserves backlog");
  test = scenario({ failQuery: true });
  assert(throws(() => test.worker.pollOrderEmails()) && test.sent.length === 0, "query failure no sends");
  passed.push("permission/query failure sends nothing");
  for (const options of [{ disabled: true }, { locked: true }]) {
    test = scenario(options); test.worker.pollOrderEmails();
    assert(test.sent.length === 0 && test.requests.length === 0, "disabled/overlap guard");
  }
  passed.push("disabled and concurrent workers cannot send");
  test = scenario();
  const legacy = test.order("a", "formsubmit_pending");
  test = scenario({ docs: [legacy, test.order("b")] });
  test.worker.pollOrderEmails();
  assert(test.sent.length === 1 && test.sent[0].subject.endsWith("b"), "skip legacy email path");
  passed.push("legacy browser orders excluded");
  test = scenario(); test.worker.verifyOrderEmailAccess();
  assert(test.sent.length === 0 && !test.data.ORDER_EMAIL_CURSOR, "preflight read-only");
  passed.push("preflight sends no email");
  return passed;
}
if (typeof module !== "undefined") module.exports = { runWorkerTests };
