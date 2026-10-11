import express from "express";
import cors from "cors";
import { PRODUCTS, demoStore } from "./store.js";

const app = express();
const PORT = process.env.DEMO_PORT ? parseInt(process.env.DEMO_PORT, 10) : 3001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Shared HTML template wrapper
function renderPage(title: string, bodyContent: string): string {
  const mutation = demoStore.activeMutation;
  const badge = mutation
    ? `<span style="background: #f59e0b; color: #000; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; margin-left: 8px;">ACTIVE MUTATION: ${mutation}</span>`
    : `<span style="background: #10b981; color: #fff; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; margin-left: 8px;">VERSION A (BASELINE)</span>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — Ojastra Demo Store</title>
  <style>
    :root {
      --bg: #0f172a;
      --card-bg: #1e293b;
      --border: #334155;
      --text: #f8fafc;
      --muted: #94a3b8;
      --primary: #3b82f6;
      --primary-hover: #2563eb;
      --success: #10b981;
      --danger: #ef4444;
      --warning: #f59e0b;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { background: var(--bg); color: var(--text); min-height: 100vh; display: flex; flex-direction: column; }
    header { background: #090d16; border-bottom: 1px solid var(--border); padding: 14px 28px; display: flex; justify-content: space-between; align-items: center; }
    .brand { font-size: 18px; font-weight: 700; display: flex; align-items: center; gap: 8px; color: #fff; text-decoration: none; }
    .nav-links a { color: var(--muted); text-decoration: none; margin-left: 20px; font-size: 14px; font-weight: 500; }
    .nav-links a:hover { color: var(--text); }
    main { max-width: 900px; width: 100%; margin: 32px auto; padding: 0 20px; flex: 1; }
    .card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 8px; padding: 24px; margin-bottom: 24px; }
    .btn { display: inline-flex; align-items: center; justify-content: center; padding: 10px 20px; border-radius: 6px; font-weight: 600; font-size: 14px; text-decoration: none; cursor: pointer; border: none; transition: background 0.15s; }
    .btn-primary { background: var(--primary); color: #fff; }
    .btn-primary:hover { background: var(--primary-hover); }
    .btn-secondary { background: #334155; color: #fff; }
    .btn-secondary:hover { background: #475569; }
    .badge { padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; display: inline-block; }
    .table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    .table th, .table td { text-align: left; padding: 12px; border-bottom: 1px solid var(--border); }
    .table th { color: var(--muted); font-size: 13px; font-weight: 600; }
    .form-group { margin-bottom: 16px; }
    .form-group label { display: block; margin-bottom: 6px; font-size: 13px; color: var(--muted); }
    .form-group input { width: 100%; padding: 10px 12px; background: #0b1120; border: 1px solid var(--border); border-radius: 6px; color: #fff; font-size: 14px; }
    .form-group input:focus { outline: none; border-color: var(--primary); }
    footer { border-top: 1px solid var(--border); padding: 16px; text-align: center; font-size: 12px; color: var(--muted); }
  </style>
</head>
<body>
  <header>
    <a href="/" class="brand">
      <span>🔒</span> Ojastra Demo Store ${badge}
    </a>
    <div class="nav-links">
      <a href="/">Products</a>
      <a href="/cart" id="nav-cart-link">Cart (${demoStore.cart.reduce((s, i) => s + i.quantity, 0)})</a>
      <a href="/admin/status">Store Status</a>
    </div>
  </header>
  <main>
    ${bodyContent}
  </main>
  <footer>
    Ojastra Controlled Test Environment — Local Origin http://localhost:${PORT}
  </footer>
</body>
</html>`;
}

// 1. Catalog Page
app.get("/", (req, res) => {
  const productCards = PRODUCTS.map(p => `
    <div class="card" style="display: flex; justify-content: space-between; align-items: center;">
      <div>
        <h2 style="font-size: 18px; margin-bottom: 6px;">${p.name}</h2>
        <p style="color: var(--muted); font-size: 14px; margin-bottom: 8px;">${p.description}</p>
        <span style="font-size: 12px; color: #64748b; font-family: monospace;">SKU: ${p.sku}</span>
      </div>
      <div style="text-align: right; min-width: 140px;">
        <div style="font-size: 20px; font-weight: 700; margin-bottom: 12px;">$${p.price.toFixed(2)}</div>
        <form method="POST" action="/cart/add">
          <input type="hidden" name="sku" value="${p.sku}">
          <button type="submit" id="add-to-cart-${p.sku}" data-testid="add-to-cart-btn" class="btn btn-primary" style="width: 100%;">
            Add to Cart
          </button>
        </form>
      </div>
    </div>
  `).join("");

  res.send(renderPage("Catalog", `
    <div style="margin-bottom: 24px;">
      <h1 style="font-size: 24px; margin-bottom: 8px;">Software Testing Tools Catalog</h1>
      <p style="color: var(--muted); font-size: 14px;">Select an item below to run the deterministic Ojastra checkout verification suite.</p>
    </div>
    ${productCards}
  `));
});

// Add to cart form handler
app.post("/cart/add", (req, res) => {
  const { sku } = req.body;
  if (sku) {
    demoStore.addToCart(sku, 1);
  }
  res.redirect("/cart");
});

// 2. Cart Page with Mutation Variations
app.get("/cart", (req, res) => {
  const { subtotal, tax, total } = demoStore.getCartTotals();
  const mutation = demoStore.activeMutation;

  if (demoStore.cart.length === 0) {
    return res.send(renderPage("Cart", `
      <div class="card" style="text-align: center; padding: 48px 24px;">
        <h2 style="margin-bottom: 12px;">Your Cart is Empty</h2>
        <p style="color: var(--muted); margin-bottom: 24px;">Add a test product from the catalog to begin.</p>
        <a href="/" class="btn btn-primary">Browse Products</a>
      </div>
    `));
  }

  const itemsHtml = demoStore.cart.map(item => `
    <tr>
      <td>
        <strong id="cart-item-name">${item.name}</strong><br>
        <small style="color: var(--muted); font-family: monospace;" id="cart-item-sku">${item.sku}</small>
      </td>
      <td id="cart-item-qty">${item.quantity}</td>
      <td>$${item.price.toFixed(2)}</td>
      <td>$${(item.price * item.quantity).toFixed(2)}</td>
    </tr>
  `).join("");

  // Determine Checkout Button based on Mutation
  let checkoutButtonHtml = "";

  if (mutation === "M01_RENAME_TARGET") {
    // Mutation 1: Button renamed from "Checkout" to "Place order", class and id changed
    checkoutButtonHtml = `
      <a href="/checkout" role="button" id="place-order-action" data-testid="place-order-btn" class="btn btn-primary" style="font-size: 16px; padding: 12px 28px;">
        Place order
      </a>
    `;
  } else if (mutation === "M02_RESTRUCTURE_DOM") {
    // Mutation 2: Restructured DOM with nested wrappers
    checkoutButtonHtml = `
      <div class="custom-dom-restructure-wrapper-outer">
        <div class="summary-action-container-inner" style="display: inline-block;">
          <div class="nested-interactive-slot">
            <a href="/checkout" role="button" id="checkout-action-restructured" data-testid="checkout-btn" class="btn btn-primary" style="font-size: 16px; padding: 12px 28px;">
              Checkout
            </a>
          </div>
        </div>
      </div>
    `;
  } else if (mutation === "M03_MOVE_TARGET") {
    // Mutation 3: Moved to a separate floating action card below summary
    checkoutButtonHtml = `
      <div style="background: #1e1b4b; border: 1px dashed #6366f1; border-radius: 8px; padding: 16px; margin-top: 16px; text-align: center;">
        <span style="display: block; font-size: 12px; color: #a5b4fc; margin-bottom: 8px;">⚡ Fast Order Routing Section</span>
        <a href="/checkout" role="button" id="checkout-relocated" data-testid="checkout-btn" class="btn btn-primary" style="font-size: 16px; padding: 12px 28px;">
          Checkout
        </a>
      </div>
    `;
  } else if (mutation === "M04_ADD_REVIEW_STEP") {
    // Mutation 4: Extra review step
    checkoutButtonHtml = `
      <a href="/checkout/review" role="button" id="proceed-to-review-btn" class="btn btn-primary" style="font-size: 16px; padding: 12px 28px;">
        Proceed to Review
      </a>
    `;
  } else if (mutation === "M05_DUPLICATE_LABEL") {
    // Mutation 5: Duplicate buttons with same name "Place order"
    checkoutButtonHtml = `
      <div style="display: flex; gap: 12px; justify-content: flex-end;">
        <a href="/checkout?mode=express" role="button" id="dup-action-1" class="btn btn-secondary" style="font-size: 15px;">
          Place order
        </a>
        <a href="/checkout?mode=standard" role="button" id="dup-action-2" class="btn btn-primary" style="font-size: 15px;">
          Place order
        </a>
      </div>
    `;
  } else {
    // Baseline Version A: Canonical Checkout button
    checkoutButtonHtml = `
      <a href="/checkout" role="button" id="checkout-button" data-testid="checkout-btn" class="btn btn-primary" style="font-size: 16px; padding: 12px 28px;">
        Checkout
      </a>
    `;
  }

  res.send(renderPage("Cart Summary", `
    <h1 style="font-size: 24px; margin-bottom: 16px;">Review Your Cart</h1>
    <div class="card">
      <table class="table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Quantity</th>
            <th>Unit Price</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <div style="margin-top: 24px; border-top: 1px solid var(--border); padding-top: 16px; display: flex; justify-content: flex-end;">
        <div style="width: 260px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px; color: var(--muted); font-size: 14px;">
            <span>Subtotal</span>
            <span id="cart-subtotal">$${subtotal.toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px; color: var(--muted); font-size: 14px;">
            <span>Estimated Tax</span>
            <span id="cart-tax">$${tax.toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border); font-size: 18px; font-weight: 700;">
            <span>Total</span>
            <span id="cart-total" style="${mutation === 'M06_WRONG_TOTAL' ? 'color: #ef4444;' : ''}">$${total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div style="margin-top: 24px; display: flex; justify-content: space-between; align-items: center;">
        <a href="/" class="btn btn-secondary">Continue Shopping</a>
        <div>
          ${checkoutButtonHtml}
        </div>
      </div>
    </div>
  `));
});

// 3. Checkout Form Page
app.get("/checkout", (req, res) => {
  const { subtotal, tax, total } = demoStore.getCartTotals();
  if (demoStore.cart.length === 0) {
    return res.redirect("/cart");
  }

  res.send(renderPage("Checkout", `
    <h1 style="font-size: 24px; margin-bottom: 16px;">Payment & Shipping Details</h1>
    <div class="card">
      <form id="checkout-form" method="POST" action="/checkout/submit">
        <div class="form-group">
          <label for="customerName">Full Name</label>
          <input type="text" id="customerName" name="customerName" value="Alex Tester" required>
        </div>
        <div class="form-group">
          <label for="customerEmail">Email Address</label>
          <input type="email" id="customerEmail" name="customerEmail" value="alex@ojastra.internal" required>
        </div>
        <div class="form-group">
          <label for="cardNumber">Test Card Number (Synthetic Sandbox)</label>
          <input type="text" id="cardNumber" name="cardNumber" value="4242424242424242" required>
        </div>

        <div style="background: #090d16; border: 1px solid var(--border); border-radius: 6px; padding: 14px; margin: 20px 0;">
          <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: 700;">
            <span>Order Total Due:</span>
            <span id="checkout-total-due">$${total.toFixed(2)}</span>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center;">
          <a href="/cart" class="btn btn-secondary">Back to Cart</a>
          <button type="submit" id="submit-order-button" data-testid="submit-order-btn" class="btn btn-primary" style="font-size: 16px; padding: 12px 28px;">
            Complete Purchase
          </button>
        </div>
      </form>
    </div>
  `));
});

// Intermediate review page for M04
app.get("/checkout/review", (req, res) => {
  res.send(renderPage("Order Review", `
    <h1 style="font-size: 24px; margin-bottom: 16px;">Step 2 of 3: Order Review</h1>
    <div class="card">
      <p style="margin-bottom: 20px; color: var(--muted);">Please review your items before finalizing payment.</p>
      <a href="/checkout" id="confirm-review-and-pay-btn" class="btn btn-primary">Confirm & Pay</a>
    </div>
  `));
});

// Checkout submit handler
app.post("/checkout/submit", (req, res) => {
  try {
    const { customerName, customerEmail, cardNumber } = req.body;
    const order = demoStore.createOrder({
      customerName,
      customerEmail,
      cardNumber
    });
    res.redirect(`/confirmation?orderId=${order.id}`);
  } catch (err: any) {
    if (err.statusCode === 503) {
      return res.status(503).send(renderPage("503 Service Unavailable", `
        <div class="card" style="border-color: var(--danger); text-align: center; padding: 40px 20px;">
          <h2 style="color: var(--danger); margin-bottom: 12px;">503 Service Unavailable</h2>
          <p style="color: var(--muted); margin-bottom: 24px;">The order processing service is temporarily offline for maintenance.</p>
          <a href="/cart" class="btn btn-secondary">Return to Cart</a>
        </div>
      `));
    }
    res.status(400).send(renderPage("Error", `
      <div class="card" style="border-color: var(--danger);">
        <h2 style="color: var(--danger); margin-bottom: 12px;">Order Failed</h2>
        <p style="color: var(--muted);">${err.message}</p>
        <a href="/cart" class="btn btn-secondary" style="margin-top: 16px;">Back to Cart</a>
      </div>
    `));
  }
});

// 4. Confirmation Page
app.get("/confirmation", (req, res) => {
  const orderId = req.query.orderId as string;
  const order = demoStore.orders.find(o => o.id === orderId);

  if (!order) {
    return res.status(404).send(renderPage("Not Found", `<div class="card">Order not found</div>`));
  }

  const isConfirmed = order.status === "confirmed" && order.paymentStatus === "approved";
  const statusColor = isConfirmed ? "var(--success)" : "var(--danger)";

  res.send(renderPage("Order Confirmation", `
    <div class="card" style="text-align: center; padding: 36px 20px;" id="confirmation-card" data-testid="confirmation-banner">
      <div style="font-size: 48px; margin-bottom: 12px;">${isConfirmed ? "✅" : "❌"}</div>
      <h1 style="font-size: 26px; color: ${statusColor}; margin-bottom: 8px;" id="order-status-heading">
        ${isConfirmed ? "Order Confirmed!" : "Order Declined"}
      </h1>
      <p style="color: var(--muted); font-size: 15px; margin-bottom: 24px;">
        ${isConfirmed ? "Thank you for your purchase. Your order has been placed successfully." : "Payment could not be processed. Please check your card."}
      </p>

      <div style="background: #090d16; border: 1px solid var(--border); border-radius: 8px; padding: 20px; max-width: 480px; margin: 0 auto 24px auto; text-align: left;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
          <span style="color: var(--muted);">Order Reference:</span>
          <strong id="confirmed-order-id" style="font-family: monospace;">${order.id}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
          <span style="color: var(--muted);">Product SKU:</span>
          <span id="confirmed-order-sku" style="font-family: monospace;">${order.sku}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
          <span style="color: var(--muted);">Quantity:</span>
          <span id="confirmed-order-qty">${order.quantity}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
          <span style="color: var(--muted);">Payment Status:</span>
          <span id="confirmed-payment-status" style="font-weight: 600; color: ${statusColor};">${order.paymentStatus.toUpperCase()}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding-top: 10px; border-top: 1px solid var(--border); font-size: 16px; font-weight: 700;">
          <span>Total Charged:</span>
          <span id="confirmed-order-total">$${order.total.toFixed(2)}</span>
        </div>
      </div>

      <a href="/" class="btn btn-primary">Start New Test Workflow</a>
    </div>
  `));
});

// 5. Store Status / Diagnostics
app.get("/admin/status", (req, res) => {
  res.json({
    activeMutation: demoStore.activeMutation,
    cartItemCount: demoStore.cart.length,
    ordersCount: demoStore.orders.length,
    orders: demoStore.orders
  });
});

// ==========================================
// TEST ORACLE & VERIFICATION REST APIS
// ==========================================

// Reset fixtures to clean baseline Version A
app.post("/api/fixtures/reset", (req, res) => {
  demoStore.reset();
  res.json({
    success: true,
    message: "Store fixtures reset to clean baseline Version A",
    activeMutation: null,
    ordersCount: 0
  });
});

// Set active mutation
app.post("/api/mutations/active", (req, res) => {
  const { scenarioId } = req.body;
  demoStore.activeMutation = scenarioId || null;
  res.json({
    success: true,
    activeMutation: demoStore.activeMutation
  });
});

// Get active mutation
app.get("/api/mutations/active", (req, res) => {
  res.json({
    activeMutation: demoStore.activeMutation
  });
});

// Add item to cart programmatically
app.post("/api/cart/add", (req, res) => {
  const { sku, quantity } = req.body;
  try {
    const item = demoStore.addToCart(sku || "SKU-PROD-001", quantity || 1);
    res.json({ success: true, item, cartTotals: demoStore.getCartTotals() });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Verification Endpoint for Verifier: Get full order details
app.get("/api/orders/:orderId", (req, res) => {
  const order = demoStore.orders.find(o => o.id === req.params.orderId);
  if (!order) {
    return res.status(404).json({ error: "Order not found" });
  }
  res.json(order);
});

// List all orders (used to verify no duplicate orders)
app.get("/api/orders", (req, res) => {
  res.json({
    count: demoStore.orders.length,
    orders: demoStore.orders
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`[Ojastra Demo App] Running on http://localhost:${PORT}`);
});
