import { Component, inject, signal, OnInit } from "@angular/core";
import { DecimalPipe } from "@angular/common";
import { RouterLink } from "@angular/router";
import { Api } from "./api";
import { message } from "./models";
@Component({
  imports: [DecimalPipe, RouterLink],
  template: ` <section class="container page">
    <p class="eyebrow">YOUR EVERYDAY EDIT</p>
    <h1>
      Shopping bag<span class="muted"> ({{ api.count() }})</span>
    </h1>
    @if (error()) {
      <div class="alert error" role="alert">
        {{ error() }} <button (click)="load()">Refresh bag</button>
      </div>
    }
    @if (loading()) {
      <p class="loading" role="status">Opening your bag…</p>
    } @else if (api.cart()?.items?.length) {
      <div class="cart-layout">
        <div class="cart-items">
          @for (item of api.cart()!.items; track item.id) {
            <article class="cart-row">
              <a [routerLink]="['/products', item.product.id]"
                ><img [src]="item.product.image" [alt]="item.product.name"
              /></a>
              <div class="cart-info">
                <small>{{ item.product.category }}</small
                ><a [routerLink]="['/products', item.product.id]"
                  ><h3>{{ item.product.name }}</h3></a
                >
                <p>৳{{ item.product.price | number: "1.0-2" }}</p>
                @if (
                  !item.product.active || item.product.stock < item.quantity
                ) {
                  <p class="error-text">
                    Unavailable quantity. Update or remove this item.
                  </p>
                }
                <button
                  class="text-button"
                  (click)="remove(item.id)"
                  [disabled]="busy()"
                >
                  Remove
                </button>
              </div>
              <div class="cart-right">
                <strong>৳{{ item.lineTotal | number: "1.0-2" }}</strong>
                <div class="stepper">
                  <button
                    (click)="quantity(item.id, item.quantity - 1)"
                    [disabled]="busy() || item.quantity <= 1"
                    [attr.aria-label]="
                      'Decrease quantity of ' + item.product.name
                    "
                  >
                    −</button
                  ><span>{{ item.quantity }}</span
                  ><button
                    (click)="quantity(item.id, item.quantity + 1)"
                    [disabled]="
                      busy() ||
                      item.quantity >= item.product.stock ||
                      item.quantity >= 99
                    "
                    [attr.aria-label]="
                      'Increase quantity of ' + item.product.name
                    "
                  >
                    +
                  </button>
                </div>
              </div>
            </article>
          }
          <a routerLink="/" class="underlined">← Keep exploring</a>
        </div>
        <aside class="summary">
          <h3>A little overview</h3>
          <div>
            <span>Subtotal</span
            ><span>৳{{ api.cart()!.subtotal | number: "1.0-2" }}</span>
          </div>
          <div>
            <span>Delivery</span
            ><span>{{
              api.cart()!.shipping === 0 ? "On us" : "৳" + api.cart()!.shipping
            }}</span>
          </div>
          <div class="summary-total">
            <span>Total</span
            ><strong>৳{{ api.cart()!.total | number: "1.0-2" }}</strong>
          </div>
          <p class="small">
            Prices in BDT. No additional tax is added in this portfolio store.
          </p>
          <a routerLink="/checkout" class="button full"
            >Continue to checkout →</a
          >
          <p class="small centered">Cash on delivery · No card needed</p>
        </aside>
      </div>
    } @else {
      <div class="empty">
        <span class="empty-icon">◇</span>
        <h2>A little room for something good.</h2>
        <p>
          Your bag is empty. Explore the collection and find your next favorite.
        </p>
        <a routerLink="/" class="button">Explore the collection ↗</a>
      </div>
    }
  </section>`,
})
export class CartPage implements OnInit {
  api = inject(Api);
  loading = signal(true);
  busy = signal(false);
  error = signal("");
  ngOnInit() {
    this.load();
  }
  async load() {
    this.loading.set(true);
    this.error.set("");
    try {
      await this.api.loadCart();
    } catch (e) {
      this.error.set(message(e));
    } finally {
      this.loading.set(false);
    }
  }
  async quantity(id: number, quantity: number) {
    this.busy.set(true);
    this.error.set("");
    try {
      await this.api.quantity(id, quantity);
    } catch (e) {
      this.error.set(message(e));
    } finally {
      this.busy.set(false);
    }
  }
  async remove(id: number) {
    this.busy.set(true);
    this.error.set("");
    try {
      await this.api.remove(id);
    } catch (e) {
      this.error.set(message(e));
    } finally {
      this.busy.set(false);
    }
  }
}
