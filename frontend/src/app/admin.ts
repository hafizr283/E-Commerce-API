import { Component, inject, signal, OnInit } from "@angular/core";
import { DatePipe, DecimalPipe } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Api } from "./api";
import { Product, Order, Page, message, fields } from "./models";
@Component({
  imports: [DatePipe, DecimalPipe, FormsModule],
  template: ` <section class="container page admin">
    <div class="section-heading">
      <div>
        <p class="eyebrow">BEHIND THE EVERYDAY</p>
        <h1>Store studio.</h1>
      </div>
      <span class="admin-label">ADMIN WORKSPACE</span>
    </div>
    @if (metrics(); as m) {
      <div class="metric-grid">
        <div>
          <span>Collected revenue</span
          ><strong>৳{{ m.revenue | number: "1.0-2" }}</strong
          ><small>Delivered, paid orders</small>
        </div>
        <div>
          <span>Total orders</span><strong>{{ m.orders }}</strong
          ><small>{{ m.awaitingShipment }} ready to ship</small>
        </div>
        <div>
          <span>Active products</span><strong>{{ m.activeProducts }}</strong
          ><small>Available in the storefront</small>
        </div>
        <div>
          <span>Low stock</span><strong>{{ m.lowStock }}</strong
          ><small>5 units or fewer</small>
        </div>
      </div>
    }
    <div class="admin-toolbar">
      <div class="category-tabs">
        <button
          [class.active]="tab() === 'products'"
          (click)="tab.set('products')"
        >
          Product catalog</button
        ><button
          [class.active]="tab() === 'orders'"
          (click)="tab.set('orders')"
        >
          Order fulfillment
        </button>
      </div>
      @if (tab() === "products") {
        <button class="button small-button" (click)="newProduct()">
          ＋ Add product
        </button>
      }
    </div>
    @if (error()) {
      <div class="alert error" role="alert">{{ error() }}</div>
    }
    @if (notice()) {
      <div class="alert success" role="status">{{ notice() }}</div>
    }
    @if (loading()) {
      <p class="loading" role="status">Opening your studio…</p>
    }
    @if (editor()) {
      <section class="editor">
        <div class="section-heading">
          <h2>{{ draft.id ? "Edit product" : "A new essential" }}</h2>
          <button class="text-button" (click)="editor.set(false)">
            Close editor ×
          </button>
        </div>
        <form #form="ngForm" (ngSubmit)="save()">
          <div class="form-grid">
            <div>
              <label for="product-name">Product name</label
              ><input
                id="product-name"
                name="name"
                [(ngModel)]="draft.name"
                required
                maxlength="120"
              />
            </div>
            <div>
              <label for="category">Category</label
              ><input
                id="category"
                name="category"
                [(ngModel)]="draft.category"
                required
                maxlength="60"
                list="category-options"
              /><datalist id="category-options">
                <option>Everyday</option>
                <option>Home & Living</option>
                <option>Technology</option>
                <option>Workspace</option>
              </datalist>
            </div>
            <div>
              <label for="price">Price (BDT)</label
              ><input
                id="price"
                name="price"
                type="number"
                [(ngModel)]="draft.price"
                required
                min="0.01"
                max="9999999.99"
                step="0.01"
              />
            </div>
            <div>
              <label for="stock">Stock quantity</label
              ><input
                id="stock"
                name="stock"
                type="number"
                [(ngModel)]="draft.stock"
                required
                min="0"
                max="1000000"
                step="1"
              />
            </div>
            <div class="span-two">
              <label for="image">Image URL or local asset</label
              ><input
                id="image"
                name="image"
                [(ngModel)]="draft.image"
                required
                maxlength="500"
                aria-describedby="image-help"
              /><small id="image-help"
                >Use an HTTPS image URL or /assets/mug.svg, /assets/tote.svg,
                etc.</small
              >
            </div>
            <div class="span-two">
              <label for="description">Description</label
              ><textarea
                id="description"
                name="description"
                [(ngModel)]="draft.description"
                rows="3"
                required
                maxlength="2000"
              ></textarea>
            </div>
          </div>
          <label class="checkbox"
            ><input
              name="active"
              type="checkbox"
              [(ngModel)]="draft.active"
            />Visible in the storefront</label
          ><button class="button" [disabled]="form.invalid || busy()">
            {{ busy() ? "Saving…" : "Save product →" }}
          </button>
        </form>
      </section>
    }
    @if (tab() === "products") {
      <div class="table-wrap">
        <table>
          <caption class="sr-only">
            Product inventory
          </caption>
          <thead>
            <tr>
              <th>Product</th>
              <th>Category</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (p of products()?.items; track p.id) {
              <tr>
                <td>
                  <div class="table-product">
                    <img [src]="p.image" [alt]="p.name" /><strong>{{
                      p.name
                    }}</strong>
                  </div>
                </td>
                <td>{{ p.category }}</td>
                <td>৳{{ p.price | number: "1.0-2" }}</td>
                <td>
                  <span [class.error-text]="p.stock <= 5">{{ p.stock }}</span>
                </td>
                <td>
                  <span class="badge" [class.cancelled]="!p.active">{{
                    p.active ? "Active" : "Hidden"
                  }}</span>
                </td>
                <td>
                  <button class="text-button" (click)="edit(p)">Edit</button>
                  @if (p.active) {
                    <button
                      class="text-button danger"
                      (click)="hide(p)"
                      [disabled]="busy()"
                    >
                      Hide
                    </button>
                  }
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="6">No products yet. Add your first essential.</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      <div class="pagination">
        <button
          (click)="loadProducts(productPage - 1)"
          [disabled]="productPage === 0 || loading()"
        >
          ← Previous</button
        ><span
          >Page {{ productPage + 1 }} of {{ products()?.totalPages || 1 }}</span
        ><button
          (click)="loadProducts(productPage + 1)"
          [disabled]="
            productPage + 1 >= (products()?.totalPages || 0) || loading()
          "
        >
          Next →
        </button>
      </div>
    } @else {
      <div class="table-wrap">
        <table>
          <caption class="sr-only">
            Orders and fulfillment
          </caption>
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer & delivery</th>
              <th>Total</th>
              <th>Payment</th>
              <th>Status</th>
              <th>Next step</th>
            </tr>
          </thead>
          <tbody>
            @for (o of orders()?.items; track o.id) {
              <tr>
                <td>
                  <strong>#{{ o.id }}</strong
                  ><small>{{ o.createdAt | date: "mediumDate" }}</small>
                  <details>
                    <summary>Items ({{ o.items.length }})</summary>
                    @for (i of o.items; track i.productId) {
                      <p>{{ i.name }} × {{ i.quantity }}</p>
                    }
                  </details>
                </td>
                <td>
                  <strong>{{ o.recipient }}</strong
                  ><small>{{ o.phone }}</small
                  ><small>{{ o.address }}, {{ o.city }}</small>
                </td>
                <td>৳{{ o.total | number: "1.0-2" }}</td>
                <td>{{ o.paymentStatus }}</td>
                <td>
                  <span
                    class="badge"
                    [class.cancelled]="o.status === 'CANCELLED'"
                    >{{ o.status }}</span
                  >
                </td>
                <td>
                  @if (o.status === "CONFIRMED") {
                    <button
                      class="button small-button"
                      [disabled]="busy()"
                      (click)="status(o, 'SHIPPED')"
                    >
                      Mark shipped</button
                    ><button
                      class="text-button danger"
                      [disabled]="busy()"
                      (click)="cancelTarget.set(o)"
                    >
                      Cancel
                    </button>
                  }
                  @if (o.status === "SHIPPED") {
                    <button
                      class="button small-button"
                      [disabled]="busy()"
                      (click)="status(o, 'DELIVERED')"
                    >
                      Delivered & paid
                    </button>
                  }
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="6">Your first order is still to come.</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      <div class="pagination">
        <button
          (click)="loadOrders(orderPage - 1)"
          [disabled]="orderPage === 0 || loading()"
        >
          ← Previous</button
        ><span>Page {{ orderPage + 1 }} of {{ orders()?.totalPages || 1 }}</span
        ><button
          (click)="loadOrders(orderPage + 1)"
          [disabled]="orderPage + 1 >= (orders()?.totalPages || 0) || loading()"
        >
          Next →
        </button>
      </div>
    }
    @if (cancelTarget(); as o) {
      <div class="confirmation" role="alert">
        <span>Cancel order #{{ o.id }} and restore its stock?</span
        ><button
          class="button small-button"
          (click)="status(o, 'CANCELLED')"
          [disabled]="busy()"
        >
          Confirm cancellation</button
        ><button class="text-button" (click)="cancelTarget.set(null)">
          Keep order
        </button>
      </div>
    }
  </section>`,
})
export class AdminPage implements OnInit {
  api = inject(Api);
  tab = signal<"products" | "orders">("products");
  products = signal<Page<Product> | null>(null);
  orders = signal<Page<Order> | null>(null);
  metrics = signal<{
    revenue: number;
    orders: number;
    awaitingShipment: number;
    activeProducts: number;
    lowStock: number;
  } | null>(null);
  loading = signal(true);
  busy = signal(false);
  error = signal("");
  notice = signal("");
  editor = signal(false);
  cancelTarget = signal<Order | null>(null);
  productPage = 0;
  orderPage = 0;
  draft: Omit<Product, "id"> & { id?: number } = this.blank();
  blank() {
    return {
      name: "",
      description: "",
      price: 0,
      stock: 0,
      category: "Everyday",
      image: "/assets/mug.svg",
      active: true,
      version: 0,
    };
  }
  ngOnInit() {
    this.load();
  }
  async load() {
    this.loading.set(true);
    try {
      const [p, o, m] = await Promise.all([
        this.api.adminProducts(this.productPage),
        this.api.orders(this.orderPage, true),
        this.api.dashboard(),
      ]);
      this.products.set(p);
      this.orders.set(o);
      this.metrics.set(m);
    } catch (e) {
      this.error.set(message(e));
    } finally {
      this.loading.set(false);
    }
  }
  async loadProducts(page: number) {
    this.productPage = page;
    await this.load();
  }
  async loadOrders(page: number) {
    this.orderPage = page;
    await this.load();
  }
  newProduct() {
    this.draft = this.blank();
    this.editor.set(true);
    this.error.set("");
  }
  edit(p: Product) {
    this.draft = { ...p };
    this.editor.set(true);
    this.error.set("");
    window.scrollTo({ top: 240, behavior: "smooth" });
  }
  async save() {
    this.busy.set(true);
    this.error.set("");
    try {
      await this.api.saveProduct(this.draft);
      this.editor.set(false);
      this.notice.set("Product saved. Your storefront is up to date.");
      await this.load();
    } catch (e) {
      this.error.set(fields(e) || message(e));
      if ((e as { status?: number }).status === 409) await this.load();
    } finally {
      this.busy.set(false);
    }
  }
  async hide(p: Product) {
    this.busy.set(true);
    this.error.set("");
    try {
      await this.api.deactivate(p.id);
      this.notice.set(
        p.name +
          " is hidden from the storefront. You can reactivate it in the editor.",
      );
      await this.load();
    } catch (e) {
      this.error.set(message(e));
    } finally {
      this.busy.set(false);
    }
  }
  async status(o: Order, status: string) {
    this.busy.set(true);
    this.error.set("");
    try {
      await this.api.status(o.id, status);
      this.cancelTarget.set(null);
      this.notice.set(
        "Order #" + o.id + " updated to " + status.toLowerCase() + ".",
      );
      await this.load();
    } catch (e) {
      this.error.set(message(e));
    } finally {
      this.busy.set(false);
    }
  }
}
