import { Component, inject, signal, OnInit } from "@angular/core";
import { DatePipe, DecimalPipe } from "@angular/common";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { Api } from "./api";
import { Order, Page, message } from "./models";
@Component({
  imports: [DatePipe, DecimalPipe, RouterLink],
  template: ` <section class="container page">
    <p class="eyebrow">YOUR ATELIER JOURNEY</p>
    <h1>My orders.</h1>
    @if (placed) {
      <div class="order-success" role="status">
        <span>✓</span>
        <div>
          <h2>Good things are on their way.</h2>
          <p>Order #{{ placed }} is confirmed. You’ll pay when it arrives.</p>
        </div>
      </div>
    }
    @if (error()) {
      <div class="alert error" role="alert">
        {{ error() }} <button (click)="load()">Try again</button>
      </div>
    }
    @if (loading()) {
      <p class="loading" role="status">Finding your orders…</p>
    } @else {
      @for (order of result()?.items; track order.id) {
        <article class="order-card">
          <div class="order-header">
            <div>
              <strong>Order #{{ order.id.toString().padStart(5, "0") }}</strong
              ><small>{{ order.createdAt | date: "medium" }}</small>
            </div>
            <span
              class="badge"
              [class.cancelled]="order.status === 'CANCELLED'"
              >{{ order.status }}</span
            ><strong>৳{{ order.total | number: "1.0-2" }}</strong>
          </div>
          <div class="order-items">
            @for (item of order.items; track item.productId) {
              <div>
                <img [src]="item.image" [alt]="item.name" /><span
                  ><strong>{{ item.name }}</strong
                  ><small
                    >Qty {{ item.quantity }} · ৳{{
                      item.price | number: "1.0-2"
                    }}
                    each</small
                  ></span
                >
              </div>
            }
          </div>
          <div class="order-footer">
            <p>
              <strong>{{ order.recipient }}</strong> · {{ order.address }},
              {{ order.city }}<br /><span
                >Cash on delivery · {{ order.paymentStatus }}</span
              >
            </p>
            @if (order.status === "CONFIRMED") {
              <button
                class="text-button danger"
                (click)="confirming.set(order.id)"
                [disabled]="busy()"
              >
                Cancel order
              </button>
            }
          </div>
          @if (confirming() === order.id) {
            <div class="confirmation" role="alert">
              <span
                >Cancel order #{{ order.id }}? Its items will be returned to
                stock.</span
              ><button
                class="button small-button"
                (click)="cancel(order.id)"
                [disabled]="busy()"
              >
                Yes, cancel order</button
              ><button class="text-button" (click)="confirming.set(null)">
                Keep order
              </button>
            </div>
          }
        </article>
      } @empty {
        <div class="empty">
          <h2>Your story starts here.</h2>
          <p>Once you place an order, you can follow it here.</p>
          <a routerLink="/" class="button">Explore the collection ↗</a>
        </div>
      }
      @if ((result()?.totalPages || 0) > 1) {
        <div class="pagination">
          <button (click)="load(page - 1)" [disabled]="page === 0">
            ← Previous</button
          ><span>Page {{ page + 1 }} of {{ result()?.totalPages }}</span
          ><button
            (click)="load(page + 1)"
            [disabled]="page + 1 >= (result()?.totalPages || 0)"
          >
            Next →
          </button>
        </div>
      }
    }
  </section>`,
})
export class OrdersPage implements OnInit {
  api = inject(Api);
  route = inject(ActivatedRoute);
  result = signal<Page<Order> | null>(null);
  loading = signal(true);
  error = signal("");
  busy = signal(false);
  confirming = signal<number | null>(null);
  page = 0;
  placed = this.route.snapshot.queryParamMap.get("placed");
  ngOnInit() {
    this.load();
  }
  async load(page = this.page) {
    this.page = page;
    this.loading.set(true);
    this.error.set("");
    try {
      this.result.set(await this.api.orders(page));
    } catch (e) {
      this.error.set(message(e));
    } finally {
      this.loading.set(false);
    }
  }
  async cancel(id: number) {
    this.busy.set(true);
    this.error.set("");
    try {
      await this.api.cancel(id);
      this.confirming.set(null);
      await this.load();
    } catch (e) {
      this.error.set(message(e));
    } finally {
      this.busy.set(false);
    }
  }
}
