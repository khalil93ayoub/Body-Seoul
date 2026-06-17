(function () {
    const PIXEL_ID = "691179238763479";
    const CURRENCY = "MAD";
    const ORDER_EVENT_KEY = "body_seoul_meta_orders";

    function priceToNumber(price) {
        if (typeof price === "number") {
            return price;
        }

        return Number(String(price || "0").replace(/[^0-9]/g, "")) || 0;
    }

    function readList(key) {
        try {
            return JSON.parse(localStorage.getItem(key) || "[]");
        } catch (error) {
            return [];
        }
    }

    function catalogProducts() {
        return Array.isArray(window.allProducts) ? window.allProducts : [];
    }

    function productIdFromCurrentPath() {
        const marker = "/products/";
        const path = decodeURIComponent(window.location.pathname);
        const index = path.indexOf(marker);

        if (index === -1) {
            return "";
        }

        return path.slice(index + marker.length).split("/")[0].trim();
    }

    function productIdFromLink(link = "") {
        const parts = String(link).split("/").filter(Boolean);
        const index = parts.indexOf("products");

        if (index === -1 || !parts[index + 1]) {
            return "";
        }

        return decodeURIComponent(parts[index + 1]).trim();
    }

    function findCatalogProduct(productOrId) {
        const id = typeof productOrId === "object" && productOrId !== null
            ? String(productOrId.id || productOrId.title || productOrId.name || "").trim()
            : String(productOrId || "").trim();

        return catalogProducts().find(product =>
            product.id === id ||
            product.title === id ||
            product.name === id ||
            productIdFromLink(product.link) === id
        );
    }

    function currentPageProduct() {
        const id = productIdFromCurrentPath();
        const catalogProduct = findCatalogProduct(id);

        if (catalogProduct) {
            return normalizeProduct(catalogProduct);
        }

        const title = document.querySelector(".product-title")?.textContent.replace(/\s+/g, " ").trim();
        const price = document.querySelector(".product-price")?.textContent.replace(/\s+/g, " ").trim();

        if (!id && !title) {
            return null;
        }

        return {
            id: id || title,
            title: title || id,
            name: title || id,
            price: priceToNumber(price),
            quantity: 1
        };
    }

    function normalizeProduct(productOrId, quantity = 1) {
        if (window.normalizeProduct && window.normalizeProduct !== normalizeProduct) {
            const normalized = window.normalizeProduct(productOrId);
            if (normalized) {
                return {
                    ...normalized,
                    price: priceToNumber(normalized.price),
                    quantity: Number(quantity) || Number(normalized.quantity) || 1
                };
            }
        }

        const product = typeof productOrId === "object" && productOrId !== null
            ? productOrId
            : findCatalogProduct(productOrId);

        if (!product) {
            return null;
        }

        const id = product.id || productIdFromLink(product.link) || product.title || product.name;

        return {
            id,
            title: product.title || product.name || id,
            name: product.name || product.title || id,
            price: priceToNumber(product.price),
            quantity: Number(quantity) || Number(product.quantity) || 1
        };
    }

    function normalizeItems(items) {
        return (Array.isArray(items) ? items : [])
            .map(item => normalizeProduct(item, item.quantity))
            .filter(Boolean)
            .map(item => ({
                ...item,
                quantity: Number(item.quantity) || 1
            }));
    }

    function itemPayload(item) {
        return {
            id: String(item.id),
            quantity: Number(item.quantity) || 1,
            item_price: priceToNumber(item.price)
        };
    }

    function eventPayload(items, totalValue) {
        const normalizedItems = normalizeItems(items);
        const value = typeof totalValue === "number"
            ? totalValue
            : normalizedItems.reduce((sum, item) => sum + priceToNumber(item.price) * (Number(item.quantity) || 1), 0);

        return {
            currency: CURRENCY,
            value,
            content_type: "product",
            content_ids: normalizedItems.map(item => String(item.id)),
            contents: normalizedItems.map(itemPayload),
            num_items: normalizedItems.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0)
        };
    }

    function ensurePixel() {
        if (!window.fbq) {
            !function (f, b, e, v, n, t, s) {
                if (f.fbq) return;
                n = f.fbq = function () {
                    n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
                };
                if (!f._fbq) f._fbq = n;
                n.push = n;
                n.loaded = true;
                n.version = "2.0";
                n.queue = [];
                t = b.createElement(e);
                t.async = true;
                t.src = v;
                s = b.getElementsByTagName(e)[0];
                s.parentNode.insertBefore(t, s);
            }(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
        }

        if (window.__bodySeoulMetaPixelReady) {
            return;
        }

        window.__bodySeoulMetaPixelReady = true;
        window.fbq("init", PIXEL_ID);
        window.fbq("track", "PageView");
    }

    function track(eventName, payload, options) {
        ensurePixel();
        window.fbq("track", eventName, payload || {}, options || {});
    }

    function trackCustom(eventName, payload, options) {
        ensurePixel();
        window.fbq("trackCustom", eventName, payload || {}, options || {});
    }

    function trackViewContent() {
        if (document.body.dataset.metaViewContentTracked === "true") {
            return;
        }

        const product = currentPageProduct();

        if (!product || !product.id || !window.location.pathname.includes("/products/")) {
            return;
        }

        document.body.dataset.metaViewContentTracked = "true";
        track("ViewContent", {
            ...eventPayload([product]),
            content_name: product.title || product.name
        });
    }

    function trackAddToCart(productOrId, quantity = 1) {
        const product = normalizeProduct(productOrId, quantity);

        if (!product) {
            return;
        }

        track("AddToCart", {
            ...eventPayload([product]),
            content_name: product.title || product.name
        });
    }

    function trackInitiateCheckout(items) {
        if (document.body.dataset.metaInitiateCheckoutTracked === "true") {
            return;
        }

        const cartItems = normalizeItems(items || readList("cart"));

        if (!cartItems.length) {
            return;
        }

        document.body.dataset.metaInitiateCheckoutTracked = "true";
        track("InitiateCheckout", eventPayload(cartItems));
    }

    function readTrackedOrders() {
        try {
            return JSON.parse(localStorage.getItem(ORDER_EVENT_KEY) || "[]");
        } catch (error) {
            return [];
        }
    }

    function rememberTrackedOrder(orderId) {
        const orders = readTrackedOrders().filter(Boolean).slice(-30);
        orders.push(orderId);
        localStorage.setItem(ORDER_EVENT_KEY, JSON.stringify(Array.from(new Set(orders))));
    }

    function trackOrder(orderId, items, totalValue) {
        const id = String(orderId || "").trim();

        if (!id || readTrackedOrders().includes(id)) {
            return;
        }

        const cartItems = normalizeItems(items);

        if (!cartItems.length) {
            return;
        }

        rememberTrackedOrder(id);
        trackCustom("Order", {
            ...eventPayload(cartItems, Number(totalValue) || undefined),
            order_id: id
        }, {
            eventID: id
        });
    }

    function init() {
        ensurePixel();
        trackViewContent();

        if (document.querySelector(".checkout-page")) {
            trackInitiateCheckout(readList("cart"));
        }
    }

    window.BodySeoulMeta = {
        init,
        trackAddToCart,
        trackInitiateCheckout,
        trackOrder,
        trackViewContent
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
