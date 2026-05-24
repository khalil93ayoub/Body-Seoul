(function () {
    let currentStock = null;
    let unsubscribe = null;

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
        currentStock = Number(quantity) || 0;
        const element = ensureStockElement();
        if (!element) return;

        element.textContent = currentStock > 0
            ? currentStock + " produits disponibles"
            : "Rupture de stock";
        element.dataset.stock = currentStock > 0 ? "available" : "empty";
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

    function init() {
        const id = productIdFromPath();
        if (!id || !document.querySelector(".product-details")) return;

        wrapQuantityControls();
        const product = findCatalogProduct(id);
        renderStock(product?.quantity || 10);

        window.BodySeoulFirebase?.load?.().then(firebaseTools => {
            if (!firebaseTools.ready) return;

            if (unsubscribe) unsubscribe();
            unsubscribe = firebaseTools.db.collection("products").doc(id).onSnapshot(doc => {
                if (!doc.exists) return;
                renderStock(doc.data().quantity);
            });
        });
    }

    window.BodySeoulStock = { init, renderStock };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
