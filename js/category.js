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
let salesByProductId = {};
let filteredProducts = [];

function catalogProducts() {
    if (typeof allProducts !== "undefined" && Array.isArray(allProducts)) {
        return allProducts;
    }

    return Array.isArray(window.allProducts) ? window.allProducts : [];
}

function categoryProductId(product) {
    return product.id || product.title;
}

function productSales(product) {
    return Number(salesByProductId[categoryProductId(product)] || product.sold || 0);
}

function categoryProducts() {
    const products = catalogProducts();

    if (currentCategory === "all-products") {
        return products;
    }

    if (currentCategory === "best-sellers") {
        return products
            .slice()
            .sort((left, right) => productSales(right) - productSales(left))
            .slice(0, 5);
    }

    return products.filter(product => product.category === currentCategory);
}

function productCountText(count) {
    if (currentCategory === "best-sellers") {
        return count + " best-sellers";
    }

    return count + " produits trouvés";
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

function renderCategoryProducts() {
    if (!grid) {
        return;
    }

    filteredProducts = categoryProducts();

    if (productCount) {
        productCount.textContent = productCountText(filteredProducts.length);
    }

    grid.innerHTML = "";

    filteredProducts.forEach((product, index) => {
        const productId = categoryProductId(product);
        const oldPrice = product.oldPrice ? '<del>' + product.oldPrice + '</del>' : '';

        grid.innerHTML += '<div class="category-product-card" data-index="' + index + '">' +
            '<button class="product-heart favorite-button" type="button" data-product="' + productId + '" aria-label="Ajouter aux favoris">' +
                '<i class="fa-regular fa-heart"></i>' +
            '</button>' +
            '<a href="' + product.link + '" class="product-image-wrap">' +
                '<img src="' + product.image + '" alt="' + product.title + '">' +
            '</a>' +
            '<div class="product-card-info">' +
                '<p class="product-brand">' + (product.brand || "BODY & SEOUL") + '</p>' +
                '<a href="' + product.link + '"><h3>' + product.title + '</h3></a>' +
                '<div class="product-rating">' +
                    '<i class="fa-solid fa-star"></i>' +
                    '<span>' + (product.rating || "4.8") + '</span>' +
                    '<small>(' + (product.reviews || "124") + ')</small>' +
                '</div>' +
                '<div class="product-price-row">' +
                    '<strong>' + (product.price || "149 DHS") + '</strong>' +
                    oldPrice +
                '</div>' +
            '</div>' +
            '<button class="product-cart" type="button" data-product="' + productId + '" aria-label="Ajouter au panier">' +
                '<i class="fa-solid fa-cart-shopping"></i>' +
            '</button>' +
        '</div>';
    });

    updateCategoryFavoriteButtons();
}

function waitForFirebase(attempts = 30) {
    if (window.BodySeoulFirebase?.load) {
        return window.BodySeoulFirebase.load();
    }

    if (attempts <= 0) {
        return Promise.resolve({ ready: false });
    }

    return new Promise(resolve => {
        setTimeout(() => resolve(waitForFirebase(attempts - 1)), 150);
    });
}

function loadBestSellerSales() {
    if (currentCategory !== "best-sellers") {
        return;
    }

    waitForFirebase().then(firebaseTools => {
        if (!firebaseTools.ready) {
            return;
        }

        return firebaseTools.db.collection("products").get().then(snapshot => {
            const nextSales = {};
            snapshot.forEach(doc => {
                nextSales[doc.id] = Number(doc.data().sold || 0);
            });
            salesByProductId = nextSales;
            renderCategoryProducts();
        });
    }).catch(error => {
        console.warn("Body & Seoul best-sellers load failed", error);
    });
}

if (grid) {
    renderCategoryProducts();

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

    loadBestSellerSales();
}
