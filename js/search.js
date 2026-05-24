(function () {
    function catalogProducts() {
        try {
            return Array.isArray(allProducts) ? allProducts : [];
        } catch (error) {
            return [];
        }
    }

    function assetPath(value) {
        if (!value) return "";
        if (value.startsWith("http") || value.startsWith("/")) return value;
        return "/" + value.replace(/^\.\.\//, "");
    }

    function productMatches(product, query) {
        const haystack = [product.title, product.description, product.brand, product.category]
            .join(" ")
            .toLowerCase();
        return haystack.includes(query.toLowerCase());
    }

    function renderSuggestions(panel, products, query) {
        const matches = query
            ? products.filter(product => productMatches(product, query)).slice(0, 6)
            : products.slice(0, 5);

        if (!matches.length) {
            panel.innerHTML = '<p class="search-empty">Aucun produit trouvé.</p>';
            return;
        }

        panel.innerHTML = matches.map(product => `
            <a class="search-suggestion" href="${assetPath(product.link)}">
                <span class="search-suggestion-image">
                    <img src="${assetPath(product.image)}" alt="${product.title}">
                </span>
                <span class="search-suggestion-copy">
                    <strong>${product.title}</strong>
                    <small>${product.description || product.category || "Produit skincare coréen"}</small>
                </span>
                <b>${String(product.price || "").replace(/[^0-9]/g, "") || product.price} DHS</b>
            </a>
        `).join("");
    }

    function initSearch() {
        const container = document.querySelector(".search-container");
        const input = container?.querySelector("input");

        if (!container || !input || container.dataset.searchReady === "true") {
            return;
        }

        container.dataset.searchReady = "true";
        input.setAttribute("autocomplete", "off");

        const panel = document.createElement("div");
        panel.className = "search-suggestions-panel";
        container.appendChild(panel);

        const open = () => {
            panel.classList.add("is-open");
            renderSuggestions(panel, catalogProducts(), input.value.trim());
        };

        const close = () => panel.classList.remove("is-open");

        input.addEventListener("focus", open);
        input.addEventListener("input", open);
        container.querySelector("i")?.addEventListener("click", () => {
            input.focus();
            open();
        });

        input.addEventListener("keydown", event => {
            if (event.key !== "Enter") return;
            const first = panel.querySelector(".search-suggestion");
            if (first) {
                window.location.href = first.href;
            }
        });

        document.addEventListener("click", event => {
            if (!event.target.closest(".search-container")) {
                close();
            }
        });
    }

    window.BodySeoulSearch = { init: initSearch };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initSearch);
    } else {
        initSearch();
    }
})();
