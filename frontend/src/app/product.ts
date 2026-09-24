import { Component, inject, signal, OnInit } from "@angular/core";
import { DecimalPipe } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { Api, Session } from "./api";
import { Product, message } from "./models";
@Component({
  imports: [DecimalPipe, FormsModule, RouterLink],
  template: ` <section class="container page">
    <a routerLink="/" class="underlined">← The collection</a>
    @if (error()) {
      <div class="alert error" role="alert">{{ error() }}</div>
    }
    @if (loading()) {
      <div class="skeleton detail-skeleton" aria-label="Loading product"></div>
    }
    @if (product(); as p) {
      <div class="product-detail">
        <div class="detail-image"><img [src]="p.image" [alt]="p.name" /></div>
        <div class="detail-copy">
          <p class="eyebrow">{{ p.category }}</p>
          <h1>{{ p.name }}</h1>
          <p class="detail-price">৳{{ p.price | number: "1.0-2" }}</p>
          <p class="detail-description">{{ p.description }}</p>
          <p class="stock">
            <span [class.unavailable]="p.stock === 0"></span
            >{{
              p.stock > 0
                ? p.stock + " available · Ready for your everyday"
                : "Currently out of stock"
            }}
          </p>
          <label for="quantity">Quantity</label>
          <div class="purchase-controls">
            <input
              id="quantity"
              type="number"
              [(ngModel)]="quantity"
              min="1"
              [max]="Math.min(99, p.stock)"
            /><button
              class="button"
              (click)="add()"
              [disabled]="
                busy() ||
                p.stock === 0 ||
                quantity < 1 ||
                quantity > Math.min(99, p.stock) ||
                !Number.isInteger(quantity)
              "
            >
              {{ busy() ? "Adding…" : "Add to bag" }} <span>＋</span>
            </button>
          </div>
          @if (added()) {
            <div class="alert success" role="status">
              Added to your bag. <a routerLink="/cart">View bag →</a>
            </div>
          }
          <div class="detail-promises">
            <p>↗ Free delivery on orders ৳5,000+</p>
            <p>✓ Cash on delivery. Pay when it arrives.</p>
            <p>◇ Carefully selected for everyday use.</p>
          </div>
        </div>
      </div>
    }
  </section>`,
})
export class ProductPage implements OnInit {
  api = inject(Api);
  session = inject(Session);
  route = inject(ActivatedRoute);
  router = inject(Router);
  product = signal<Product | null>(null);
  error = signal("");
  loading = signal(true);
  busy = signal(false);
  added = signal(false);
  quantity = 1;
  Math = Math;
  Number = Number;
  async ngOnInit() {
    try {
      this.product.set(
        await this.api.product(this.route.snapshot.paramMap.get("id")!),
      );
    } catch (e) {
      this.error.set(message(e));
    } finally {
      this.loading.set(false);
    }
  }
  async add() {
    if (!this.session.user()) {
      this.router.navigate(["/login"], {
        queryParams: { returnTo: this.router.url },
      });
      return;
    }
    this.busy.set(true);
    this.error.set("");
    try {
      await this.api.add(this.product()!.id, this.quantity);
      this.added.set(true);
    } catch (e) {
      this.error.set(message(e));
    } finally {
      this.busy.set(false);
    }
  }
}
