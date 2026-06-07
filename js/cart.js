const appStorage = (() => {
    try {
        if (window.localStorage) {
            return window.localStorage;
        }
    } catch (error) {
        // Fall back when localStorage is unavailable.
    }

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
        } catch (error) {
            // Ignore storage failures.
        }
    }

    return {
        getItem(key) {
            return readStore()[key] || null;
        },
        setItem(key, value) {
            const store = readStore();
            store[key] = String(value);
            writeStore(store);
        },
        removeItem(key) {
            const store = readStore();
            delete store[key];
            writeStore(store);
        }
    };
})();

const cartContainer =
    document.getElementById("cart-container") ||
    document.getElementById("cart-list");

const totalPriceElement = document.getElementById("cart-total");
const checkoutProducts = document.getElementById("checkout-products");
const checkoutTotalPrice = document.getElementById("checkout-total-price");
const DELIVERY_FEE = 40;
const FREE_DELIVERY_THRESHOLD = 500;

let cart = readCart();

const productAliases = {
    "low-ph-cleanser": "low-ph-good-morning",
    "relief-sun": "relief-sun",
    "sun-serum": "hyalu-cica-sun-serum",
    "zero-pore-pad": "zero-pore-pad",
    "travel-kit": "travel-kit",
    "relief-cream": "relief-cream",
    "retinol-shot-serum": "Retinol Shot Tightening Serum",
    "glow-cream": "Celimax The -A Retinol Shot",
    "pdrn-serum": "medicube PDRN Pink Peptide Serum",
    "revive-eye-serum": "revive-eye-serum"
};

function readCart() {
    try {
        return JSON.parse(appStorage.getItem("cart") || "[]");
    } catch (error) {
        return [];
    }
}

function productIdFromLink(link = "") {
    const parts = link.split("/").filter(Boolean);
    const index = parts.indexOf("products");

    if (index === -1 || !parts[index + 1]) {
        return "";
    }

    return decodeURIComponent(parts[index + 1]).trim();
}


function rootPrefix() {
    const path = decodeURIComponent(window.location.pathname);
    if (path.includes("/products/")) return "../../";
    if (path.includes("/categories/")) return "../";
    return "";
}

function productPathFromValue(value) {
    const text = String(value || "").split("\\").join("/");
    const index = text.indexOf("products/");
    return index === -1 ? "" : text.slice(index);
}

function normalizeProductLinkValue(link, id) {
    const value = String(link || "").trim();
    if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("file:") || value.startsWith("//")) return value;
    const productPath = productPathFromValue(value);
    if (productPath) return rootPrefix() + productPath;
    if (id) return rootPrefix() + "products/" + encodeURIComponent(id) + "/index.html";
    return "#";
}

function normalizeProductImageValue(image, id) {
    const value = String(image || "").trim();
    if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("data:") || value.startsWith("file:") || value.startsWith("//")) return value;
    const productPath = productPathFromValue(value);
    if (productPath) return rootPrefix() + productPath;
    if (id) return rootPrefix() + "products/" + encodeURIComponent(id) + "/product-main.png";
    return "";
}

function priceToNumber(price) {
    if (typeof price === "number") {
        return price;
    }

    const value = String(price || "0").replace(/[^0-9]/g, "");
    return Number(value || 0);
}

function normalizeId(productId) {
    const rawId = String(productId || "").trim();
    return productAliases[rawId] || rawId;
}

function catalogProducts() {
    return Array.isArray(window.allProducts) ? window.allProducts : [];
}

function findCatalogProduct(productId) {
    const normalizedId = normalizeId(productId);

    return catalogProducts().find(product =>
        product.id === normalizedId ||
        productIdFromLink(product.link) === normalizedId ||
        product.title === productId
    );
}

function currentPageProduct(productId) {
    const title = document.querySelector(".product-title")?.textContent.replace(/\s+/g, " ").trim();
    const price = document.querySelector(".product-price")?.textContent.replace(/\s+/g, " ").trim();
    const image = document.querySelector("#mainProductImage")?.getAttribute("src") || "";

    if (!title) {
        return null;
    }

    return {
        id: normalizeId(productId) || productIdFromLink(window.location.pathname),
        title,
        name: title,
        price: priceToNumber(price),
        image: image ? new URL(image, window.location.href).href : "",
        link: window.location.href
    };
}

function normalizeProduct(productOrId) {
    if (typeof productOrId === "object" && productOrId !== null) {
        const product = productOrId;
        const id = product.id || productIdFromLink(product.link) || product.title;

        return {
            id,
            title: product.title || product.name,
            name: product.name || product.title,
            price: priceToNumber(product.price),
            image: normalizeProductImageValue(product.image, id),
            link: normalizeProductLinkValue(product.link, id)
        };
    }

    const catalogProduct = findCatalogProduct(productOrId);

    if (catalogProduct) {
        return normalizeProduct(catalogProduct);
    }

    return currentPageProduct(productOrId);
}

function saveCart() {
    appStorage.setItem("cart", JSON.stringify(cart));
}

function cartTotal() {
    return cart.reduce((sum, product) =>
        sum + priceToNumber(product.price) * (Number(product.quantity) || 1),
        0
    );
}

function deliveryFeeForSubtotal(subtotal) {
    return subtotal > 0 && subtotal < FREE_DELIVERY_THRESHOLD ? DELIVERY_FEE : 0;
}

function checkoutGrandTotal() {
    const subtotal = cartTotal();
    return subtotal + deliveryFeeForSubtotal(subtotal);
}

function removeCheckoutFeeRows() {
    document.getElementById("checkout-subtotal-row")?.remove();
    document.getElementById("checkout-delivery-row")?.remove();
}

function ensureCheckoutFeeRow(id, label) {
    const totalBox = checkoutTotalPrice?.closest(".checkout-total");
    if (!totalBox) return null;

    let row = document.getElementById(id);
    if (!row) {
        row = document.createElement("div");
        row.className = "checkout-fee-row";
        row.id = id;
        row.innerHTML = "<span></span><strong></strong>";
        totalBox.insertAdjacentElement("beforebegin", row);
    }

    row.querySelector("span").textContent = label;
    return row;
}

function renderCheckoutFees() {
    const subtotal = cartTotal();
    const deliveryFee = deliveryFeeForSubtotal(subtotal);

    if (!subtotal) {
        removeCheckoutFeeRows();
        return;
    }

    const subtotalRow = ensureCheckoutFeeRow("checkout-subtotal-row", "Sous-total");
    const deliveryRow = ensureCheckoutFeeRow("checkout-delivery-row", "Frais de livraison");

    if (subtotalRow) {
        subtotalRow.querySelector("strong").textContent = subtotal + " DHS";
    }

    if (deliveryRow) {
        deliveryRow.querySelector("strong").textContent = deliveryFee ? deliveryFee + " DHS" : "Offerte";
    }
}

function addToCart(productOrId, amount = 1) {
    const product = normalizeProduct(productOrId);
    const quantityToAdd = Number(amount) || window.quantity || 1;

    if (!product) {
        alert(window.BodySeoulLanguage?.getLanguage?.() === "ar" ? "لم يتم العثور على المنتج." : "Produit introuvable.");
        return;
    }

    const existingProduct = cart.find(item => item.id === product.id);

    if (existingProduct) {
        existingProduct.quantity += quantityToAdd;
    } else {
        cart.push({
            ...product,
            quantity: quantityToAdd
        });
    }

    saveCart();
    renderCart();
    renderCheckout();
    alert(window.BodySeoulLanguage?.getLanguage?.() === "ar" ? "تمت إضافة المنتج إلى السلة!" : "Produit ajouté au panier !");
}

function addToCartWithQuantity(productId, amount = window.quantity || 1) {
    addToCart(productId, amount);
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    saveCart();
    renderCart();
    renderCheckout();
}

function changeQuantity(productId, amount) {
    const product = cart.find(item => item.id === productId);

    if (!product) {
        return;
    }

    product.quantity = (Number(product.quantity) || 1) + amount;

    if (product.quantity <= 0) {
        removeFromCart(productId);
        return;
    }

    saveCart();
    renderCart();
    renderCheckout();
}

function normalizeCart(options = {}) {
    const before = JSON.stringify(cart);

    cart = cart
        .map(item => {
            const product = normalizeProduct(item);

            if (!product) {
                return null;
            }

            return {
                ...product,
                quantity: Number(item.quantity) || 1
            };
        })
        .filter(Boolean);

    if (options.save !== false && JSON.stringify(cart) !== before) {
        saveCart();
    }
}

function createLineItem(product, options = {}) {
    const item = document.createElement("div");
    item.className = options.checkout ? "cart-line checkout-line" : "cart-line";

    item.innerHTML = `
        <a href="${product.link}" class="cart-line-thumb">
            <img src="${product.image}" alt="${product.name || product.title}">
        </a>

        <div class="cart-line-info">
            <a href="${product.link}" class="cart-line-name">
                ${product.name || product.title}
            </a>
            <span class="cart-line-price">
                ${priceToNumber(product.price)} DHS
            </span>
        </div>

        <div class="cart-line-quantity" aria-label="Quantité">
            <button class="qty-btn decrease-btn" type="button">−</button>
            <span>${product.quantity}</span>
            <button class="qty-btn increase-btn" type="button">+</button>
        </div>

        <strong class="cart-line-subtotal">
            ${priceToNumber(product.price) * product.quantity} DHS
        </strong>

        <button class="remove-item" type="button" aria-label="Supprimer du panier">
            <i class="fa-solid fa-trash-can"></i>
        </button>
    `;

    item.querySelector(".increase-btn").addEventListener("click", () => {
        changeQuantity(product.id, 1);
    });

    item.querySelector(".decrease-btn").addEventListener("click", () => {
        changeQuantity(product.id, -1);
    });

    item.querySelector(".remove-item").addEventListener("click", () => {
        removeFromCart(product.id);
    });

    return item;
}

function renderCart() {
    cart = readCart();

    if (!cartContainer || !totalPriceElement) {
        return;
    }

    normalizeCart({ save: false });
    cartContainer.innerHTML = "";
    cartContainer.classList.add("cart-lines");

    if (cart.length === 0) {
        cartContainer.innerHTML = '<p class="empty-cart">Votre panier est vide.</p>';
        totalPriceElement.innerText = "Total : 0 DHS";
        return;
    }

    cart.forEach(product => {
        cartContainer.appendChild(createLineItem(product));
    });

    totalPriceElement.innerText = "Total : " + cartTotal() + " DHS";
}

function renderCheckout() {
    cart = readCart();

    if (!checkoutProducts || !checkoutTotalPrice) {
        return;
    }

    normalizeCart({ save: false });
    checkoutProducts.innerHTML = "";
    checkoutProducts.classList.add("cart-lines", "checkout-lines");

    if (cart.length === 0) {
        checkoutProducts.innerHTML = '<p class="empty-cart">Votre panier est vide.</p>';
        removeCheckoutFeeRows();
        checkoutTotalPrice.innerText = "0 DHS";
        return;
    }

    cart.forEach(product => {
        checkoutProducts.appendChild(createLineItem(product, { checkout: true }));
    });

    renderCheckoutFees();
    checkoutTotalPrice.innerText = checkoutGrandTotal() + " DHS";
}

renderCart();
renderCheckout();

try {
    window.addToCart = addToCart;
    window.addToCartWithQuantity = addToCartWithQuantity;
    window.removeFromCart = removeFromCart;
    window.changeQuantity = changeQuantity;
    window.renderCart = renderCart;
    window.renderCheckout = renderCheckout;
    window.productIdFromLink = productIdFromLink;
    window.normalizeId = normalizeId;
    window.normalizeProduct = normalizeProduct;
    window.BodySeoulCheckoutTotals = {
        deliveryFee: deliveryFeeForSubtotal,
        grandTotal: checkoutGrandTotal,
        threshold: FREE_DELIVERY_THRESHOLD
    };
} catch (error) {
    // Function declarations remain available to inline handlers in normal browsers.
}
