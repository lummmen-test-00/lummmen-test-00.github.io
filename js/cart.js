(function () {
    'use strict';

    var CART_STORAGE_KEY = 'cart';

    function slugify(name) {
        return String(name)
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
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
    }

    function removeFromCart(sku, variantSku) {
        var cart = getCart().filter(function (item) {
            return !(item.sku === sku && (item.variantSku || null) === (variantSku || null));
        });
        saveCart(cart);
        renderCartBadge();
        renderCartItems();
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

    document.addEventListener('DOMContentLoaded', function () {
        initCartButton();
        initAddToCartButtons();
    });
})();
