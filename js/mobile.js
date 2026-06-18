(function () {
    const storageKeyCart = "cart";
    const storageKeyFavorites = "favorites";

    function store() {
        try {
            if (window.localStorage) {
                return window.localStorage;
            }
        } catch (error) {}

        return {
            getItem() { return null; },
            setItem() {}
        };
    }

    function readList(key) {
        try {
            return JSON.parse(store().getItem(key) || "[]");
        } catch (error) {
            return [];
        }
    }

    function saveList(key, value) {
        store().setItem(key, JSON.stringify(value));
        if (window.initHeaderDropdowns) {
            window.initHeaderDropdowns();
        }
    }

    function priceToNumber(price) {
        return Number(String(price || "0").replace(/[^0-9]/g, "")) || 0;
    }

    function trackMobileAddToCart(product, quantity = 1) {
        if (typeof fbq !== "function" || !product) {
            return;
        }

        const quantityValue = Number(quantity) || 1;
        const priceValue = priceToNumber(product.price);
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


    function assetPath(path) {
        if (!path) {
            return "";
        }

        if (path.startsWith("http") || path.startsWith("/")) {
            return path;
        }

        return "/" + path.replace(/^\.\.\//, "");
    }


    function catalogProducts() {
        try {
            return Array.isArray(allProducts) ? allProducts : [];
        } catch (error) {
            return [];
        }
    }

    function normalizeProduct(product) {
        return {
            id: product.id || product.title,
            title: product.title || product.name,
            name: product.name || product.title,
            price: priceToNumber(product.price),
            image: assetPath(product.image),
            link: assetPath(product.link)
        };
    }

    function addToCart(product) {
        const normalized = normalizeProduct(product);
        const cart = readList(storageKeyCart);
        const existing = cart.find(item => item.id === normalized.id);

        if (existing) {
            existing.quantity = (Number(existing.quantity) || 1) + 1;
        } else {
            cart.push({ ...normalized, quantity: 1 });
        }

        saveList(storageKeyCart, cart);
        trackMobileAddToCart(normalized, 1);
        alert(window.BodySeoulLanguage?.getLanguage?.() === "ar" ? "تمت إضافة المنتج إلى السلة!" : "Produit ajouté au panier !");
    }

    function toggleFavorite(product) {
        const normalized = normalizeProduct(product);
        let favorites = readList(storageKeyFavorites);
        const exists = favorites.some(item => item.id === normalized.id);

        favorites = exists
            ? favorites.filter(item => item.id !== normalized.id)
            : favorites.concat(normalized);

        saveList(storageKeyFavorites, favorites);
        refreshFavoriteButtons();
    }

    function refreshFavoriteButtons() {
        const favorites = readList(storageKeyFavorites).map(item => item.id);

        document.querySelectorAll("[data-mobile-favorite]").forEach(button => {
            button.classList.toggle("favorite-active", favorites.includes(button.dataset.mobileFavorite));
        });
    }

    function productCard(product, compact = false) {
        const normalized = normalizeProduct(product);
        const rating = product.rating || "4.8";
        const reviews = product.reviews || "276";
        const oldPrice = product.oldPrice ? `<del>${product.oldPrice}</del>` : "";

        return `
            <article class="mobile-product-card${compact ? " is-compact" : ""}">
                <button type="button" class="mobile-card-heart" data-mobile-favorite="${normalized.id}" aria-label="Ajouter aux favoris">
                    <i class="fa-regular fa-heart"></i>
                </button>
                <a href="${normalized.link}" class="mobile-card-image">
                    <img src="${normalized.image}" alt="${normalized.title}">
                </a>
                <div class="mobile-card-body">
                    <p>${product.brand || "BODY & SEOUL"}</p>
                    <a href="${normalized.link}">${normalized.title}</a>
                    <span><i class="fa-solid fa-star"></i> ${rating} (${reviews})</span>
                    <div class="mobile-card-price">${oldPrice}<strong>${normalized.price} DHS</strong></div>
                </div>
                <button type="button" class="mobile-card-cart" data-mobile-cart="${normalized.id}" aria-label="Ajouter au panier">
                    <i class="fa-solid fa-cart-shopping"></i>
                </button>
            </article>
        `;
    }

    function sectionHeader(title, href = "#") {
        return `
            <div class="mobile-section-head">
                <h2>${title}</h2>
                <a href="${href}">Voir tout</a>
            </div>
        `;
    }

    function buildMobileHome() {
        if (!document.querySelector(".hero-section") || document.querySelector(".mobile-home-block") || !catalogProducts().length) {
            return;
        }

        const bestSellers = catalogProducts().slice(0, 4);
        const newest = catalogProducts().slice(-2);
        const categories = [
            ["Nettoyants", "/categories/nettoyants.html", "/products/low-ph-good-morning/product-main.png"],
            ["Sérums", "/categories/cremes.html", "/products/medicube PDRN Pink Peptide Serum /product-main.png"],
            ["Contour des yeux", "/categories/contour-yeux.html", "/products/revive-eye-serum/product-main.png"],
            ["Crèmes", "/categories/cremes.html", "/products/relief-cream/product-main.png"],
            ["Protection solaire", "/categories/protection-solaire.html", "/products/relief-sun/product-main.png"],
            ["Kits", "/categories/kits.html", "/products/travel-kit/product-main.png"]
        ];

        const block = document.createElement("div");
        block.className = "mobile-home-block";
        block.innerHTML = `
            <section class="mobile-feature-strip">
                <div><i class="fa-regular fa-circle-check"></i><span>Authentiques<br>100% coréens</span></div>
                <div><i class="fa-solid fa-flask"></i><span>Ingrédients<br>efficaces</span></div>
                <div><i class="fa-regular fa-star"></i><span>Testés &<br>approuvés</span></div>
                <div><i class="fa-solid fa-bag-shopping"></i><span>Paiement<br>sécurisé</span></div>
            </section>

            <section class="mobile-home-section">
                ${sectionHeader("Nos meilleures ventes", "/categories/best-sellers.html")}
                <div class="mobile-horizontal-products">
                    ${bestSellers.map(product => productCard(product, true)).join("")}
                </div>
            </section>

            <section class="mobile-delivery-note">
                <i class="fa-solid fa-truck-fast"></i>
                <span>Livraison rapide partout au Maroc<br>Paiement à la livraison disponible</span>
            </section>

            <section class="mobile-home-section">
                ${sectionHeader("Nos catégories", "#mobile-categories")}
                <div class="mobile-category-grid">
                    ${categories.map(([name, href, image]) => `
                        <a href="${href}" class="mobile-category-tile">
                            <img src="${image}" alt="${name}">
                            <span>${name}</span>
                        </a>
                    `).join("")}
                </div>
            </section>

            <section class="mobile-home-section">
                ${sectionHeader("Nouveautés", "/categories/all-products.html")}
                <div class="mobile-new-grid">
                    ${newest.map(product => productCard(product, true)).join("")}
                </div>
            </section>
        `;

        document.querySelector(".cards-section")?.insertAdjacentElement("afterend", block);
        bindMobileProductButtons(block);
        refreshFavoriteButtons();
    }

    function bindMobileProductButtons(root = document) {
        root.querySelectorAll("[data-mobile-cart]").forEach(button => {
            if (button.dataset.mobileBound === "true") {
                return;
            }

            button.dataset.mobileBound = "true";
            button.addEventListener("click", event => {
                event.preventDefault();
                const product = catalogProducts().find(item => item.id === button.dataset.mobileCart);
                if (product) {
                    addToCart(product);
                }
            });
        });

        root.querySelectorAll("[data-mobile-favorite]").forEach(button => {
            if (button.dataset.mobileFavoriteBound === "true") {
                return;
            }

            button.dataset.mobileFavoriteBound = "true";
            button.addEventListener("click", event => {
                event.preventDefault();
                const product = catalogProducts().find(item => item.id === button.dataset.mobileFavorite);
                if (product) {
                    toggleFavorite(product);
                }
            });
        });
    }

    function enhanceMobileHeader() {
        const header = document.querySelector(".main-header");
        const navbar = document.querySelector(".navbar");

        if (!header || header.querySelector(".mobile-menu-button")) {
            return;
        }

        const menuButton = document.createElement("button");
        menuButton.className = "mobile-menu-button";
        menuButton.type = "button";
        menuButton.setAttribute("aria-label", "Menu");
        menuButton.innerHTML = '<i class="fa-solid fa-bars"></i>';
        header.insertBefore(menuButton, header.firstElementChild);

        menuButton.addEventListener("click", () => {
            navbar?.classList.toggle("is-mobile-open");
        });

        const language = document.querySelector(".language-switcher");

        if (language && !header.querySelector(".mobile-language-switcher")) {
            const mobileLanguage = language.cloneNode(true);
            mobileLanguage.classList.add("mobile-language-switcher");
            mobileLanguage.querySelectorAll("[data-language-bound]").forEach(button => {
                delete button.dataset.languageBound;
            });
            header.insertBefore(mobileLanguage, header.querySelector(".header-icons"));
        }

        const searchIcon = header.querySelector(".search-container i");
        searchIcon?.addEventListener("click", () => {
            header.querySelector(".search-container input")?.focus();
        });
    }

    function addBottomNav() {
        if (document.querySelector(".mobile-bottom-nav")) {
            return;
        }

        const path = window.location.pathname;
        const nav = document.createElement("nav");
        nav.className = "mobile-bottom-nav";
        nav.innerHTML = `
            <a href="/index.html" class="${path.endsWith("/") || path.endsWith("index.html") ? "is-active" : ""}">
                <i class="fa-solid fa-house"></i><span>Accueil</span>
            </a>
            <a href="#mobile-categories" data-mobile-categories class="${path.includes("/categories/") ? "is-active" : ""}">
                <i class="fa-solid fa-list"></i><span>Catégories</span>
            </a>
            <a href="/favorites.html" class="${path.includes("favorites") ? "is-active" : ""}">
                <i class="fa-regular fa-heart"></i><span>Favoris</span>
            </a>
            <a href="#" class="${path.includes("account") ? "is-active" : ""}">
                <i class="fa-regular fa-user"></i><span>Compte</span>
            </a>
        `;
        document.body.appendChild(nav);

        nav.querySelector("[data-mobile-categories]")?.addEventListener("click", event => {
            event.preventDefault();
            const navbar = document.querySelector(".navbar");
            navbar?.classList.toggle("is-mobile-open");
        });
    }

    function enhanceMobileCategory() {
        const toolbar = document.querySelector(".category-toolbar");
        const filters = document.querySelector(".category-filters");

        if (!toolbar || toolbar.querySelector(".mobile-filter-toggle")) {
            return;
        }

        const filterButton = document.createElement("button");
        filterButton.type = "button";
        filterButton.className = "mobile-filter-toggle";
        filterButton.innerHTML = '<i class="fa-solid fa-sliders"></i><span>Filtres</span>';

        const gridButton = document.createElement("button");
        gridButton.type = "button";
        gridButton.className = "mobile-grid-toggle";
        gridButton.innerHTML = '<i class="fa-solid fa-border-all"></i>';

        toolbar.insertBefore(filterButton, toolbar.firstChild);
        toolbar.appendChild(gridButton);

        filterButton.addEventListener("click", () => {
            filters?.classList.toggle("is-mobile-open");
        });
    }



    function enhanceProductAccordions() {
        const cards = Array.from(document.querySelectorAll(".product-extra-info .info-card"));

        if (!cards.length) {
            return;
        }

        cards.forEach((card, index) => {
            const heading = card.querySelector("h2");

            if (!heading || heading.dataset.accordionReady === "true") {
                return;
            }

            heading.dataset.accordionReady = "true";
            heading.setAttribute("role", "button");
            heading.setAttribute("tabindex", "0");
            card.classList.toggle("is-open", index === 0);

            const toggle = () => {
                card.classList.toggle("is-open");
            };

            heading.addEventListener("click", toggle);
            heading.addEventListener("keydown", event => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    toggle();
                }
            });
        });
    }

    function enhanceProductPage() {
        const gallery = document.querySelector(".gallery-main");

        if (!gallery || gallery.querySelector(".mobile-image-count")) {
            return;
        }

        const total = document.querySelectorAll(".gallery-thumbnails img").length || 1;
        const count = document.createElement("span");
        count.className = "mobile-image-count";
        count.textContent = `1/${total}`;
        gallery.appendChild(count);

        const originalChangeImage = window.changeImage;
        if (typeof originalChangeImage === "function" && !window.changeImage.mobileWrapped) {
            window.changeImage = function (index) {
                originalChangeImage(index);
                const label = document.querySelector(".mobile-image-count");
                if (label) {
                    label.textContent = `${Number(index) + 1}/${total}`;
                }
            };
            window.changeImage.mobileWrapped = true;
        }
    }

    function initMobileEnhancements() {
        enhanceMobileHeader();
        addBottomNav();
        buildMobileHome();
        enhanceMobileCategory();
        enhanceProductPage();
        enhanceProductAccordions();
        bindMobileProductButtons();
        refreshFavoriteButtons();
    }

    window.BodySeoulMobile = {
        init: initMobileEnhancements
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initMobileEnhancements);
    } else {
        initMobileEnhancements();
    }
})();
