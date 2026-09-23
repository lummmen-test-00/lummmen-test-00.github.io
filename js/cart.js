(function () {
    'use strict';

    var CART_STORAGE_KEY = 'cart';
    var LUMMMEN_ENDPOINT = 'https://europe-west1-ux-pro.cloudfunctions.net/processLuxiferDataEU';
    var LUMMMEN_SITE_ID = '62';
    var LUMMMEN_CATEGORY = 'tea';
    var VIEW_EVENT_DELAY_MS = 500;

    function slugify(name) {
        return String(name)
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
    }

    function getVisitorId() {
        var match = document.cookie.match(/(?:^|; )matomoLuxiVisitorId=([^;]*)/);
        return match ? decodeURIComponent(match[1]) : '';
    }

    function sendLummmenData(data) {
        var visitorId = getVisitorId();
        if (!visitorId) {
            console.log('matomo not ready');
            return;
        }
        fetch(LUMMMEN_ENDPOINT, {
            method: 'POST',
            keepalive: true,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(Object.assign({}, data, {
                url: location.href,
                siteId: LUMMMEN_SITE_ID,
                visitorId: visitorId,
                ts: Number((Date.now() / 1000).toFixed(3))
            }))
        });
    }

    function buildLummmenItem(name, price, quantity) {
        var item = {
            sku: slugify(name),
            name: name,
            category: LUMMMEN_CATEGORY,
            price: price
        };
        if (quantity != null) item.quantity = quantity;
        return item;
    }

    function generateOrderId() {
        var bytes = new Uint8Array(8);
        crypto.getRandomValues(bytes);
        return Array.from(bytes, function (b) { return b.toString(16).padStart(2, '0'); }).join('');
    }

    function getCart() {
        try {
            var raw = localStorage.getItem(CART_STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    }

    function saveCart(cart) {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    }

    function findItem(cart, sku, variantSku) {
        return cart.find(function (item) {
            return item.sku === sku && (item.variantSku || null) === (variantSku || null);
        });
    }

    function addToCart(product) {
        var cart = getCart();
        var sku = slugify(product.name);
        var variantSku = product.variantSku || null;
        var existing = findItem(cart, sku, variantSku);
        if (existing) {
            existing.quantity += 1;
        } else {
            cart.push({
                sku: sku,
                name: product.name,
                variantName: product.variantName || null,
                variantSku: variantSku,
                price: product.price,
                quantity: 1,
                category: product.category || [],
                image: product.image || ''
            });
        }
        saveCart(cart);
        renderCartBadge();
        renderCartItems();
        sendLummmenData({
            type: 'product_added_to_cart',
            items: [buildLummmenItem(product.name, product.price, 1)]
        });
    }

    function removeFromCart(sku, variantSku) {
        var removed = findItem(getCart(), sku, variantSku);
        var cart = getCart().filter(function (item) {
            return !(item.sku === sku && (item.variantSku || null) === (variantSku || null));
        });
        saveCart(cart);
        renderCartBadge();
        renderCartItems();
        if (removed) {
            sendLummmenData({
                type: 'product_removed_from_cart',
                items: [buildLummmenItem(removed.name, removed.price, removed.quantity)]
            });
        }
    }

    function cartCount() {
        return getCart().reduce(function (sum, item) { return sum + item.quantity; }, 0);
    }

    function cartTotal() {
        return getCart().reduce(function (sum, item) { return sum + item.price * item.quantity; }, 0);
    }

    function renderCartBadge() {
        var badge = document.getElementById('cartBadge');
        if (!badge) return;
        var count = cartCount();
        badge.textContent = count;
        badge.style.display = count > 0 ? 'inline-block' : 'none';
    }

    function ensureCartModal() {
        if (document.getElementById('cartModal')) return;
        var modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.id = 'cartModal';
        modal.tabIndex = -1;
        modal.setAttribute('aria-hidden', 'true');
        modal.innerHTML =
            '<div class="modal-dialog modal-dialog-scrollable">' +
                '<div class="modal-content">' +
                    '<div class="modal-header">' +
                        '<h5 class="modal-title">Your Cart</h5>' +
                        '<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>' +
                    '</div>' +
                    '<div class="modal-body" id="cartModalBody"></div>' +
                    '<div class="modal-footer d-flex justify-content-between align-items-center">' +
                        '<h5 class="mb-0">Total: $<span id="cartModalTotal">0.00</span></h5>' +
                        '<button type="button" id="cartCheckoutBtn" class="btn btn-primary rounded-pill px-4" disabled>Checkout</button>' +
                    '</div>' +
                '</div>' +
            '</div>';
        document.body.appendChild(modal);

        document.getElementById('cartCheckoutBtn').addEventListener('click', function () {
            checkout();
        });
    }

    function checkout() {
        var cart = getCart();
        var total = cartTotal();
        if (cart.length > 0) {
            sendLummmenData({
                type: 'checkout_completed',
                orderId: generateOrderId(),
                revenue: total,
                revenueSubtotal: total,
                revenueTax: 0,
                revenueShipping: 0,
                revenueDiscount: 0,
                items: cart.map(function (item) {
                    return buildLummmenItem(item.name, item.price, item.quantity);
                })
            });
        }
        saveCart([]);
        renderCartBadge();

        var body = document.getElementById('cartModalBody');
        var totalEl = document.getElementById('cartModalTotal');
        var checkoutBtn = document.getElementById('cartCheckoutBtn');
        body.innerHTML = '<p class="text-center mb-0">Thank you!</p>';
        totalEl.textContent = '0.00';
        checkoutBtn.disabled = true;
    }

    function escapeHtml(str) {
        var div = document.createElement('div');
        div.textContent = str == null ? '' : str;
        return div.innerHTML;
    }

    function renderCartItems() {
        var body = document.getElementById('cartModalBody');
        var totalEl = document.getElementById('cartModalTotal');
        if (!body || !totalEl) return;
        var cart = getCart();

        if (cart.length === 0) {
            body.innerHTML = '<p class="text-center mb-0">Your cart is empty.</p>';
        } else {
            body.innerHTML = cart.map(function (item) {
                var variantSkuAttr = escapeHtml(item.variantSku || '');
                return (
                    '<div class="d-flex align-items-center mb-3">' +
                        '<img src="' + escapeHtml(item.image) + '" alt="" style="width:60px;height:60px;object-fit:cover;" class="rounded me-3">' +
                        '<div class="flex-grow-1">' +
                            '<h6 class="mb-1">' + escapeHtml(item.name) + '</h6>' +
                            '<small class="text-muted d-block mb-1">$' + item.price.toFixed(2) + ' each</small>' +
                            '<small class="text-muted d-block">Qty: ' + item.quantity + '</small>' +
                        '</div>' +
                        '<div class="text-end ms-3">' +
                            '<div class="fw-bold mb-1">$' + (item.price * item.quantity).toFixed(2) + '</div>' +
                            '<button type="button" class="btn btn-sm btn-link text-danger p-0 cart-remove-btn" data-sku="' + escapeHtml(item.sku) + '" data-variant-sku="' + variantSkuAttr + '">Remove</button>' +
                        '</div>' +
                    '</div>'
                );
            }).join('');
        }
        totalEl.textContent = cartTotal().toFixed(2);

        var checkoutBtn = document.getElementById('cartCheckoutBtn');
        if (checkoutBtn) {
            checkoutBtn.disabled = cart.length === 0;
        }

        body.querySelectorAll('.cart-remove-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                removeFromCart(btn.getAttribute('data-sku'), btn.getAttribute('data-variant-sku'));
            });
        });
    }

    function initCartButton() {
        ensureCartModal();
        var cartBtn = document.getElementById('cartNavBtn');
        if (cartBtn) {
            cartBtn.addEventListener('click', function () {
                renderCartItems();
                var modalEl = document.getElementById('cartModal');
                var modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
                modal.show();
            });
        }
        renderCartBadge();
    }

    function initAddToCartButtons() {
        document.querySelectorAll('.add-to-cart-btn').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                addToCart({
                    name: btn.getAttribute('data-product-name'),
                    price: parseFloat(btn.getAttribute('data-product-price')),
                    image: btn.getAttribute('data-product-image')
                });
            });
        });
    }

    function initViewEvents() {
        var path = location.pathname;
        if (path.indexOf('/products/') !== -1) {
            var btn = document.querySelector('.add-to-cart-btn');
            if (!btn) return;
            setTimeout(function () {
                sendLummmenData({
                    type: 'product_viewed',
                    items: [buildLummmenItem(
                        btn.getAttribute('data-product-name'),
                        parseFloat(btn.getAttribute('data-product-price'))
                    )]
                });
            }, VIEW_EVENT_DELAY_MS);
        } else if (/\/store(\.html)?$/.test(path)) {
            setTimeout(function () {
                sendLummmenData({ type: 'collection_viewed', title: 'all products' });
            }, VIEW_EVENT_DELAY_MS);
        }
    }

    document.addEventListener('DOMContentLoaded', function () {
        initCartButton();
        initAddToCartButtons();
        initViewEvents();
    });
})();
