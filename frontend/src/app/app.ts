import { Component, inject, effect, signal } from "@angular/core";
import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from "@angular/router";
import { Api, Session } from "./api";
@Component({
  selector: "app-root",
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <a class="skip" href="#main">Skip to content</a>
    <div class="announcement">
      A little considered. A lot of everyday.
      <span>Free delivery on orders ৳5,000+</span>
    </div>
    <header class="site-header">
      <div class="nav container">
        <a routerLink="/" class="brand" aria-label="Atelier home"
          ><span class="brand-mark">a</span>atelier<span class="brand-dot"
            >.</span
          ></a
        >
        <nav aria-label="Main navigation">
          <a
            routerLink="/"
            [routerLinkActiveOptions]="{ exact: true }"
            routerLinkActive="current"
            >Shop</a
          ><a routerLink="/orders" routerLinkActive="current">My orders</a>
          @if (session.user()?.role === "ADMIN") {
            <a routerLink="/admin" routerLinkActive="current">Manage store</a>
          }
        </nav>
        <div class="nav-actions">
          @if (session.user()) {
            <span class="hello"
              >Hi, {{ session.user()!.name.split(" ")[0] }}</span
            ><button
              class="text-button"
              (click)="logout()"
              [disabled]="leaving()"
            >
              Sign out
            </button>
          } @else {
            <a routerLink="/login" class="signin">Sign in</a>
          }
          <a routerLink="/cart" class="bag" aria-label="Shopping bag"
            ><svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 7h14l1 14H4L5 7Z M9 8V6a3 3 0 0 1 6 0v2" /></svg
            ><span>Bag</span><b>{{ api.count() }}</b></a
          >
        </div>
      </div>
    </header>
    <main id="main"><router-outlet /></main>
    <footer>
      <div class="container footer-grid">
        <div>
          <a routerLink="/" class="brand">atelier.</a>
          <p>Thoughtful things.<br />A little more everyday joy.</p>
        </div>
        <div>
          <strong>Explore</strong><a routerLink="/">The collection</a
          ><a routerLink="/orders">Your orders</a
          ><a routerLink="/cart">Shopping bag</a>
        </div>
        <div>
          <strong>Made for the everyday</strong>
          <p>
            Curated essentials for your home,<br />your workspace, and
            everything between.
          </p>
          <span class="footer-label">DHAKA, BANGLADESH · PRICES IN BDT</span>
        </div>
      </div>
      <div class="container footer-bottom">
        <span>© {{ year }} Atelier. A portfolio commerce project.</span
        ><span>Considered goods. Simple shopping.</span>
      </div>
    </footer>
  `,
})
export class App {
  session = inject(Session);
  api = inject(Api);
  router = inject(Router);
  year = new Date().getFullYear();
  leaving = signal(false);
  constructor() {
    effect(() => {
      if (this.session.user()) this.api.loadCart().catch(() => {});
      else this.api.cart.set(null);
    });
  }
  async logout() {
    this.leaving.set(true);
    try {
      await this.session.logout();
    } catch {
    } finally {
      this.leaving.set(false);
      this.router.navigate(["/"]);
    }
  }
}
