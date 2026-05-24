const headerStore = (() => {
    try {
        if (window.localStorage) return window.localStorage;
    } catch (error) {}

    function readStore() {
        try { return JSON.parse(window.name || "{}"); } catch (error) { return {}; }
    }

    function writeStore(store) {
        try { window.name = JSON.stringify(store); } catch (error) {}
    }

    return {
        getItem(key) { return readStore()[key] || null; },
        setItem(key, value) {
            const store = readStore();
            store[key] = String(value);
            writeStore(store);
        }
    };
})();

function headerRootPrefix() {
    const path = decodeURIComponent(window.location.pathname);
    if (path.includes("/products/")) return "../../";
    if (path.includes("/categories/")) return "../";
    return "";
}

function headerReadList(key) {
    try { return JSON.parse(headerStore.getItem(key) || "[]"); } catch (error) { return []; }
}

function headerSaveList(key, value) {
    headerStore.setItem(key, JSON.stringify(value));
    window.BodySeoulSync?.schedulePush?.();
}

function headerPrice(price) {
    return Number(String(price || "0").replace(/[^0-9]/g, "")) || 0;
}

function headerProductPath(value) {
    const text = String(value || "").split("\\").join("/");
    const index = text.indexOf("products/");
    return index === -1 ? "" : text.slice(index);
}

function headerProductLink(product) {
    const link = String(product.link || "").trim();
    if (link.startsWith("http://") || link.startsWith("https://") || link.startsWith("file:") || link.startsWith("//")) return link;
    const productPath = headerProductPath(link);
    if (productPath) return headerRootPrefix() + productPath;
    if (product.id) return headerRootPrefix() + "products/" + encodeURIComponent(product.id) + "/index.html";
    return "#";
}

function headerProductImage(product) {
    const image = String(product.image || "").trim();
    if (image.startsWith("http://") || image.startsWith("https://") || image.startsWith("data:") || image.startsWith("file:") || image.startsWith("//")) return image;
    const productPath = headerProductPath(image);
    if (productPath) return headerRootPrefix() + productPath;
    if (product.id) return headerRootPrefix() + "products/" + encodeURIComponent(product.id) + "/product-main.png";
    return "";
}

function headerPageLink(page) {
    return headerRootPrefix() + String(page || "").replace(/^\/+/, "");
}

function headerRenderEmpty(container, message) {
    container.innerHTML = '<p class="header-dropdown-empty">' + message + '</p>';
}

function headerMiniProductHtml(product) {
    const title = product.name || product.title || "Produit";
    return '<a href="' + headerProductLink(product) + '" class="header-mini-thumb">' +
        '<img src="' + headerProductImage(product) + '" alt="' + title + '">' +
        '</a>' +
        '<div class="header-mini-info">' +
        '<a href="' + headerProductLink(product) + '">' + title + '</a>' +
        '<span>' + headerPrice(product.price) + ' DHS</span>' +
        '</div>';
}

function headerRenderFavorites() {
    const list = document.getElementById("header-favorites-list");
    const count = document.getElementById("favorites-count");
    if (!list || !count) return;

    const favorites = headerReadList("favorites");
    count.textContent = favorites.length;
    list.innerHTML = "";

    const seeAll = document.querySelector('#favorites-dropdown .header-dropdown-head a');
    if (seeAll) seeAll.href = headerPageLink('favorites.html');

    if (!favorites.length) {
        headerRenderEmpty(list, "Aucun favori pour le moment.");
        return;
    }

    favorites.slice(0, 4).forEach(product => {
        const item = document.createElement("div");
        item.className = "header-mini-item";
        item.innerHTML = headerMiniProductHtml(product) +
            '<button type="button" class="header-mini-remove" aria-label="Retirer des favoris">' +
            '<i class="fa-solid fa-trash-can"></i>' +
            '</button>';

        item.querySelector(".header-mini-remove").addEventListener("click", event => {
            event.preventDefault();
            event.stopPropagation();
            headerSaveList("favorites", headerReadList("favorites").filter(item => item.id !== product.id));
            headerRenderFavorites();
            window.renderFavorites?.();
            window.updateFavoriteButtons?.();
        });

        list.appendChild(item);
    });
}

function headerRenderCart() {
    const list = document.getElementById("header-cart-list");
    const count = document.getElementById("cart-count");
    const total = document.getElementById("header-cart-total");
    if (!list || !count || !total) return;

    const cart = headerReadList("cart");
    const quantity = cart.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);
    const totalValue = cart.reduce((sum, item) => sum + headerPrice(item.price) * (Number(item.quantity) || 1), 0);
    count.textContent = quantity;
    total.textContent = totalValue + " DHS";
    list.innerHTML = "";

    const cartLink = document.querySelector('#cart-dropdown .header-dropdown-head a');
    const checkoutLink = document.querySelector('#cart-dropdown .header-checkout-button');
    if (cartLink) cartLink.href = headerPageLink('cart.html');
    if (checkoutLink) checkoutLink.href = headerPageLink('checkout.html');

    if (!cart.length) {
        headerRenderEmpty(list, "Votre panier est vide.");
        return;
    }

    cart.slice(0, 4).forEach(product => {
        const item = document.createElement("div");
        item.className = "header-mini-item header-cart-item";
        item.innerHTML = headerMiniProductHtml(product) +
            '<div class="header-mini-qty">' +
            '<button type="button" class="mini-decrease">−</button>' +
            '<span>' + (Number(product.quantity) || 1) + '</span>' +
            '<button type="button" class="mini-increase">+</button>' +
            '</div>' +
            '<button type="button" class="header-mini-remove" aria-label="Supprimer du panier">' +
            '<i class="fa-solid fa-trash-can"></i>' +
            '</button>';

        item.querySelector(".mini-increase").addEventListener("click", event => {
            event.preventDefault();
            event.stopPropagation();
            headerUpdateCartQuantity(product.id, 1);
        });

        item.querySelector(".mini-decrease").addEventListener("click", event => {
            event.preventDefault();
            event.stopPropagation();
            headerUpdateCartQuantity(product.id, -1);
        });

        item.querySelector(".header-mini-remove").addEventListener("click", event => {
            event.preventDefault();
            event.stopPropagation();
            headerSaveList("cart", headerReadList("cart").filter(item => item.id !== product.id));
            headerRenderCart();
            window.renderCart?.();
            window.renderCheckout?.();
        });

        list.appendChild(item);
    });
}

function headerUpdateCartQuantity(productId, amount) {
    let cart = headerReadList("cart");
    const product = cart.find(item => item.id === productId);
    if (!product) return;

    product.quantity = (Number(product.quantity) || 1) + amount;
    if (product.quantity <= 0) cart = cart.filter(item => item.id !== productId);

    headerSaveList("cart", cart);
    headerRenderCart();
    window.renderCart?.();
    window.renderCheckout?.();
}

function headerCloseDropdowns(exceptId) {
    document.querySelectorAll(".header-dropdown").forEach(dropdown => {
        if (dropdown.id !== exceptId) dropdown.classList.remove("is-open");
    });
}

function initHeaderDropdowns() {
    headerRenderFavorites();
    headerRenderCart();

    document.querySelectorAll(".header-action").forEach(button => {
        if (button.dataset.ready === "true") return;
        button.dataset.ready = "true";
        button.addEventListener("click", event => {
            event.preventDefault();
            event.stopPropagation();
            const dropdown = document.getElementById(button.dataset.dropdown);
            if (!dropdown) return;
            const willOpen = !dropdown.classList.contains("is-open");
            headerCloseDropdowns(dropdown.id);
            dropdown.classList.toggle("is-open", willOpen);
            headerRenderFavorites();
            headerRenderCart();
        });
    });

    if (!document.body.dataset.headerDropdownsReady) {
        document.body.dataset.headerDropdownsReady = "true";
        document.addEventListener("click", event => {
            if (!event.target.closest(".header-dropdown-wrap")) headerCloseDropdowns();
        });
    }
}

window.initHeaderDropdowns = initHeaderDropdowns;
