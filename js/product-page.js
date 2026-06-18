let quantity = 1;
let currentImageIndex = 0;

function getQuantityElement() {
    return document.getElementById("quantity-value");
}

function updateQuantityValue() {
    const quantityElement = getQuantityElement();

    if (quantityElement) {
        quantityElement.textContent = quantity;
    }
}

function increaseQuantity() {
    quantity += 1;
    updateQuantityValue();
}

function decreaseQuantity() {
    if (quantity > 1) {
        quantity -= 1;
        updateQuantityValue();
    }
}

function productImages() {
    return Array.from(document.querySelectorAll(".gallery-thumbnails img"));
}

function changeImage(index) {
    const images = productImages();
    const mainImage = document.getElementById("mainProductImage");

    if (!mainImage || !images[index]) {
        return;
    }

    currentImageIndex = index;
    mainImage.src = images[index].src;

    images.forEach(image => {
        image.classList.remove("active-thumb");
    });

    images[index].classList.add("active-thumb");
}

function nextImage() {
    const images = productImages();

    if (!images.length) {
        return;
    }

    changeImage((currentImageIndex + 1) % images.length);
}

function previousImage() {
    const images = productImages();

    if (!images.length) {
        return;
    }

    changeImage((currentImageIndex - 1 + images.length) % images.length);
}



function normalizeText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
}

function ensureProductBadges() {
    const details = document.querySelector(".product-details");
    const brand = document.querySelector(".product-brand");

    if (!details || !brand || details.querySelector(".product-badges")) {
        return;
    }

    const badges = document.createElement("div");
    badges.className = "product-badges";
    badges.innerHTML = `
        <span class="product-badge">Best-seller</span>
        <span class="product-badge secondary"><i class="fa-solid fa-leaf"></i> Vegan</span>
    `;

    details.insertBefore(badges, brand);
}

function ensureProductSizeNote() {
    const price = document.querySelector(".product-price");

    if (!price || document.querySelector(".product-size-note")) {
        return;
    }

    const sizeNote = document.createElement("p");
    sizeNote.className = "product-size-note";
    sizeNote.textContent = "150 ml (5.07 fl.oz.)";
    price.insertAdjacentElement("afterend", sizeNote);
}

function ensureCartButtonIcon() {
    document.querySelectorAll(".add-cart-button").forEach(button => {
        if (!button.querySelector("i")) {
            button.insertAdjacentHTML("afterbegin", '<i class="fa-solid fa-cart-shopping"></i>');
        }
    });
}

function ensureProductTabs() {
    const infoSection = document.querySelector(".product-extra-info");

    if (!infoSection || document.querySelector(".product-tabs")) {
        return;
    }

    const labels = Array.from(infoSection.querySelectorAll(".info-card h2"))
        .map(heading => normalizeText(heading.textContent));

    const tabLabels = labels.length ? labels : ["Description", "Conseils d'utilisation", "Ingrédients"];
    const tabs = document.createElement("nav");
    tabs.className = "product-tabs";
    tabs.setAttribute("aria-label", "Informations produit");

    tabs.innerHTML = tabLabels.map((label, index) => `
        <button class="product-tab-button${index === 0 ? " is-active" : ""}" type="button">
            ${label}
        </button>
    `).join("");

    infoSection.insertAdjacentElement("beforebegin", tabs);
}

function enhanceProductDetailLayout() {
    ensureProductBadges();
    ensureProductSizeNote();
    ensureCartButtonIcon();
    ensureProductTabs();
}

document.addEventListener("DOMContentLoaded", () => {
    updateQuantityValue();
    enhanceProductDetailLayout();
    trackCurrentProductViewContent();
});

function sharedStorage() {
    try {
        if (window.localStorage) {
            return window.localStorage;
        }
    } catch (error) {}

    function readStore() {
        try {
            return JSON.parse(window.name || "{}");
        } catch (error) {
            return {};
        }
    }

    function writeStore(store) {
        try {
            window.name = JSON.stringify(store);
        } catch (error) {}
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
}

function readList(key) {
    try {
        return JSON.parse(sharedStorage().getItem(key) || "[]");
    } catch (error) {
        return [];
    }
}

function saveList(key, value) {
    sharedStorage().setItem(key, JSON.stringify(value));
}

function numericPrice(price) {
    return Number(String(price || "0").replace(/[^0-9]/g, "")) || 0;
}

function currentProductForActions() {
    const title = document.querySelector(".product-title")?.textContent.replace(/\s+/g, " ").trim() || document.title.trim();
    const price = document.querySelector(".product-price")?.textContent.replace(/\s+/g, " ").trim();
    const image = document.querySelector("#mainProductImage")?.getAttribute("src") || "";
    const id = decodeURIComponent(location.pathname.split("/products/")[1]?.split("/")[0] || title).trim();

    return {
        id,
        title,
        name: title,
        price: numericPrice(price),
        image: image ? new URL(image, location.href).href : "",
        link: location.href
    };
}
function productMetaPayload(product, itemQuantity = 1) {
    if (!product) {
        return null;
    }

    const quantityValue = Number(itemQuantity) || 1;
    const priceValue = numericPrice(product.price);
    const productId = String(product.id || product.title || product.name || "").trim();

    if (!productId) {
        return null;
    }

    return {
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
    };
}

function trackProductMetaEvent(eventName, product, itemQuantity = 1) {
    if (typeof fbq !== "function") {
        return;
    }

    const payload = productMetaPayload(product, itemQuantity);

    if (payload) {
        fbq("track", eventName, payload);
    }
}

function trackCurrentProductViewContent() {
    if (document.body.dataset.metaViewContentTracked === "true") {
        return;
    }

    const product = currentProductForActions();
    const payload = productMetaPayload(product, 1);

    if (!payload || typeof fbq !== "function") {
        return;
    }

    document.body.dataset.metaViewContentTracked = "true";
    fbq("track", "ViewContent", payload);
}


function addCurrentProductToCart() {
    const product = currentProductForActions();

    if (typeof addToCart === "function") {
        addToCart(product, quantity);
        return;
    }

    let cart = readList("cart");
    const existing = cart.find(item => item.id === product.id);

    if (existing) {
        existing.quantity += quantity;
    } else {
        cart.push({ ...product, quantity });
    }

    saveList("cart", cart);
    trackProductMetaEvent("AddToCart", product, quantity);
    window.initHeaderDropdowns?.();
    alert(window.BodySeoulLanguage?.getLanguage?.() === "ar" ? "تمت إضافة المنتج إلى السلة!" : "Produit ajouté au panier !");
}

function toggleCurrentProductFavorite() {
    const product = currentProductForActions();

    if (typeof toggleFavorite === "function") {
        toggleFavorite(product);
        refreshProductFavoriteButton();
        return;
    }

    let favorites = readList("favorites");
    const index = favorites.findIndex(item => item.id === product.id);

    if (index === -1) {
        favorites.push(product);
    } else {
        favorites.splice(index, 1);
    }

    saveList("favorites", favorites);
    window.initHeaderDropdowns?.();
    refreshProductFavoriteButton();
}

function addProductToCart() {
    addCurrentProductToCart();
}

function refreshProductFavoriteButton() {
    const product = currentProductForActions();
    const favoriteIds = readList("favorites").map(item => item.id);

    document.querySelectorAll(".favorite-button").forEach(button => {
        button.classList.toggle("favorite-active", favoriteIds.includes(product.id));
    });
}

document.addEventListener("DOMContentLoaded", () => {
    refreshProductFavoriteButton();

    document.querySelectorAll(".favorite-button").forEach(button => {
        button.addEventListener("click", event => {
            event.preventDefault();
            event.stopImmediatePropagation();

            toggleCurrentProductFavorite();
        }, true);
    });

    document.querySelectorAll(".add-cart-button").forEach(button => {
        button.addEventListener("click", event => {
            event.preventDefault();
            event.stopImmediatePropagation();

            addCurrentProductToCart();
        }, true);
    });
});

try {
    window.addProductToCart = addProductToCart;
    window.addCurrentProductToCart = addCurrentProductToCart;
    window.toggleCurrentProductFavorite = toggleCurrentProductFavorite;
} catch (error) {}
