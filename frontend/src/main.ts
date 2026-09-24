import { bootstrapApplication } from "@angular/platform-browser";
import { provideHttpClient, withInterceptors } from "@angular/common/http";
import {
  provideRouter,
  Routes,
  CanActivateFn,
  Router,
  withInMemoryScrolling,
} from "@angular/router";
import { inject } from "@angular/core";
import { App } from "./app/app";
import { Session, authInterceptor } from "./app/api";
const authenticated: CanActivateFn = (_, state) =>
  inject(Session).user()
    ? true
    : inject(Router).createUrlTree(["/login"], {
        queryParams: { returnTo: state.url },
      });
const admin: CanActivateFn = () =>
  inject(Session).user()?.role === "ADMIN"
    ? true
    : inject(Router).createUrlTree(["/"]);
const routes: Routes = [
  { path: "", loadComponent: () => import("./app/shop").then((m) => m.Shop) },
  {
    path: "products/:id",
    loadComponent: () => import("./app/product").then((m) => m.ProductPage),
  },
  {
    path: "login",
    loadComponent: () => import("./app/auth").then((m) => m.AuthPage),
  },
  {
    path: "cart",
    canActivate: [authenticated],
    loadComponent: () => import("./app/cart").then((m) => m.CartPage),
  },
  {
    path: "checkout",
    canActivate: [authenticated],
    loadComponent: () => import("./app/checkout").then((m) => m.CheckoutPage),
  },
  {
    path: "orders",
    canActivate: [authenticated],
    loadComponent: () => import("./app/orders").then((m) => m.OrdersPage),
  },
  {
    path: "admin",
    canActivate: [admin],
    loadComponent: () => import("./app/admin").then((m) => m.AdminPage),
  },
  { path: "**", redirectTo: "" },
];
bootstrapApplication(App, {
  providers: [
    provideHttpClient(withInterceptors([authInterceptor])),
    provideRouter(
      routes,
      withInMemoryScrolling({ scrollPositionRestoration: "enabled" }),
    ),
  ],
}).catch(console.error);
