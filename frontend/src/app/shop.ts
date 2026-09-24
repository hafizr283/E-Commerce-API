import { Component, inject, signal, OnInit } from "@angular/core";
import { DecimalPipe } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router, RouterLink, ActivatedRoute } from "@angular/router";
import { Api, Session } from "./api";
import { Page, Product, message } from "./models";
@Component({
  imports: [DecimalPipe, FormsModule, RouterLink],
  template: `
    <section class="hero container">
      <div class="hero-copy">
        <p class="eyebrow"><span></span> THE EVERYDAY COLLECTION</p>
        <h1>Good things.<br /><em>Great everyday.</em></h1>
        <p class="hero-description">
          A thoughtful edit of useful, beautiful things.<br />For the spaces you
          love and the life you live.
        </p>
        <a href="#collection" class="button"
          >Explore the collection <span aria-hidden="true">↗</span></a
        >
        <div class="hero-note">
          <span class="mini-line"></span> Less, but a little better.
        </div>
      </div>
      <div class="hero-art">
        <img
          src="/assets/hero.svg"
          alt="A warm still life of a desk lamp, stoneware mug, and linen notebook"
        />
        <div class="hero-stamp">
          CURATED WITH CARE <span>FOR EVERY DAY</span>
        </div>
        <div class="hero-caption">
          <span>The art of the ordinary.</span><span>01 / 08</span>
        </div>
      </div>
    </section>
    <div class="benefits container">
      <span><b>◇</b> Considered essentials</span
      ><span><b>↗</b> Free delivery over ৳5,000</span
      ><span><b>✓</b> Pay when it arrives</span
      ><span><b>◎</b> A little something for you</span>
    </div>
    <section id="collection" class="collection container">
      <div class="section-heading">
        <div>
          <p class="eyebrow">FIND YOUR EVERYDAY</p>
          <h2>The collection<span>.</span></h2>
        </div>
        <p>Small details. Lasting favorites.</p>
      </div>
      <div class="collection-tools">
        <div class="category-tabs" aria-label="Product categories">
          <button [class.active]="category === ''" (click)="selectCategory('')">
            All essentials
          </button>
          @for (c of categories(); track c) {
            <button [class.active]="category === c" (click)="selectCategory(c)">
              {{ c }}
            </button>
          }
        </div>
        <div class="search-sort">
          <form (ngSubmit)="load(0)">
            <label class="sr-only" for="search">Search products</label
            ><input
              id="search"
              name="search"
              [(ngModel)]="q"
              placeholder="Find something good…"
            /><button type="submit" aria-label="Search">⌕</button>
          </form>
          <label class="sr-only" for="sort">Sort products</label
          ><select id="sort" [(ngModel)]="sort" (change)="load(0)">
            <option value="newest">Latest arrivals</option>
            <option value="priceAsc">Price: low to high</option>
            <option value="priceDesc">Price: high to low</option>
            <option value="name">Name: A–Z</option>
          </select>
        </div>
      </div>
      @if (error()) {
        <div class="alert error" role="alert">
          {{ error() }} <button (click)="load()">Try again</button>
        </div>
      }
      @if (notice()) {
        <div class="alert success" role="status">
          {{ notice() }} <a routerLink="/cart">View bag →</a>
        </div>
      }
      @if (loading()) {
        <div
          class="product-grid"
          aria-label="Loading products"
          aria-busy="true"
        >
          @for (i of [1, 2, 3, 4]; track i) {
            <div class="skeleton"></div>
          }
        </div>
      } @else {
        <p class="result-count">
          {{ result()?.totalElements || 0 }} thoughtfully selected essentials
        </p>
        <div class="product-grid">
          @for (p of result()?.items; track p.id) {
            <article class="product-card">
              <a [routerLink]="['/products', p.id]" class="product-image"
                ><img [src]="p.image" [alt]="p.name" loading="lazy" />
                @if (p.stock === 0) {
                  <span class="tag">Out of stock</span>
                } @else if (p.stock <= 5) {
                  <span class="tag">Only {{ p.stock }} left</span>
                }
                <span class="view-product">Take a closer look ↗</span></a
              >
              <div class="product-meta">
                <span>{{ p.category }}</span
                ><span>AT / {{ p.id.toString().padStart(3, "0") }}</span>
              </div>
              <div class="product-title">
                <a [routerLink]="['/products', p.id]">{{ p.name }}</a
                ><button
                  class="add-button"
                  (click)="add(p)"
                  [disabled]="p.stock === 0 || adding() === p.id"
                  [attr.aria-label]="'Add ' + p.name + ' to bag'"
                >
                  {{ adding() === p.id ? "…" : "+" }}
                </button>
              </div>
              <p class="price">৳{{ p.price | number: "1.0-2" }}</p>
            </article>
          } @empty {
            <div class="empty">
              <h3>No matches just yet.</h3>
              <p>Try another search or explore all essentials.</p>
              <button class="button" (click)="reset()">
                Show all products
              </button>
            </div>
          }
        </div>
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
    </section>
    <section class="story container">
      <div>
        <p class="eyebrow">A NOTE FROM ATELIER</p>
        <h2>Less noise.<br /><em>More meaning.</em></h2>
      </div>
      <div>
        <p>
          We believe the things around you should earn their place. Useful by
          nature. Beautiful by design. Chosen to bring a little more ease to the
          everyday.
        </p>
        <a href="#collection" class="underlined">Find your next favorite ↗</a>
      </div>
      <span class="story-symbol" aria-hidden="true">✳</span>
    </section>
  `,
})
export class Shop implements OnInit {
  api = inject(Api);
  session = inject(Session);
  router = inject(Router);
  route = inject(ActivatedRoute);
  categories = signal<string[]>([]);
  result = signal<Page<Product> | null>(null);
  loading = signal(true);
  error = signal("");
  notice = signal("");
  adding = signal<number | null>(null);
  q = "";
  category = "";
  sort = "newest";
  page = 0;
  private sequence = 0;
  ngOnInit() {
    const params = this.route.snapshot.queryParamMap;
    this.q = params.get("q") || "";
    this.category = params.get("category") || "";
    this.api
      .categories()
      .then((c) => this.categories.set(c))
      .catch(() => {});
    this.load();
  }
  async load(page = 0) {
    const seq = ++this.sequence;
    this.loading.set(true);
    this.error.set("");
    this.page = page;
    try {
      const result = await this.api.products({
        q: this.q,
        category: this.category,
        sort: this.sort,
        page,
      });
      if (seq === this.sequence) this.result.set(result);
    } catch (e) {
      if (seq === this.sequence) this.error.set(message(e));
    } finally {
      if (seq === this.sequence) this.loading.set(false);
    }
  }
  selectCategory(category: string) {
    this.category = category;
    this.load(0);
  }
  reset() {
    this.q = "";
    this.category = "";
    this.load(0);
  }
  async add(p: Product) {
    if (!this.session.user()) {
      this.router.navigate(["/login"], {
        queryParams: { returnTo: "/products/" + p.id },
      });
      return;
    }
    this.adding.set(p.id);
    this.error.set("");
    try {
      await this.api.add(p.id);
      this.notice.set(p.name + " added to your bag.");
    } catch (e) {
      this.error.set(message(e));
    } finally {
      this.adding.set(null);
    }
  }
}
