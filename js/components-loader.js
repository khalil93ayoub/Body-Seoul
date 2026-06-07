const componentScript = document.currentScript;
const componentBase = componentScript.dataset.base || "";

function componentVariant(rootFile, categoryFile, productFile) {
    if (componentBase === "../../") {
        return productFile;
    }

    if (componentBase === "../") {
        return categoryFile;
    }

    return rootFile;
}

function bindHeaderActionFallbacks() {
    if (document.body.dataset.headerFallbacksReady === "true") {
        return;
    }

    document.body.dataset.headerFallbacksReady = "true";

    document.addEventListener("click", event => {
        const accountButton = event.target.closest(".account-button");

        if (accountButton) {
            event.preventDefault();
            window.BodySeoulAccount?.init?.();
            window.BodySeoulAccount?.open?.();
            return;
        }

        const headerAction = event.target.closest(".header-action");

        if (!headerAction || headerAction.dataset.ready === "true") {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        const dropdown = document.getElementById(headerAction.dataset.dropdown);

        if (!dropdown) {
            return;
        }

        document.querySelectorAll(".header-dropdown").forEach(item => {
            if (item !== dropdown) {
                item.classList.remove("is-open");
            }
        });

        dropdown.classList.toggle("is-open");
        window.initHeaderDropdowns?.();
    });
}

function loadComponent(containerId, componentPath) {
    const container = document.getElementById(containerId);

    if (!container) {
        return;
    }

    fetch(componentBase + componentPath)
        .then(response => {
            if (!response.ok) {
                throw new Error(componentPath + " failed to load");
            }

            return response.text();
        })
        .then(html => {
            container.innerHTML = html;

            if (containerId === "header-container") {
                bindHeaderActionFallbacks();
                loadShopCoreScripts();
                loadHeaderDropdowns();
                loadLanguageSwitcher();
                loadMobileEnhancements();
                window.BodySeoulSearch?.init?.();
                window.BodySeoulAccount?.init?.();
                window.initHeaderDropdowns?.();
            } else if (window.BodySeoulLanguage) {
                window.BodySeoulLanguage.init();
            }
        })
        .catch(error => {
            console.error(error);
        });
}

loadShopCoreScripts();
loadComponent(
    "header-container",
    componentVariant("components/header.html", "components/header-category.html", "components/header-product.html")
);
loadComponent(
    "navbar-container",
    componentVariant("components/navbar.html", "components/navbar-category.html", "components/navbar-product.html")
);
loadComponent("footer-container", "components/footer.html");


function loadHeaderDropdowns() {
    if (window.initHeaderDropdowns) {
        window.initHeaderDropdowns();
        return;
    }

    const script = document.createElement("script");
    script.src = componentBase + "js/header-dropdowns.js?v=20260522b";
    script.onload = () => {
        if (window.initHeaderDropdowns) {
            window.initHeaderDropdowns();
        }
    };

    document.body.appendChild(script);
}


function loadLanguageSwitcher() {
    if (window.BodySeoulLanguage) {
        window.BodySeoulLanguage.init();
        return;
    }

    const script = document.createElement("script");
    script.src = componentBase + "js/language.js?v=20260607a";
    script.onload = () => {
        if (window.BodySeoulLanguage) {
            window.BodySeoulLanguage.init();
        }
    };

    document.body.appendChild(script);
}


function loadMobileEnhancements() {
    if (window.BodySeoulMobile) {
        window.BodySeoulMobile.init();
        return;
    }

    const script = document.createElement("script");
    script.src = componentBase + "js/mobile.js?v=20260607a";
    script.onload = () => {
        if (window.BodySeoulMobile) {
            window.BodySeoulMobile.init();
        }
    };

    document.body.appendChild(script);
}


function loadScriptOnce(src, callback) {
    const existing = document.querySelector('script[src="' + src + '"]');

    if (existing) {
        if (callback) {
            if (existing.dataset.loaded === "true") {
                callback();
            } else {
                existing.addEventListener("load", callback, { once: true });
            }
        }
        return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.onload = () => {
        script.dataset.loaded = "true";
        if (callback) callback();
    };
    document.body.appendChild(script);
}

function loadShopCoreScripts() {
    loadScriptOnce(componentBase + "js/firebase-config.js?v=20260521a", () => {
        loadScriptOnce(componentBase + "js/firebase-app.js?v=20260521a", () => {
            loadScriptOnce(componentBase + "js/search.js?v=20260522b", () => window.BodySeoulSearch?.init());
            loadScriptOnce(componentBase + "js/firebase-sync.js?v=20260522d", () => {
                window.BodySeoulSync?.init?.();
                loadScriptOnce(componentBase + "js/account.js?v=20260522f", () => window.BodySeoulAccount?.init());
                loadScriptOnce(componentBase + "js/stock.js?v=20260522a", () => window.BodySeoulStock?.init());
                if (document.getElementById("orders-history-list")) {
                    loadScriptOnce(componentBase + "js/orders-history.js?v=20260522a", () => window.BodySeoulOrdersHistory?.init());
                }

                if (document.querySelector(".checkout-button")) {
                    loadScriptOnce(componentBase + "js/orders.js?v=20260607a", () => window.BodySeoulOrders?.init());
                }
            });
        });
    });
}
