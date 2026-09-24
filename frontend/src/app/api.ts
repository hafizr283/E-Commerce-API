import { Injectable, inject, signal, computed } from "@angular/core";
import {
  HttpBackend,
  HttpClient,
  HttpErrorResponse,
  HttpInterceptorFn,
} from "@angular/common/http";
import { firstValueFrom, from, throwError } from "rxjs";
import { catchError, switchMap } from "rxjs/operators";
import {
  AuthResponse,
  User,
  Cart,
  Product,
  Order,
  Page,
  Address,
} from "./models";
@Injectable({ providedIn: "root" })
export class Session {
  private raw = new HttpClient(inject(HttpBackend));
  auth = signal<AuthResponse | null>(this.restore());
  user = computed(() => this.auth()?.user ?? null);
  private refreshing: Promise<string> | null = null;
  private restore(): AuthResponse | null {
    try {
      return JSON.parse(sessionStorage.getItem("atelier-session") || "null");
    } catch {
      return null;
    }
  }
  save(auth: AuthResponse) {
    sessionStorage.setItem("atelier-session", JSON.stringify(auth));
    this.auth.set(auth);
  }
  clear() {
    sessionStorage.removeItem("atelier-session");
    sessionStorage.removeItem("atelier-checkout");
    this.auth.set(null);
  }
  async login(email: string, password: string) {
    this.save(
      await firstValueFrom(
        this.raw.post<AuthResponse>("/api/auth/login", { email, password }),
      ),
    );
  }
  async register(name: string, email: string, password: string) {
    this.save(
      await firstValueFrom(
        this.raw.post<AuthResponse>("/api/auth/register", {
          name,
          email,
          password,
        }),
      ),
    );
  }
  refresh(): Promise<string> {
    if (!this.refreshing) {
      this.refreshing = firstValueFrom(
        this.raw.post<AuthResponse>("/api/auth/refresh", {
          refreshToken: this.auth()?.refreshToken,
        }),
      )
        .then((auth) => {
          this.save(auth);
          return auth.token;
        })
        .catch((error) => {
          this.clear();
          throw error;
        })
        .finally(() => (this.refreshing = null));
    }
    return this.refreshing;
  }
  async logout() {
    try {
      if (this.auth()) {
        const token = await this.refresh();
        await firstValueFrom(
          this.raw.post(
            "/api/auth/logout",
            {},
            { headers: { Authorization: `Bearer ${token}` } },
          ),
        );
      }
    } finally {
      this.clear();
    }
  }
}
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const session = inject(Session);
  if (!req.url.startsWith("/api/") || !session.auth()) return next(req);
  const authorized = req.clone({
    setHeaders: { Authorization: `Bearer ${session.auth()!.token}` },
  });
  return next(authorized).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401) return throwError(() => error);
      return from(session.refresh()).pipe(
        switchMap((token) =>
          next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })),
        ),
      );
    }),
  );
};
@Injectable({ providedIn: "root" })
export class Api {
  private http = inject(HttpClient);
  cart = signal<Cart | null>(null);
  count = computed(
    () =>
      this.cart()?.items.reduce((total, item) => total + item.quantity, 0) ?? 0,
  );
  products(params: Record<string, string | number> = {}) {
    return firstValueFrom(
      this.http.get<Page<Product>>("/api/products", { params }),
    );
  }
  product(id: string) {
    return firstValueFrom(this.http.get<Product>("/api/products/" + id));
  }
  categories() {
    return firstValueFrom(this.http.get<string[]>("/api/categories"));
  }
  async loadCart() {
    const cart = await firstValueFrom(this.http.get<Cart>("/api/cart"));
    this.cart.set(cart);
    return cart;
  }
  async add(productId: number, quantity = 1) {
    const cart = await firstValueFrom(
      this.http.post<Cart>("/api/cart/items", { productId, quantity }),
    );
    this.cart.set(cart);
  }
  async quantity(id: number, quantity: number) {
    this.cart.set(
      await firstValueFrom(
        this.http.patch<Cart>("/api/cart/items/" + id, { quantity }),
      ),
    );
  }
  async remove(id: number) {
    this.cart.set(
      await firstValueFrom(this.http.delete<Cart>("/api/cart/items/" + id)),
    );
  }
  async checkout(address: Address, key: string) {
    const order = await firstValueFrom(
      this.http.post<Order>(
        "/api/orders",
        { ...address, expectedTotal: this.cart()?.total },
        { headers: { "Idempotency-Key": key } },
      ),
    );
    this.cart.set(null);
    return order;
  }
  orders(page = 0, admin = false) {
    return firstValueFrom(
      this.http.get<Page<Order>>(admin ? "/api/admin/orders" : "/api/orders", {
        params: { page },
      }),
    );
  }
  findCheckout(key: string) {
    return firstValueFrom(
      this.http.get<Order>("/api/orders/checkout/" + encodeURIComponent(key)),
    );
  }
  cancel(id: number) {
    return firstValueFrom(
      this.http.post<Order>(`/api/orders/${id}/cancel`, {}),
    );
  }
  status(id: number, status: string) {
    return firstValueFrom(
      this.http.patch<Order>(`/api/admin/orders/${id}/status`, { status }),
    );
  }
  dashboard() {
    return firstValueFrom(
      this.http.get<{
        revenue: number;
        orders: number;
        awaitingShipment: number;
        activeProducts: number;
        lowStock: number;
      }>("/api/admin/dashboard"),
    );
  }
  adminProducts(page = 0) {
    return firstValueFrom(
      this.http.get<Page<Product>>("/api/admin/products", { params: { page } }),
    );
  }
  saveProduct(product: Omit<Product, "id"> & { id?: number }) {
    return firstValueFrom(
      product.id
        ? this.http.put<Product>(`/api/admin/products/${product.id}`, product)
        : this.http.post<Product>("/api/admin/products", product),
    );
  }
  deactivate(id: number) {
    return firstValueFrom(this.http.delete(`/api/admin/products/${id}`));
  }
}
