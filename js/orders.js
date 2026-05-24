(function () {
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

    function saveOrderAndStock(firebaseTools, order, items) {
        const db = firebaseTools.db;
        const orderRef = db.collection("orders").doc();

        return db.runTransaction(transaction => {
            const productRefs = items.map(item => db.collection("products").doc(item.id));

            return Promise.all(productRefs.map(ref => transaction.get(ref))).then(snapshots => {
                snapshots.forEach((snapshot, index) => {
                    const item = items[index];
                    const available = Number(snapshot.data()?.quantity || 0);

                    if (!snapshot.exists) {
                        throw new Error("Le produit " + item.title + " n'a pas encore de stock configuré.");
                    }

                    if (available < item.quantity) {
                        throw new Error("Stock insuffisant pour " + item.title + ". Disponible : " + available + ".");
                    }
                });

                snapshots.forEach((snapshot, index) => {
                    const item = items[index];
                    const nextQuantity = Number(snapshot.data().quantity || 0) - item.quantity;
                    transaction.update(productRefs[index], {
                        quantity: nextQuantity,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                });

                transaction.set(orderRef, order);
            });
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
                const order = {
                    customer,
                    items,
                    total: total(cart),
                    status: "new",
                    userId: user ? user.uid : null,
                    userEmail: user ? user.email : null,
                    emailStatus: "pending",
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                };

                return saveOrderAndStock(firebaseTools, order, items).then(() => {
                    localStorage.removeItem("cart");
                    window.BodySeoulSync?.saveStateNow?.();
                    window.BodySeoulSync?.fetchOrders?.();
                    setOrderStatus("Commande confirmée. Le stock a été mis à jour.", "success");
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
