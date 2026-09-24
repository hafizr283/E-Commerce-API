import { Component, inject, signal, OnInit } from "@angular/core";
import { DecimalPipe } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { Api, Session } from "./api";
import { Address, message, fields } from "./models";

interface PendingCheckout {
  fingerprint: string;
  key: string;
  userId: number;
  address: Address;
}
@Component({
  imports: [DecimalPipe, FormsModule, RouterLink],
  template: ` <section class="container page">
    <a routerLink="/cart" class="underlined">← Back to your bag</a>
    <p class="eyebrow top-space">ONE STEP CLOSER</p>
    <h1>Make it yours.</h1>
    @if (error()) {
      <div class="alert error" role="alert">{{ error() }}</div>
    }
    @if (loading()) {
      <p class="loading" role="status">Preparing checkout…</p>
    } @else if (api.cart()?.items?.length) {
      <form #form="ngForm" (ngSubmit)="submit()" class="cart-layout">
        <div class="checkout-form">
          <h3><span class="step-number">1</span> Where should we deliver?</h3>
          <div class="form-grid">
            <div>
              <label for="recipient">Full name</label
              ><input
                id="recipient"
                name="recipient"
                [(ngModel)]="address.recipient"
                required
                maxlength="120"
                autocomplete="shipping name"
              />
            </div>
            <div>
              <label for="phone">Phone number</label
              ><input
                id="phone"
                name="phone"
                [(ngModel)]="address.phone"
                required
                type="tel"
                pattern="[+0-9 ()-]{7,30}"
                autocomplete="shipping tel"
              />
            </div>
            <div class="span-two">
              <label for="address">Street address</label
              ><textarea
                id="address"
                name="address"
                [(ngModel)]="address.address"
                required
                maxlength="500"
                autocomplete="shipping street-address"
                rows="3"
              ></textarea>
            </div>
            <div>
              <label for="city">City</label
              ><input
                id="city"
                name="city"
                [(ngModel)]="address.city"
                required
                maxlength="100"
                autocomplete="shipping address-level2"
              />
            </div>
          </div>
          <h3 class="top-space">
            <span class="step-number">2</span> How would you like to pay?
          </h3>
          <div class="payment-choice">
            <span class="radio-selected"></span>
            <div>
              <strong>Cash on delivery</strong>
              <p>Pay the courier when your order arrives.</p>
            </div>
            <span>৳</span>
          </div>
          <p class="small">
            Please review your delivery details and the total before placing
            your order.
          </p>
        </div>
        <aside class="summary">
          <h3>Your everyday edit</h3>
          @for (item of api.cart()!.items; track item.id) {
            <div class="checkout-item">
              <img [src]="item.product.image" [alt]="item.product.name" /><span
                >{{ item.product.name
                }}<small>Qty {{ item.quantity }}</small></span
              ><strong>৳{{ item.lineTotal | number: "1.0-2" }}</strong>
            </div>
          }
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
          <button class="button full" [disabled]="form.invalid || busy()">
            {{ busy() ? "Placing your order…" : "Place order →" }}
          </button>
          <p class="small centered">
            Pay ৳{{ api.cart()!.total | number: "1.0-2" }} on delivery
          </p>
        </aside>
      </form>
    } @else {
      <div class="empty">
        <h2>Your bag is empty.</h2>
        <a routerLink="/" class="button">Find something good</a>
      </div>
    }
  </section>`,
})
export class CheckoutPage implements OnInit {
  api = inject(Api);
  session = inject(Session);
  router = inject(Router);
  loading = signal(true);
  busy = signal(false);
  error = signal("");
  address: Address = {
    recipient: this.session.user()?.name || "",
    phone: "",
    address: "",
    city: "",
  };
  async ngOnInit() {
    try {
      const pending = this.pending();
      if (pending) {
        this.address = { ...pending.address };
        try {
          const order = await this.api.findCheckout(pending.key);
          sessionStorage.removeItem("atelier-checkout");
          await this.api.loadCart().catch(() => null);
          await this.router.navigate(["/orders"], {
            queryParams: { placed: order.id },
          });
          return;
        } catch (e) {
          if ((e as { status?: number }).status !== 404) throw e;
        }
      }
      await this.api.loadCart();
    } catch (e) {
      this.error.set(message(e));
    } finally {
      this.loading.set(false);
    }
  }
  async submit() {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set("");
    const fingerprint = JSON.stringify({
      user: this.session.user()?.id,
      address: this.address,
      items: this.api.cart()?.items.map((i) => [i.product.id, i.quantity]),
      total: this.api.cart()?.total,
    });
    let pending = this.pending();
    if (pending?.fingerprint !== fingerprint)
      pending = {
        fingerprint,
        key: crypto.randomUUID(),
        userId: this.session.user()!.id,
        address: { ...this.address },
      };
    sessionStorage.setItem("atelier-checkout", JSON.stringify(pending));
    try {
      const order = await this.api.checkout(this.address, pending!.key);
      sessionStorage.removeItem("atelier-checkout");
      this.router.navigate(["/orders"], { queryParams: { placed: order.id } });
    } catch (e) {
      this.error.set(fields(e) || message(e));
      // A definitive rejection can be retried after reviewing the current cart.
      // Network failures retain the key so a committed order can be recovered.
      if ((e as { status?: number }).status === 409) {
        try {
          await this.api.loadCart();
        } catch {}
      }
    } finally {
      this.busy.set(false);
    }
  }

  private pending(): PendingCheckout | null {
    try {
      const pending = JSON.parse(
        sessionStorage.getItem("atelier-checkout") || "null",
      );
      return pending?.userId === this.session.user()?.id &&
        typeof pending?.key === "string" &&
        pending.address
        ? pending
        : null;
    } catch {
      return null;
    }
  }
}
