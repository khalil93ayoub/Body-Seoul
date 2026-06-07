(function () {
    const FORM_SUBMIT_ENDPOINT = "https://formsubmit.co/ajax/bf3603cc019d5aa8703d667ae52736ca";
    const DELIVERY_FEE = 40;
    const FREE_DELIVERY_THRESHOLD = 500;

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

    function deliveryFeeForSubtotal(subtotal) {
        return subtotal > 0 && subtotal < FREE_DELIVERY_THRESHOLD ? DELIVERY_FEE : 0;
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

    function saveOrder(firebaseTools, order) {
        const orderRef = firebaseTools.db.collection("orders").doc();
        return orderRef.set(order).then(() => orderRef.id);
    }

    function sendOrderEmail(orderId, customer, items, subtotal, deliveryFee, orderTotal) {
        const formData = new FormData();
        const lines = orderLines(items);

        formData.append("_subject", "Nouvelle commande Body & Seoul - " + orderId);
        formData.append("_captcha", "false");
        formData.append("_template", "table");
        formData.append("Commande ID", orderId);
        formData.append("Nom complet", customer.name);
        formData.append("Téléphone", customer.phone);
        formData.append("Email", customer.email || "Non renseigné");
        formData.append("Adresse", customer.address);
        formData.append("Notes", customer.notes || "-");
        formData.append("Produits", lines);
        formData.append("Sous-total", subtotal + " DHS");
        formData.append("Frais de livraison", deliveryFee ? deliveryFee + " DHS" : "Offerte");
        formData.append("Total", orderTotal + " DHS");

        if (customer.email) {
            formData.append("email", customer.email);
            formData.append("_autoresponse", "Merci pour votre commande Body & Seoul. Nous l'avons bien reçue et nous vous contacterons bientôt pour confirmer la livraison.");
        }

        return fetch(FORM_SUBMIT_ENDPOINT, {
            method: "POST",
            headers: { "Accept": "application/json" },
            body: formData
        }).then(response => {
            if (!response.ok) {
                throw new Error("L'email de commande n'a pas pu être envoyé.");
            }
            return response.json().catch(() => ({}));
        });
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

            button.disabled = true;
            setOrderStatus("Envoi de la commande...", "info");

            window.BodySeoulFirebase.load().then(firebaseTools => {
                if (!firebaseTools.ready) {
                    setOrderStatus("Firebase n'est pas encore configuré. La commande n'a pas été envoyée.", "error");
                    button.disabled = false;
                    return;
                }

                const user = firebaseTools.auth.currentUser;
                const items = normalizeItems(cart);
                const subtotal = total(cart);
                const deliveryFee = deliveryFeeForSubtotal(subtotal);
                const orderTotal = subtotal + deliveryFee;
                const order = {
                    customer,
                    items,
                    subtotal,
                    deliveryFee,
                    total: orderTotal,
                    status: "new",
                    userId: user ? user.uid : null,
                    userEmail: user ? user.email : null,
                    emailStatus: "formsubmit_pending",
                    stockStatus: "manual",
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                };

                return saveOrder(firebaseTools, order)
                    .then(orderId => sendOrderEmail(orderId, customer, items, subtotal, deliveryFee, orderTotal).then(() => orderId))
                    .then(orderId => {
                        localStorage.removeItem("cart");
                        window.BodySeoulSync?.saveStateNow?.();
                        window.BodySeoulSync?.fetchOrders?.();
                        setOrderStatus("Commande envoyée avec succès. Nous vous contacterons bientôt.", "success");
                        if (window.renderCheckout) window.renderCheckout();
                        if (window.renderCart) window.renderCart();
                    });
            }).catch(error => {
                console.error(error);
                setOrderStatus(error.message || "Impossible d'envoyer la commande. Réessayez.", "error");
            }).finally(() => {
                button.disabled = false;
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
