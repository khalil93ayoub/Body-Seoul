(function () {
    const FORM_SUBMIT_TOKEN = "bf3603cc019d5aa8703d667ae52736ca";
    const FORM_SUBMIT_AJAX_ENDPOINT = "https://formsubmit.co/ajax/" + FORM_SUBMIT_TOKEN;
    const FORM_SUBMIT_FORM_ENDPOINT = "https://formsubmit.co/" + FORM_SUBMIT_TOKEN;
    const FIREBASE_TIMEOUT_MS = 8000;
    const EMAIL_TIMEOUT_MS = 15000;

    function readCart() {
        try {
            return JSON.parse(localStorage.getItem("cart") || "[]");
        } catch (error) {
            return [];
        }
    }

    function priceToNumber(price) {
        return Number(String(price || "0").replace(/[^0-9]/g, "")) || 0;
    }

    function total(cart) {
        return cart.reduce((sum, item) => sum + priceToNumber(item.price) * (Number(item.quantity) || 1), 0);
    }

    function productId(item) {
        return String(item.id || item.title || item.name || "").trim();
    }

    function setOrderStatus(message, type = "info") {
        let status = document.querySelector(".checkout-order-status");
        if (!status) {
            status = document.createElement("div");
            status.className = "checkout-order-status";
            document.querySelector(".checkout-button")?.insertAdjacentElement("afterend", status);
        }
        status.textContent = message;
        status.dataset.type = type;
    }

    function fields() {
        const form = document.querySelector(".checkout-form");
        return {
            name: form?.querySelector('[name="name"]')?.value.trim() || "",
            phone: form?.querySelector('[name="phone"]')?.value.trim() || "",
            email: form?.querySelector('[name="email"]')?.value.trim() || "",
            address: form?.querySelector('[name="address"]')?.value.trim() || "",
            notes: form?.querySelector('[name="notes"]')?.value.trim() || ""
        };
    }

    function validate(customer, cart) {
        if (!cart.length) return "Votre panier est vide.";
        if (!customer.name || !customer.phone || !customer.address) {
            return "Veuillez remplir le nom, le téléphone et l'adresse.";
        }
        return "";
    }

    function normalizeItems(cart) {
        return cart.map(item => ({
            id: productId(item),
            title: item.title || item.name,
            price: priceToNumber(item.price),
            quantity: Number(item.quantity) || 1,
            image: item.image || "",
            link: item.link || ""
        })).filter(item => item.id && item.quantity > 0);
    }

    function orderLines(items) {
        return items.map(item => {
            const quantity = Number(item.quantity) || 1;
            return item.title + " x " + quantity + " - " + (priceToNumber(item.price) * quantity) + " DHS";
        }).join("\n");
    }

    function makeOrderId() {
        const stamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
        const random = Math.random().toString(36).slice(2, 6).toUpperCase();
        return "BS-" + stamp + "-" + random;
    }

    function withTimeout(promise, ms, message) {
        let timeoutId;
        const timeout = new Promise((_, reject) => {
            timeoutId = setTimeout(() => reject(new Error(message)), ms);
        });

        return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
    }

    function loadFirebaseTools() {
        if (!window.BodySeoulFirebase?.load) {
            return Promise.resolve({ ready: false, reason: "Firebase loader missing" });
        }

        return withTimeout(
            window.BodySeoulFirebase.load(),
            FIREBASE_TIMEOUT_MS,
            "Firebase a mis trop de temps à répondre."
        ).catch(error => {
            console.warn("Body & Seoul Firebase skipped", error);
            return { ready: false, reason: error.message };
        });
    }

    function saveOrder(firebaseTools, orderId, order) {
        if (!firebaseTools?.ready) {
            return Promise.resolve(false);
        }

        return withTimeout(
            firebaseTools.db.collection("orders").doc(orderId).set(order).then(() => true),
            FIREBASE_TIMEOUT_MS,
            "La sauvegarde Firebase a mis trop de temps."
        ).catch(error => {
            console.warn("Body & Seoul order save skipped", error);
            return false;
        });
    }

    function buildEmailData(orderId, customer, items, orderTotal) {
        const data = {
            "_subject": "Nouvelle commande Body & Seoul - " + orderId,
            "_captcha": "false",
            "_template": "table",
            "Commande ID": orderId,
            "Nom complet": customer.name,
            "Téléphone": customer.phone,
            "Email": customer.email || "Non renseigné",
            "Adresse": customer.address,
            "Notes": customer.notes || "-",
            "Produits": orderLines(items),
            "Total": orderTotal + " DHS"
        };

        if (customer.email) {
            data.email = customer.email;
            data._autoresponse = "Merci pour votre commande Body & Seoul. Nous l'avons bien reçue et nous vous contacterons bientôt pour confirmer la livraison.";
        }

        return data;
    }

    function formDataFromObject(data) {
        const formData = new FormData();
        Object.entries(data).forEach(([key, value]) => formData.append(key, value));
        return formData;
    }

    function sendOrderEmailAjax(data) {
        const controller = window.AbortController ? new AbortController() : null;
        const timeoutId = controller ? setTimeout(() => controller.abort(), EMAIL_TIMEOUT_MS) : null;

        return fetch(FORM_SUBMIT_AJAX_ENDPOINT, {
            method: "POST",
            headers: { "Accept": "application/json" },
            body: formDataFromObject(data),
            signal: controller?.signal
        }).then(response => {
            if (!response.ok) {
                throw new Error("L'email de commande n'a pas pu être envoyé.");
            }
            return response.json().catch(() => ({}));
        }).finally(() => {
            if (timeoutId) clearTimeout(timeoutId);
        });
    }

    function sendOrderEmailFallback(data) {
        if (!navigator.sendBeacon) {
            return Promise.reject(new Error("Le navigateur n'a pas pu envoyer la commande."));
        }

        const sent = navigator.sendBeacon(FORM_SUBMIT_FORM_ENDPOINT, formDataFromObject(data));
        return sent
            ? Promise.resolve({ fallback: "beacon" })
            : Promise.reject(new Error("Le navigateur n'a pas pu envoyer la commande."));
    }

    function sendOrderEmail(orderId, customer, items, orderTotal) {
        const data = buildEmailData(orderId, customer, items, orderTotal);

        return sendOrderEmailAjax(data).catch(error => {
            console.warn("Body & Seoul AJAX email failed, trying fallback", error);
            return sendOrderEmailFallback(data);
        });
    }

    function finishSuccessfulOrder() {
        localStorage.removeItem("cart");
        window.BodySeoulSync?.saveStateNow?.();
        window.BodySeoulSync?.fetchOrders?.();
        setOrderStatus("Commande envoyée avec succès. Nous vous contacterons bientôt.", "success");
        if (window.renderCheckout) window.renderCheckout();
        if (window.renderCart) window.renderCart();
    }

    function initOrders() {
        const button = document.querySelector(".checkout-button");
        if (!button || button.dataset.orderReady === "true") return;
        button.dataset.orderReady = "true";

        button.addEventListener("click", event => {
            event.preventDefault();
            const cart = readCart();
            const customer = fields();
            const validation = validate(customer, cart);

            if (validation) {
                setOrderStatus(validation, "error");
                return;
            }

            const defaultButtonText = button.textContent;
            button.disabled = true;
            button.textContent = "Envoi de la commande...";
            setOrderStatus("Envoi de la commande...", "info");

            const orderId = makeOrderId();
            const items = normalizeItems(cart);
            const orderTotal = total(cart);

            loadFirebaseTools().then(firebaseTools => {
                const user = firebaseTools.ready ? firebaseTools.auth.currentUser : null;
                const order = {
                    customer,
                    items,
                    total: orderTotal,
                    status: "new",
                    userId: user ? user.uid : null,
                    userEmail: user ? user.email : null,
                    emailStatus: "formsubmit_pending",
                    stockStatus: "manual",
                    createdAt: firebaseTools.ready ? firebase.firestore.FieldValue.serverTimestamp() : new Date().toISOString()
                };

                return saveOrder(firebaseTools, orderId, order)
                    .then(() => sendOrderEmail(orderId, customer, items, orderTotal));
            }).then(finishSuccessfulOrder).catch(error => {
                console.error(error);
                setOrderStatus(error.message || "Impossible d'envoyer la commande. Réessayez.", "error");
            }).finally(() => {
                button.disabled = false;
                button.textContent = defaultButtonText;
            });
        });
    }

    window.BodySeoulOrders = { init: initOrders };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initOrders);
    } else {
        initOrders();
    }
})();
