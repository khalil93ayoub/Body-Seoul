(function () {
    let currentState = { user: null, customer: {}, cart: [], favorites: [], orders: [] };
    let initialized = false;
    let syncSubscribed = false;

    function modalHtml() {
        return '<div class="account-modal-backdrop" id="account-modal" aria-hidden="true">' +
            '<div class="account-modal" role="dialog" aria-modal="true" aria-labelledby="account-title">' +
                '<button class="account-close" type="button" aria-label="Fermer"><i class="fa-solid fa-xmark"></i></button>' +
                '<div class="account-head">' +
                    '<span>Body & Seoul</span>' +
                    '<h2 id="account-title">Mon compte</h2>' +
                    '<p id="account-subtitle">Connectez-vous ou créez votre compte pour suivre vos commandes.</p>' +
                '</div>' +
                '<div class="account-auth-view" data-account-view="auth">' +
                    '<div class="account-tabs">' +
                        '<button class="is-active" type="button" data-account-tab="login">Connexion</button>' +
                        '<button type="button" data-account-tab="register">Créer un compte</button>' +
                    '</div>' +
                    '<form class="account-form" data-account-form="login">' +
                        '<input type="email" name="email" placeholder="Email" required>' +
                        '<input type="password" name="password" placeholder="Mot de passe" required>' +
                        '<button type="submit">Se connecter</button>' +
                    '</form>' +
                    '<form class="account-form is-hidden" data-account-form="register">' +
                        '<input type="text" name="name" placeholder="Nom complet" required>' +
                        '<input type="email" name="email" placeholder="Email" required>' +
                        '<input type="password" name="password" placeholder="Mot de passe" required minlength="6">' +
                        '<button type="submit">Créer mon compte</button>' +
                    '</form>' +
                '</div>' +
                '<div class="account-dashboard is-hidden" data-account-view="dashboard"></div>' +
                '<div class="account-status" id="account-status"></div>' +
            '</div>' +
        '</div>';
    }

    function escapeHtml(value) {
        return String(value || "").replace(/[&<>"']/g, character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        }[character]));
    }

    function rootPrefix() {
        const path = decodeURIComponent(window.location.pathname);
        if (path.includes("/products/")) return "../../";
        if (path.includes("/categories/")) return "../";
        return "";
    }

    function appLink(page) {
        return rootPrefix() + String(page || "").replace(/^\/+/g, "");
    }

    function productPathFromValue(value) {
        const text = String(value || "").split("\\").join("/");
        const index = text.indexOf("products/");
        return index === -1 ? "" : text.slice(index);
    }

    function normalizedProductLink(item) {
        const link = String(item.link || "").trim();
        if (link.startsWith("http://") || link.startsWith("https://") || link.startsWith("file:") || link.startsWith("//")) return link;

        const productPath = productPathFromValue(link);
        if (productPath) return rootPrefix() + productPath;

        if (item.id) return rootPrefix() + "products/" + encodeURIComponent(item.id) + "/index.html";
        return "#";
    }

    function normalizedProductImage(item) {
        const image = String(item.image || "").trim();
        if (image.startsWith("http://") || image.startsWith("https://") || image.startsWith("data:") || image.startsWith("file:") || image.startsWith("//")) return image;

        const productPath = productPathFromValue(image);
        if (productPath) return rootPrefix() + productPath;

        if (item.id) return rootPrefix() + "products/" + encodeURIComponent(item.id) + "/product-main.png";
        return "";
    }

    function priceToNumber(price) {
        return Number(String(price || "0").replace(/[^0-9]/g, "")) || 0;
    }

    function lineTotal(item) {
        return priceToNumber(item.price) * (Number(item.quantity) || 1);
    }

    function status(message, type = "info") {
        const box = document.getElementById("account-status");
        if (!box) return;
        box.textContent = message;
        box.dataset.type = type;
    }

    function openModal() {
        document.getElementById("account-modal")?.classList.add("is-open");
        renderAccountState(currentState);
    }

    function closeModal() {
        document.getElementById("account-modal")?.classList.remove("is-open");
    }

    function setTab(tab) {
        document.querySelectorAll("[data-account-tab]").forEach(button => {
            button.classList.toggle("is-active", button.dataset.accountTab === tab);
        });
        document.querySelectorAll("[data-account-form]").forEach(form => {
            form.classList.toggle("is-hidden", form.dataset.accountForm !== tab);
        });
        status("");
    }

    function orderDate(order) {
        const date = order.createdAt?.toDate?.();
        if (!date) return "Commande récente";
        return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
    }

    function renderMiniList(items, emptyText, type) {
        if (!items.length) {
            return '<p class="account-empty">' + emptyText + '</p>';
        }

        return '<div class="account-mini-list">' + items.slice(0, 4).map(item =>
            '<a class="account-mini-item" href="' + escapeHtml(normalizedProductLink(item)) + '">' +
                '<img src="' + escapeHtml(normalizedProductImage(item)) + '" alt="' + escapeHtml(item.title || item.name || '') + '">' +
                '<span>' +
                    '<strong>' + escapeHtml(item.title || item.name || 'Produit') + '</strong>' +
                    '<small>' + (type === 'cart' ? 'Qté ' + (Number(item.quantity) || 1) + ' · ' + lineTotal(item) + ' DHS' : priceToNumber(item.price) + ' DHS') + '</small>' +
                '</span>' +
            '</a>'
        ).join('') + '</div>';
    }

    function renderOrders(orders) {
        if (!orders.length) {
            return '<p class="account-empty">Aucune commande pour le moment.</p>';
        }

        return '<div class="account-orders">' + orders.slice(0, 5).map(order =>
            '<a class="account-order" href="' + escapeHtml(appLink('orders.html')) + '">' +
                '<div>' +
                    '<strong>Commande #' + escapeHtml(String(order.id || '').slice(0, 6).toUpperCase()) + '</strong>' +
                    '<small>' + escapeHtml(orderDate(order)) + ' · ' + escapeHtml(order.status || 'new') + '</small>' +
                '</div>' +
                '<b>' + priceToNumber(order.total) + ' DHS</b>' +
            '</a>'
        ).join('') + '</div>';
    }

    function renderDashboard(state) {
        const dashboard = document.querySelector('[data-account-view="dashboard"]');
        if (!dashboard) return;

        const user = state.user;
        const name = user?.displayName || state.customer?.name || user?.email || "Client";
        const cartTotal = state.cart.reduce((sum, item) => sum + lineTotal(item), 0);
        const cartQuantity = state.cart.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);

        dashboard.innerHTML =
            '<div class="account-welcome">' +
                '<div><small>Bienvenue</small><strong>' + escapeHtml(name) + '</strong></div>' +
                '<button class="account-logout" type="button">Se déconnecter</button>' +
            '</div>' +
            '<div class="account-stats">' +
                '<a href="' + escapeHtml(appLink('orders.html')) + '"><strong>' + state.orders.length + '</strong><small>Commandes</small></a>' +
                '<a href="' + escapeHtml(appLink('favorites.html')) + '"><strong>' + state.favorites.length + '</strong><small>Favoris</small></a>' +
                '<a href="' + escapeHtml(appLink('cart.html')) + '"><strong>' + cartQuantity + '</strong><small>Panier</small></a>' +
            '</div>' +
            '<section class="account-panel"><h3>Panier actuel <b>' + cartTotal + ' DHS</b></h3>' + renderMiniList(state.cart, 'Votre panier est vide.', 'cart') + '<div class="account-panel-actions"><a href="' + escapeHtml(appLink('cart.html')) + '" class="account-panel-link secondary">Voir le panier</a><a href="' + escapeHtml(appLink('checkout.html')) + '" class="account-panel-link">Passer au checkout</a></div></section>' +
            '<section class="account-panel"><h3>Favoris</h3>' + renderMiniList(state.favorites, 'Aucun favori enregistré.', 'favorites') + '<a href="' + escapeHtml(appLink('favorites.html')) + '" class="account-panel-link">Voir tous les favoris</a></section>' +
            '<section class="account-panel"><h3>Commandes précédentes <a href="' + escapeHtml(appLink('orders.html')) + '">Voir tout</a></h3>' + renderOrders(state.orders) + '</section>';

        dashboard.querySelector('.account-logout')?.addEventListener('click', () => {
            window.BodySeoulFirebase.load().then(firebaseTools => firebaseTools.auth.signOut());
        });
    }

    function renderAccountState(state) {
        currentState = state || currentState;
        const signedIn = Boolean(currentState.user);
        const authView = document.querySelector('[data-account-view="auth"]');
        const dashboard = document.querySelector('[data-account-view="dashboard"]');
        const subtitle = document.getElementById('account-subtitle');

        authView?.classList.toggle('is-hidden', signedIn);
        dashboard?.classList.toggle('is-hidden', !signedIn);

        if (subtitle) {
            subtitle.textContent = signedIn
                ? 'Retrouvez vos commandes, vos favoris et votre panier synchronisés.'
                : 'Connectez-vous ou créez votre compte pour suivre vos commandes.';
        }

        if (signedIn) {
            renderDashboard(currentState);
            status('');
        }
    }

    function bindAuthForms() {
        document.querySelector('[data-account-form="login"]')?.addEventListener("submit", event => {
            event.preventDefault();
            const form = event.currentTarget;
            window.BodySeoulFirebase.load().then(firebaseTools => {
                if (!firebaseTools.ready) {
                    status("Firebase n'est pas encore configuré.", "error");
                    return;
                }

                status("Connexion...", "info");
                firebaseTools.auth.signInWithEmailAndPassword(form.email.value, form.password.value)
                    .then(() => {
                        status("Connexion réussie.", "success");
                        window.BodySeoulSync?.fetchOrders?.();
                    })
                    .catch(error => status(error.message, "error"));
            });
        });

        document.querySelector('[data-account-form="register"]')?.addEventListener("submit", event => {
            event.preventDefault();
            const form = event.currentTarget;
            window.BodySeoulFirebase.load().then(firebaseTools => {
                if (!firebaseTools.ready) {
                    status("Firebase n'est pas encore configuré.", "error");
                    return;
                }

                status("Création du compte...", "info");
                firebaseTools.auth.createUserWithEmailAndPassword(form.email.value, form.password.value)
                    .then(result => result.user.updateProfile({ displayName: form.name.value })
                        .then(() => firebaseTools.db.collection("customers").doc(result.user.uid).set({
                            name: form.name.value,
                            email: form.email.value,
                            cart: JSON.parse(localStorage.getItem("cart") || "[]"),
                            favorites: JSON.parse(localStorage.getItem("favorites") || "[]"),
                            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                        }, { merge: true })))
                    .then(() => {
                        status("Compte créé avec succès.", "success");
                        window.BodySeoulSync?.saveStateNow?.();
                    })
                    .catch(error => status(error.message, "error"));
            });
        });
    }

    function initAccount() {
        if (!document.getElementById("account-modal")) {
            document.body.insertAdjacentHTML("beforeend", modalHtml());
            bindAuthForms();
        }

        document.querySelectorAll(".account-button, .header-icons > .icon-box:first-child, .mobile-bottom-nav a[href='#']").forEach(button => {
            if (button.dataset.accountReady === "true") return;
            button.dataset.accountReady = "true";
            button.addEventListener("click", event => {
                event.preventDefault();
                openModal();
            });
        });

        if (!initialized) {
            initialized = true;

            document.querySelector(".account-close")?.addEventListener("click", closeModal);
            document.getElementById("account-modal")?.addEventListener("click", event => {
                if (event.target.id === "account-modal") closeModal();
            });
            document.querySelectorAll("[data-account-tab]").forEach(button => {
                button.addEventListener("click", () => setTab(button.dataset.accountTab));
            });
        }

        if (!syncSubscribed) {
            syncSubscribed = true;

            if (window.BodySeoulSync?.onStateChange) {
                window.BodySeoulSync.onStateChange(renderAccountState);
            } else {
                document.addEventListener("bodySeoulSync", event => renderAccountState(event.detail));
            }
        }
    }

    window.BodySeoulAccount = { init: initAccount, render: renderAccountState, open: openModal, close: closeModal };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initAccount);
    } else {
        initAccount();
    }
})();
