export interface Product {
  sku: string;
  name: string;
  description: string;
  price: number;
}

export interface CartItem {
  sku: string;
  name: string;
  price: number;
  quantity: number;
}

export interface Order {
  id: string;
  sku: string;
  productName: string;
  quantity: number;
  subtotal: number;
  tax: number;
  total: number;
  status: "confirmed" | "declined" | "pending";
  paymentStatus: "approved" | "failed";
  customerEmail: string;
  customerName: string;
  idempotencyKey?: string;
  createdAt: string;
}

export const PRODUCTS: Product[] = [
  {
    sku: "SKU-PROD-001",
    name: "Enterprise Testing Suite Pro",
    description: "Self-healing test runner with deterministic policy verification.",
    price: 49.00
  },
  {
    sku: "SKU-PROD-002",
    name: "Telemetry Pipeline Addon",
    description: "High-resolution real-time test event collector and trace recorder.",
    price: 25.00
  }
];

class DemoStore {
  public activeMutation: string | null = null;
  public cart: CartItem[] = [];
  public orders: Order[] = [];
  public orderCounter: number = 1000;

  constructor() {
    this.reset();
  }

  public reset(): void {
    this.activeMutation = null;
    this.cart = [];
    this.orders = [];
    this.orderCounter = 1000;
  }

  public addToCart(sku: string, quantity: number = 1): CartItem {
    const product = PRODUCTS.find(p => p.sku === sku);
    if (!product) throw new Error(`Product not found: ${sku}`);

    const existing = this.cart.find(c => c.sku === sku);
    if (existing) {
      existing.quantity += quantity;
      return existing;
    } else {
      const newItem: CartItem = {
        sku: product.sku,
        name: product.name,
        price: product.price,
        quantity
      };
      this.cart.push(newItem);
      return newItem;
    }
  }

  public getCartTotals(): { subtotal: number; tax: number; total: number } {
    const subtotal = this.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const tax = subtotal > 0 ? 5.00 : 0;
    let total = subtotal + tax;

    // Mutation M06: Seeded business-logic fault! Incorrect order total calculation (+10)
    if (this.activeMutation === "M06_WRONG_TOTAL") {
      total += 10.00;
    }

    return {
      subtotal: Number(subtotal.toFixed(2)),
      tax: Number(tax.toFixed(2)),
      total: Number(total.toFixed(2))
    };
  }

  public createOrder(details: {
    customerName: string;
    customerEmail: string;
    cardNumber?: string;
    idempotencyKey?: string;
  }): Order {
    if (this.cart.length === 0) {
      throw new Error("Cart is empty");
    }

    // Mutation M08: Server unavailable
    if (this.activeMutation === "M08_SERVER_UNAVAILABLE") {
      const err = new Error("503 Service Unavailable: Database lock failure");
      (err as any).statusCode = 503;
      throw err;
    }

    // Duplicate submission check using idempotency key
    if (details.idempotencyKey) {
      const duplicate = this.orders.find(o => o.idempotencyKey === details.idempotencyKey);
      if (duplicate) {
        throw new Error(`Duplicate order detected with idempotency key: ${details.idempotencyKey}`);
      }
    }

    const { subtotal, tax, total } = this.getCartTotals();
    const primaryItem = this.cart[0];

    // Mutation M07: Seeded payment error
    const isPaymentDeclined = this.activeMutation === "M07_PAYMENT_ERROR";
    const paymentStatus = isPaymentDeclined ? "failed" : "approved";
    const orderStatus = isPaymentDeclined ? "declined" : "confirmed";

    this.orderCounter += 1;
    const orderId = `ORD-${this.orderCounter}`;

    const order: Order = {
      id: orderId,
      sku: primaryItem.sku,
      productName: primaryItem.name,
      quantity: primaryItem.quantity,
      subtotal,
      tax,
      total,
      status: orderStatus,
      paymentStatus,
      customerName: details.customerName || "Alex Tester",
      customerEmail: details.customerEmail || "alex@intentlock.internal",
      idempotencyKey: details.idempotencyKey,
      createdAt: new Date().toISOString()
    };

    this.orders.push(order);
    this.cart = []; // Empty cart after order
    return order;
  }
}

export const demoStore = new DemoStore();
