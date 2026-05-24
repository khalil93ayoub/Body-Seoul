(function () {
    const list = document.getElementById("orders-history-list");

    function escapeHtml(value) {
        return String(value || "").replace(/[&<>"']/g, character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        }[character]));
    }

    function priceToNumber(price) {
        return Number(String(price || "0").replace(/[^0-9]/g, "")) || 0;
    }

    function productPathFromValue(value) {
        const text = String(value || "").split("\\").join("/");
        const index = text.indexOf("products/");
        return index === -1 ? "" : text.slice(index);
    }

    function productLink(item) {
        const link = String(item.link || "").trim();
        if (link.startsWith("http://") || link.startsWith("https://") || link.startsWith("file:") || link.startsWith("//")) return link;
        const productPath = productPathFromValue(link);
        if (productPath) return productPath;
        if (item.id) return "products/" + encodeURIComponent(item.id) + "/index.html";
        return "#";
    }

    function productImage(item) {
        const image = String(item.image || "").trim();
        if (image.startsWith("http://") || image.startsWith("https://") || image.startsWith("data:") || image.startsWith("file:") || image.startsWith("//")) return image;
        const productPath = productPathFromValue(image);
        if (productPath) return productPath;
        if (item.id) return "products/" + encodeURIComponent(item.id) + "/product-main.png";
        return "";
    }

    function orderDate(order) {
        const date = order.createdAt?.toDate?.();
        if (!date) return "Commande récente";
        return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
    }

    function renderEmpty(message) {
        if (!list) return;
        list.innerHTML = '<div class="orders-history-empty">' + escapeHtml(message) + '</div>';
    }

    function renderOrders(orders) {
        if (!list) return;

        if (!orders.length) {
            renderEmpty("Vous n'avez pas encore de commande.");
            return;
        }

        list.innerHTML = orders.map(order => {
            const items = Array.isArray(order.items) ? order.items : [];
            return '<article class="orders-history-card">' +
                '<button class="orders-history-head" type="button">' +
                    '<span><strong>Commande #' + escapeHtml(String(order.id || '').slice(0, 8).toUpperCase()) + '</strong><small>' + escapeHtml(orderDate(order)) + ' · ' + escapeHtml(order.status || 'new') + '</small></span>' +
                    '<b>' + priceToNumber(order.total) + ' DHS</b>' +
                    '<i class="fa-solid fa-chevron-down"></i>' +
                '</button>' +
                '<div class="orders-history-body">' +
                    items.map(item => '<a class="orders-history-product" href="' + escapeHtml(productLink(item)) + '">' +
                        '<img src="' + escapeHtml(productImage(item)) + '" alt="' + escapeHtml(item.title || item.name || '') + '">' +
                        '<span><strong>' + escapeHtml(item.title || item.name || 'Produit') + '</strong><small>Qté ' + (Number(item.quantity) || 1) + ' · ' + priceToNumber(item.price) + ' DHS</small></span>' +
                    '</a>').join('') +
                '</div>' +
            '</article>';
        }).join('');

        list.querySelectorAll('.orders-history-head').forEach(button => {
            button.addEventListener('click', () => {
                button.closest('.orders-history-card')?.classList.toggle('is-open');
            });
        });
    }

    function init() {
        if (!list) return;
        renderEmpty("Chargement de vos commandes...");

        function handleState(state) {
            if (!state.user) {
                renderEmpty("Connectez-vous à votre compte pour voir vos commandes.");
                return;
            }
            renderOrders(state.orders || []);
        }

        if (window.BodySeoulSync?.onStateChange) {
            window.BodySeoulSync.onStateChange(handleState);
            window.BodySeoulSync.fetchOrders?.();
        } else {
            document.addEventListener("bodySeoulSync", event => handleState(event.detail));
        }
    }

    window.BodySeoulOrdersHistory = { init };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
