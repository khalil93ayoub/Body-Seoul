/* Shared Meta Pixel. Only this module initializes the pixel. */
(function () {
    "use strict";
    if (window.BodySeoulMeta) return;
    const PIXEL_ID = "691179238763479";
    const CONSENT_KEY = "body_seoul_marketing_consent_v1";
    const standard = new Set(["PageView", "ViewContent", "AddToCart", "AddToWishlist", "InitiateCheckout", "Purchase", "Search", "CompleteRegistration", "Contact"]);
    const contextual = new Map();
    const sentOrders = new Set();
    // Load automatically unless this visitor has explicitly opted out.
    let consent = "granted";
    let started = false;
    let pageViewed = false;
    try { consent = localStorage.getItem(CONSENT_KEY) === "denied" ? "denied" : "granted"; } catch (_) {}

    function start() {
        if (started || consent !== "granted") return;
        started = true;
        const f = window;
        if (!f.fbq) {
            const n = f.fbq = function () {
                n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
            };
            if (!f._fbq) f._fbq = n;
            n.push = n;
            n.loaded = true;
            n.version = "2.0";
            n.queue = [];
            const script = document.createElement("script");
            script.async = true;
            script.src = "https://connect.facebook.net/en_US/fbevents.js";
            document.head.appendChild(script);
        }
        f.fbq("consent", "grant");
        f.fbq("set", "autoConfig", false, PIXEL_ID);
        f.fbq("init", PIXEL_ID);
    }

    function send(kind, name, payload = {}, options = {}) {
        try {
            if (name === "ViewContent" || name === "InitiateCheckout") contextual.set(name, [kind, name, payload, options]);
            if (consent !== "granted") return false;
            start();
            if (name === "PageView" && pageViewed) return false;
            const orderId = name === "Purchase" ? String(options.eventID || payload.order_id || "") : "";
            if (name === "Purchase" && (!orderId || sentOrders.has(orderId))) return false;
            const command = standard.has(name) ? "trackSingle" : "trackSingleCustom";
            window.fbq(command, PIXEL_ID, name, payload, options);
            if (name === "PageView") pageViewed = true;
            if (orderId) sentOrders.add(orderId);
            return true;
        } catch (_) {
            // Analytics must never interrupt shopping or order confirmation.
            return false;
        }
    }

    function number(value) {
        if (typeof value === "number") return Number.isFinite(value) ? value : 0;
        return Number(String(value || "").replace(/\s/g, "").replace(",", ".").replace(/[^\d.-]/g, "")) || 0;
    }

    function item(name, product, quantity = 1) {
        if (!product) return;
        const id = String(product.id || "").trim();
        const count = number(quantity);
        if (!id || count <= 0) return;
        const price = number(product.price);
        send(standard.has(name) ? "track" : "trackCustom", name, {
            content_ids: [id],
            content_type: "product",
            contents: [{ id, quantity: count, item_price: price }],
            value: Math.round(price * count * 100) / 100,
            currency: "MAD",
            num_items: count
        });
    }

    function setConsent(value) {
        const previouslyGranted = consent === "granted";
        consent = value === "granted" ? "granted" : "denied";
        try { localStorage.setItem(CONSENT_KEY, consent); } catch (_) {}
        if (consent === "granted") {
            start();
            window.fbq("consent", "grant");
            if (!previouslyGranted) {
                send("track", "PageView");
                contextual.forEach(args => send(...args));
            }
        } else if (started) {
            window.fbq("consent", "revoke");
        }
        document.getElementById("bs-marketing-consent")?.remove();
    }

    function showConsent() {
        if (document.getElementById("bs-marketing-consent")) return;
        const panel = document.createElement("section");
        panel.id = "bs-marketing-consent";
        panel.setAttribute("aria-label", "Cookies publicitaires");
        panel.style.cssText = "position:fixed;bottom:80px;left:16px;right:16px;max-width:560px;margin:auto;padding:20px;background:white;color:#222;border:1px solid #ddd;border-radius:16px;box-shadow:0 8px 30px #0002;z-index:10000;font:14px/1.5 sans-serif;";
        panel.innerHTML = '<strong>Vos préférences de confidentialité</strong><p>Avec votre accord, le pixel Meta mesure vos visites et achats pour personnaliser nos publicités. Vous pouvez refuser et continuer vos achats, ou modifier votre choix via « Cookies ».</p><p lang="ar" dir="rtl">بموافقتك، نستخدم بكسل Meta لقياس الزيارات والطلبات وتخصيص الإعلانات. يمكنك الرفض ومواصلة التسوق وتغيير اختيارك عبر زر Cookies.</p><div style="display:flex;gap:12px;flex-wrap:wrap"><button type="button" data-consent="denied">Refuser / رفض</button><button type="button" data-consent="granted">Accepter / قبول</button></div>';
        panel.querySelectorAll("button").forEach(button => {
            button.style.cssText = "flex:1;padding:10px;border:1px solid #555;border-radius:8px;background:#fff;color:#222;cursor:pointer;font:inherit";
            button.addEventListener("click", () => setConsent(button.dataset.consent));
        });
        document.body.appendChild(panel);
    }

    function initUI() {
        const settings = document.createElement("button");
        settings.type = "button";
        settings.textContent = "Cookies";
        settings.setAttribute("aria-label", "Modifier les préférences de cookies");
        settings.style.cssText = "position:fixed;bottom:78px;left:8px;z-index:9998;padding:5px 9px;border:1px solid #ddd;border-radius:12px;background:#fff;color:#555;font:12px sans-serif;cursor:pointer";
        settings.addEventListener("click", showConsent);
        document.body.appendChild(settings);

        // Only fixed interaction labels are sent: no form fields, link queries or customer data.
        document.addEventListener("click", event => {
            const target = event.target.closest?.("a,button,.thumb");
            if (!target || target.closest("#bs-marketing-consent") || target === settings) return;
            const href = target.getAttribute("href") || "";
            if (/^(https:\/\/wa\.me\/|https:\/\/api\.whatsapp\.com\/|tel:|mailto:)/.test(href)) {
                send("track", "Contact", { contact_method: href.startsWith("tel:") ? "phone" : href.startsWith("mailto:") ? "email" : "whatsapp" });
            } else if (target.matches(".thumb,.gallery-thumbnails img,.product-tab-button")) {
                send("trackCustom", "ProductInteraction", { interaction: target.matches(".product-tab-button") ? "details_tab" : "gallery" });
            } else if (target.matches("a") && !href.startsWith("#")) {
                send("trackCustom", "NavigationClick");
            }
        }, true);
        const milestones = new Set();
        window.addEventListener("scroll", () => {
            if (consent !== "granted") return;
            const available = document.documentElement.scrollHeight - window.innerHeight;
            if (available <= 0) return;
            const percentage = Math.floor(window.scrollY / available * 100);
            [25, 50, 75, 100].forEach(depth => {
                if (percentage >= depth && !milestones.has(depth)) {
                    milestones.add(depth);
                    send("trackCustom", "ScrollDepth", { percent: depth });
                }
            });
        }, { passive: true });
    }

    window.BodySeoulMeta = { send, item, setConsent, showConsent };
    send("track", "PageView");
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initUI, { once: true });
    else initUI();
})();
