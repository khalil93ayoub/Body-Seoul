const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

function shop() {
    const values = new Map();
    const storage = { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value) };
    const context = vm.createContext({
        window: { localStorage: storage, location: { pathname: '/checkout.html' } },
        localStorage: storage,
        document: { getElementById: () => null, querySelector: () => null, readyState: 'loading', addEventListener() {} },
        URL, console
    });
    vm.runInContext(read('js/products-data.js'), context);
    vm.runInContext(read('js/cart.js'), context);
    const orders = read('js/orders.js').replace('window.BodySeoulOrders = { init: initOrders };',
        'window.orderPricing = { readCart, total, normalizeItems, orderLines, deliveryFeeForSubtotal };');
    vm.runInContext(orders, context);
    return context;
}

test('saved cart and order use current catalog prices and preserve quantities', () => {
    const ctx = shop();
    ctx.localStorage.setItem('cart', JSON.stringify([
        { id: 'Retinol Shot Tightening Serum', price: 239, quantity: 2 },
        { id: 'relief-sun', price: 219, quantity: 1 }
    ]));
    vm.runInContext('cart = readCart(); normalizeCart();', ctx);
    assert.equal(vm.runInContext('cartTotal()', ctx), 743.8);
    assert.equal(vm.runInContext('checkoutGrandTotal()', ctx), 783.8);
    const orders = ctx.window.orderPricing;
    const items = orders.readCart();
    assert.equal(orders.total(items), 743.8);
    assert.equal(orders.normalizeItems(items)[0].price, 259);
    assert.equal(items[0].quantity, 2);
    assert.match(orders.orderLines(items), /518\.34 DHS/);
});

test('delivery threshold stays at 800 MAD including decimal subtotals', () => {
    const ctx = shop();
    for (const [subtotal, expected] of [[0, 0], [799.99, 40], [800, 0], [800.01, 0]]) {
        assert.equal(ctx.window.BodySeoulCheckoutTotals.deliveryFee(subtotal), expected);
        assert.equal(ctx.window.orderPricing.deliveryFeeForSubtotal(subtotal), expected);
    }
});

test('display, sorting and history parsers preserve decimal prices', () => {
    for (const file of ['cart', 'orders', 'category', 'favorites', 'product-page', 'header-dropdowns', 'account', 'mobile', 'orders-history']) {
        const source = read(`js/${file}.js`);
        const match = source.match(/function (?:priceToNumber|favoritePriceToNumber|numericPrice|headerPrice)\(price\) \{[\s\S]*?\n\s*\}/);
        // cart has an early numeric return, so use the full function up to its next declaration.
        const fn = file === 'cart' ? source.slice(source.indexOf('function priceToNumber'), source.indexOf('\nfunction ', source.indexOf('function priceToNumber') + 1)) : match[0];
        const parse = vm.runInNewContext('(' + fn + ')');
        for (const input of [257.67, '257.67 DHS', '257,67 DHS']) assert.equal(parse(input), 257.67, file);
        assert.equal(parse('349 DHS'), 349, file);
    }
});

test('only five catalog prices changed; pack prices remain fixed', () => {
    const ctx = shop();
    const expected = [179,252.50,269,225.80,229,306,353,259,249,279,568,448,578,797,538,1149,899,929,929];
    assert.deepEqual(Array.from(ctx.window.allProducts, p => Number(p.price.split(' ')[0])), expected);
    for (const product of ctx.window.allProducts.filter(p => !p.isPack)) {
        const html = read(product.link.replace('../',''));
        assert.match(html, new RegExp('class="product-price">\\s*' + product.price.replace('.', '\\.') + '\\s*<'));
    }
});
