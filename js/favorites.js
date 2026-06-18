const favoriteStorage = window.appStorage || (() => {
    try {
        if (window.localStorage) {
            return window.localStorage;
        }
    } catch (error) {
        // Fall back to memory storage when browser storage is unavailable.
    }

    function readStore() {
        try {
            return JSON.parse(window.name || "{}");
        } catch (error) {
            return {};
        }
    }

    function writeStore(store) {
        window.name = JSON.stringify(store);
    }

    return {
        getItem(key) {
            return readStore()[key] || null;
        },
        setItem(key, value) {
            const store = readStore();
            store[key] = String(value);
            writeStore(store);
        }
    };
})();

let favorites = [];

function favoriteRootPrefix() {
    const path = decodeURIComponent(window.location.pathname);
    if (path.includes("/products/")) return "../../";
    if (path.includes("/categories/")) return "../";
    return "";
}

function favoriteProductPath(value) {
    const text = String(value || "").split("\\").join("/");
    const index = text.indexOf("products/");
    return index === -1 ? "" : text.slice(index);
}

function favoriteProductLink(product) {
    const link = String(product.link || "").trim();
    if (link.startsWith("http://") || link.startsWith("https://") || link.startsWith("file:") || link.startsWith("//")) return link;
    const productPath = favoriteProductPath(link);
    if (productPath) return favoriteRootPrefix() + productPath;
    if (product.id) return favoriteRootPrefix() + "products/" + encodeURIComponent(product.id) + "/index.html";
    return "#";
}

function favoriteProductImage(product) {
    const image = String(product.image || "").trim();
    if (image.startsWith("http://") || image.startsWith("https://") || image.startsWith("data:") || image.startsWith("file:") || image.startsWith("//")) return image;
    const productPath = favoriteProductPath(image);
    if (productPath) return favoriteRootPrefix() + productPath;
    if (product.id) return favoriteRootPrefix() + "products/" + encodeURIComponent(product.id) + "/product-main.png";
    return "";
}

function favoritePriceToNumber(price) {
    if (typeof priceToNumber === "function") return priceToNumber(price);
    return Number(String(price || "0").replace(/[^0-9]/g, "")) || 0;
}

function favoriteTrackAddToCart(product, quantity = 1) {
    if (typeof fbq !== "function" || !product) {
        return;
    }

    const quantityValue = Number(quantity) || 1;
    const priceValue = favoritePriceToNumber(product.price);
    const productId = String(product.id || product.title || product.name || "").trim();

    if (!productId) {
        return;
    }

    fbq("track", "AddToCart", {
        content_ids: [productId],
        content_name: product.title || product.name || productId,
        contents: [{
            id: productId,
            quantity: quantityValue,
            item_price: priceValue
        }],
        content_type: "product",
        currency: "MAD",
        value: priceValue * quantityValue,
        num_items: quantityValue
    });
}


function favoriteAddToCart(product) {
    if (typeof addToCart === "function") {
        addToCart(product);
        return;
    }

    let cart = [];
    try { cart = JSON.parse(favoriteStorage.getItem("cart") || "[]"); } catch (error) { cart = []; }
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
        existing.quantity = (Number(existing.quantity) || 1) + 1;
    } else {
        cart.push({ ...product, quantity: 1 });
    }
    favoriteStorage.setItem("cart", JSON.stringify(cart));
    favoriteTrackAddToCart(product, 1);
    window.BodySeoulSync?.schedulePush?.();
    window.initHeaderDropdowns?.();
}


function favoriteId(productOrId) {
    if (typeof productOrId === "object" && productOrId !== null) {
        return productOrId.id || productOrId.title;
    }

    if (typeof normalizeId === "function") {
        return normalizeId(productOrId);
    }

    return String(productOrId || "").trim();
}

function favoriteProduct(productOrId) {
    if (typeof normalizeProduct === "function") {
        return normalizeProduct(productOrId);
    }

    return {
        id: favoriteId(productOrId),
        title: String(productOrId),
        name: String(productOrId),
        price: 0,
        image: "",
        link: "#"
    };
}

function saveFavorites() {
    favoriteStorage.setItem("favorites", JSON.stringify(favorites));
}

function normalizedFavorites() {
    let stored = [];

    try {
        stored = JSON.parse(favoriteStorage.getItem("favorites") || "[]");
    } catch (error) {
        stored = [];
    }

    favorites = stored
        .map(item => favoriteProduct(item))
        .filter(Boolean);

    return favorites;
}

function toggleFavorite(productOrId) {
    const product = favoriteProduct(productOrId);

    if (!product) {
        return;
    }

    const index = normalizedFavorites().findIndex(item => item.id === product.id);

    if (index === -1) {
        favorites.push(product);
    } else {
        favorites.splice(index, 1);
    }

    saveFavorites();
    updateFavoriteButtons();
    renderFavorites();
    window.initHeaderDropdowns?.();
}

function updateFavoriteButtons() {
    const favoriteIds = normalizedFavorites().map(item => item.id);
    const buttons = document.querySelectorAll(".favorite-button, .product-heart");

    buttons.forEach(button => {
        const productId = favoriteId(button.dataset.product || button.dataset.productId);

        if (favoriteIds.includes(productId)) {
            button.classList.add("favorite-active");
        } else {
            button.classList.remove("favorite-active");
        }
    });
}

function removeFavorite(productId) {
    const id = favoriteId(productId);
    favorites = normalizedFavorites().filter(item => item.id !== id);
    saveFavorites();
    renderFavorites();
    updateFavoriteButtons();
    window.initHeaderDropdowns?.();
}

function renderFavorites() {
    const list = document.getElementById("favorites-list");

    if (!list) {
        return;
    }

    const items = normalizedFavorites();
    list.innerHTML = "";
    list.classList.remove("products-grid");
    list.classList.add("cart-lines", "favorite-lines");

    if (!items.length) {
        list.innerHTML = '<p class="empty-cart">Aucun favori pour le moment.</p>';
        return;
    }

    items.forEach(product => {
        const line = document.createElement("div");
        line.className = "cart-line favorite-line";

        line.innerHTML = `
            <a href="${favoriteProductLink(product)}" class="cart-line-thumb">
                <img src="${favoriteProductImage(product)}" alt="${product.name || product.title}">
            </a>

            <div class="cart-line-info">
                <a href="${favoriteProductLink(product)}" class="cart-line-name">
                    ${product.name || product.title}
                </a>
                <span class="cart-line-price">
                    ${favoritePriceToNumber(product.price)} DHS
                </span>
            </div>

            <button class="favorite-line-cart" type="button">
                <i class="fa-solid fa-bag-shopping"></i>
                <span>Ajouter au panier</span>
            </button>

            <button class="remove-item" type="button" aria-label="Retirer des favoris">
                <i class="fa-solid fa-trash-can"></i>
            </button>
        `;

        line.querySelector(".remove-item").addEventListener("click", () => {
            removeFavorite(product.id);
        });

        line.querySelector(".favorite-line-cart").addEventListener("click", () => {
            favoriteAddToCart(product);
        });

        list.appendChild(line);
    });
}

document.addEventListener("DOMContentLoaded", () => {
    updateFavoriteButtons();
    renderFavorites();
});

try {
    window.toggleFavorite = toggleFavorite;
    window.updateFavoriteButtons = updateFavoriteButtons;
    window.removeFavorite = removeFavorite;
    window.renderFavorites = renderFavorites;
} catch (error) {
    // Function declarations remain available to inline handlers in normal browsers.
}
