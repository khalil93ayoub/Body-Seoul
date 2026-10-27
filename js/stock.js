(function () {
    let currentStock = null;
    let unsubscribers = [];

    function productIdFromPath() {
        const match = decodeURIComponent(location.pathname).match(new RegExp("/products/([^/]+)"));
        return match ? match[1].trim() : "";
    }

    function findCatalogProduct(id) {
        if (!Array.isArray(window.allProducts)) return null;
        return window.allProducts.find(product => product.id === id || product.title === id || window.productIdFromLink?.(product.link) === id);
    }

    function ensureStockElement() {
        if (!document.querySelector(".product-details")) return null;

        let element = document.querySelector(".product-stock-note");
        if (element) return element;

        element = document.createElement("p");
        element.className = "product-stock-note";

        const sizeNote = document.querySelector(".product-size-note");
        const price = document.querySelector(".product-price");
        (sizeNote || price)?.insertAdjacentElement("afterend", element);
        return element;
    }

    function setButtonsState(quantity) {
        const soldOut = Number(quantity) <= 0;
        document.querySelectorAll(".add-cart-button, .product-cart").forEach(button => {
            button.disabled = soldOut;
            button.classList.toggle("is-disabled", soldOut);
        });
    }

    function renderStock(quantity) {
        currentStock = Math.max(0, Number(quantity) || 0);
        const element = ensureStockElement();
        if (!element) return;

        const language = window.BodySeoulLanguage?.getLanguage?.() || "fr";

        if (currentStock <= 0) {
            element.textContent = language === "ar" ? "غير متوفر" : "Rupture de stock";
            element.dataset.stock = "empty";
        } else if (currentStock <= 2) {
            element.textContent = language === "ar"
                ? (currentStock === 1 ? "بقيت قطعة واحدة فقط" : "بقيت قطعتان فقط")
                : (currentStock === 1 ? "Plus qu’un article en stock" : "Plus que 2 articles en stock");
            element.dataset.stock = "low";
        } else {
            element.textContent = language === "ar" ? "متوفر" : "Disponible";
            element.dataset.stock = "available";
        }

        setButtonsState(currentStock);
    }

    function wrapQuantityControls() {
        if (window.__bodySeoulStockQuantityWrapped) return;
        window.__bodySeoulStockQuantityWrapped = true;

        const originalIncrease = window.increaseQuantity;
        window.increaseQuantity = function () {
            if (currentStock !== null && window.quantity >= currentStock) {
                return;
            }
            return originalIncrease?.apply(this, arguments);
        };
    }

    function componentRequirements(product, fallbackId) {
        const ids = product?.isPack && Array.isArray(product.items) && product.items.length
            ? product.items
            : [fallbackId];
        const required = new Map();

        ids.forEach(componentId => {
            const id = String(componentId || "").trim();
            if (!id) return;
            required.set(id, (required.get(id) || 0) + 1);
        });

        return Array.from(required, ([id, quantity]) => ({ id, quantity }));
    }

    function clearSubscriptions() {
        unsubscribers.forEach(unsubscribe => unsubscribe?.());
        unsubscribers = [];
    }

    function watchStock(firebaseTools, product, fallbackId) {
        const requirements = componentRequirements(product, fallbackId);
        const quantities = new Map();

        clearSubscriptions();

        requirements.forEach(requirement => {
            const unsubscribe = firebaseTools.db.collection("products").doc(requirement.id).onSnapshot(doc => {
                if (!doc.exists) return;

                quantities.set(requirement.id, Number(doc.data().quantity) || 0);

                if (quantities.size !== requirements.length) return;

                const available = requirements.reduce((lowest, item) => {
                    const componentStock = Math.floor((quantities.get(item.id) || 0) / item.quantity);
                    return Math.min(lowest, componentStock);
                }, Number.POSITIVE_INFINITY);

                renderStock(Number.isFinite(available) ? available : 0);
            });

            unsubscribers.push(unsubscribe);
        });
    }

    function init() {
        const id = productIdFromPath();
        if (!id || !document.querySelector(".product-details")) return;

        wrapQuantityControls();
        const product = findCatalogProduct(id);
        renderStock(product?.quantity || 10);

        window.BodySeoulFirebase?.load?.().then(firebaseTools => {
            if (!firebaseTools.ready) return;
            watchStock(firebaseTools, product, id);
        });
    }

    window.BodySeoulStock = { init, renderStock };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
