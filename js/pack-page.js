(function () {
    const root = document.querySelector("[data-pack-id]");

    if (!root || !Array.isArray(window.allProducts)) {
        return;
    }

    const pack = window.allProducts.find(product => product.id === root.dataset.packId && product.isPack);

    if (!pack) {
        root.innerHTML = '<section class="pack-not-found"><h1>Pack introuvable</h1><p>Ce pack n’est pas disponible pour le moment.</p><a href="../../categories/packs.html">Voir les packs</a></section>';
        return;
    }

    const escapeHTML = value => String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#039;");

    const productPath = value => "../../" + String(value || "").replace(/^\.\.\//, "");
    const members = (pack.items || [])
        .map(id => window.allProducts.find(product => product.id === id))
        .filter(Boolean);

    if (!members.length) {
        return;
    }

    const quantities = new Map();
    members.forEach(member => quantities.set(member.id, (quantities.get(member.id) || 0) + 1));
    const uniqueMembers = Array.from(quantities.entries()).map(([id, quantity]) => ({
        product: members.find(member => member.id === id),
        quantity
    }));

    const thumbnails = [pack, ...members].map((member, index) =>
        '<img src="' + productPath(member.image) + '" alt="' + escapeHTML(member.title) + '" class="thumb' + (index === 0 ? ' active-thumb' : '') + '" onclick="changeImage(' + index + ')">' 
    ).join("");

    const includedItems = uniqueMembers.map(({ product, quantity }) =>
        '<li><i class="fa-solid fa-check"></i><a href="' + productPath(product.link) + '">' +
        (quantity > 1 ? quantity + ' × ' : '') + escapeHTML(product.title) + '</a></li>'
    ).join("");

    const benefits = uniqueMembers.map(({ product, quantity }) =>
        '<div class="benefit"><i class="fa-solid fa-check"></i><span>' +
        (quantity > 1 ? quantity + ' × ' : '') + escapeHTML(product.title) + '</span></div>'
    ).join("");

    const leadImage = productPath(pack.image);
    document.body.dataset.packPage = "true";
    document.title = pack.title + " - Body & Seoul";

    root.innerHTML = `
        <nav class="breadcrumb breadcrumb-links product-breadcrumb" aria-label="Fil d'Ariane">
            <a href="../../index.html">Accueil</a>
            <span>›</span>
            <a href="../../categories/packs.html">Packs</a>
            <span>›</span>
            <span>${escapeHTML(pack.title)}</span>
        </nav>

        <section class="product-page pack-product-page">
            <div class="product-gallery pack-gallery">
                <div class="gallery-thumbnails">${thumbnails}</div>
                <div class="gallery-main">
                    <img id="mainProductImage" src="${leadImage}" alt="${escapeHTML(pack.title)}">
                </div>
            </div>

            <div class="product-details">
                <p class="product-brand">BODY & SEOUL</p>
                <h1 class="product-title">${escapeHTML(pack.title)}</h1>
                <div class="product-rating">
                    <i class="fa-solid fa-star"></i>
                    <i class="fa-solid fa-star"></i>
                    <i class="fa-solid fa-star"></i>
                    <i class="fa-solid fa-star"></i>
                    <i class="fa-solid fa-star-half-stroke"></i>
                    <span>${escapeHTML(pack.rating)} · ${escapeHTML(pack.reviews)} avis</span>
                </div>
                <div class="product-price-block">
                    <span class="product-old-price">${escapeHTML(pack.oldPrice)}</span>
                    <div class="product-price">${escapeHTML(pack.price)}</div>
                    <p class="pack-saving">Économisez 15% sur ce pack</p>
                </div>
                <p class="product-description">${escapeHTML(pack.description)}</p>
                <div class="product-benefits">${benefits}</div>
                <div class="product-actions">
                    <div class="quantity-selector">
                        <button type="button" onclick="decreaseQuantity()">-</button>
                        <span id="quantity-value">1</span>
                        <button type="button" onclick="increaseQuantity()">+</button>
                    </div>
                    <button class="favorite-button" data-product="${escapeHTML(pack.id)}" type="button" aria-label="Ajouter aux favoris"><i class="fa-regular fa-heart"></i></button>
                    <button class="add-cart-button" type="button">Ajouter au panier</button>
                </div>
                <div class="delivery-box">
                    <div class="delivery-item"><i class="fa-solid fa-truck"></i><div><h4>Livraison rapide</h4><p>Partout au Maroc</p></div></div>
                    <div class="delivery-item"><i class="fa-solid fa-shield"></i><div><h4>Produits authentiques</h4><p>Importés directement de Corée</p></div></div>
                </div>
            </div>
        </section>

        <section class="product-extra-info">
            <div class="info-card">
                <h2>Ce pack contient</h2>
                <ul class="pack-contents">${includedItems}</ul>
            </div>
            <div class="info-card">
                <h2>Comment utiliser ce pack</h2>
                <p>Utilisez chaque produit selon ses conseils d’utilisation. Pour les soins contenant du rétinol, introduisez-les progressivement dans votre routine et appliquez une protection solaire le matin.</p>
            </div>
            <div class="info-card">
                <h2>Pourquoi choisir ce pack</h2>
                <p>Ces produits sont réunis pour compléter votre routine tout en vous faisant économiser 15% par rapport à l’achat des produits séparément.</p>
            </div>
        </section>
    `;
})();
