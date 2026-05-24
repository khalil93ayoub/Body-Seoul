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
    window.BodySeoulSync?.schedulePush?.();
}

function numericPrice(price) {
    return Number(String(price || "0").replace(/[^0-9]/g, "")) || 0;
}

const grid = document.getElementById("productsGrid");
const productCount = document.getElementById("productCount");

const filteredProducts = currentCategory === "all-products"
    ? allProducts
    : allProducts.filter(product =>
        product.category === currentCategory
    );

if (productCount) {
    productCount.textContent = filteredProducts.length + " produits trouvés";
}

function categoryProductId(product) {
    return product.id || product.title;
}

function normalizedCategoryProduct(product) {
    return {
        id: categoryProductId(product),
        title: product.title,
        name: product.title,
        price: numericPrice(product.price),
        image: product.image,
        link: product.link
    };
}

function updateCategoryFavoriteButtons() {
    const favorites = readList("favorites");
    const ids = favorites.map(item => item.id);

    document.querySelectorAll(".product-heart").forEach(button => {
        button.classList.toggle("favorite-active", ids.includes(button.dataset.product));
    });
}

function toggleCategoryFavorite(product) {
    const normalized = normalizedCategoryProduct(product);

    if (typeof toggleFavorite === "function") {
        toggleFavorite(normalized);
        updateCategoryFavoriteButtons();
        return;
    }

    let favorites = readList("favorites");
    const index = favorites.findIndex(item => item.id === normalized.id);

    if (index === -1) {
        favorites.push(normalized);
    } else {
        favorites.splice(index, 1);
    }

    saveList("favorites", favorites);
    updateCategoryFavoriteButtons();
    window.initHeaderDropdowns?.();
}

function handleCategoryFavoriteClick(index) {
    toggleCategoryFavorite(filteredProducts[Number(index)]);
}

function handleCategoryCartClick(index) {
    addCategoryCart(filteredProducts[Number(index)]);
}

function addCategoryCart(product) {
    const normalized = normalizedCategoryProduct(product);

    if (typeof addToCart === "function") {
        addToCart(normalized, 1);
        return;
    }

    let cart = readList("cart");
    const existing = cart.find(item => item.id === normalized.id);

    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({ ...normalized, quantity: 1 });
    }

    saveList("cart", cart);
    window.initHeaderDropdowns?.();
    alert(window.BodySeoulLanguage?.getLanguage?.() === "ar" ? "تمت إضافة المنتج إلى السلة!" : "Produit ajouté au panier !");
}

if (grid) {
    grid.innerHTML = "";

    filteredProducts.forEach((product, index) => {
        const productId = categoryProductId(product);

        grid.innerHTML += `
            <div class="category-product-card" data-index="${index}">
                <button class="product-heart favorite-button"
                    type="button"
                    data-product="${productId}"
                    aria-label="Ajouter aux favoris">
                    <i class="fa-regular fa-heart"></i>
                </button>

                <a href="${product.link}" class="product-image-wrap">
                    <img src="${product.image}" alt="${product.title}">
                </a>

                <div class="product-card-info">
                    <p class="product-brand">${product.brand || "BODY & SEOUL"}</p>
                    <a href="${product.link}"><h3>${product.title}</h3></a>
                    <div class="product-rating">
                        <i class="fa-solid fa-star"></i>
                        <span>${product.rating || "4.8"}</span>
                        <small>(${product.reviews || "124"})</small>
                    </div>
                    <div class="product-price-row">
                        <strong>${product.price || "149 DHS"}</strong>
                        ${product.oldPrice ? `<del>${product.oldPrice}</del>` : ""}
                    </div>
                </div>

                <button class="product-cart"
                    type="button"
                    data-product="${productId}"
                    aria-label="Ajouter au panier">
                    <i class="fa-solid fa-cart-shopping"></i>
                </button>
            </div>
        `;
    });
    grid.addEventListener("click", event => {
        const favoriteButton = event.target.closest(".product-heart");
        const cartButton = event.target.closest(".product-cart");

        if (!favoriteButton && !cartButton) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        const card = event.target.closest(".category-product-card");
        const product = filteredProducts[Number(card.dataset.index)];

        if (favoriteButton) {
            toggleCategoryFavorite(product);
            return;
        }

        if (cartButton) {
            addCategoryCart(product);
        }
    });

    updateCategoryFavoriteButtons();
}
