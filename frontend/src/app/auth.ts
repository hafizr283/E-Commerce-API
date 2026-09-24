import { Component, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { Session } from "./api";
import { message, fields } from "./models";
@Component({
  imports: [FormsModule, RouterLink],
  template: `
    <section class="auth-layout container">
      <div class="auth-story">
        <p class="eyebrow">WELCOME TO ATELIER</p>
        <h1>Your everyday,<br /><em>a little better.</em></h1>
        <img
          src="/assets/hero.svg"
          alt="Thoughtfully arranged everyday essentials"
        />
        <p>A home for your next favorite things.</p>
      </div>
      <div class="auth-panel">
        <p class="eyebrow">
          {{
            registering() ? "MAKE YOURSELF AT HOME" : "GOOD TO SEE YOU AGAIN"
          }}
        </p>
        <h2>{{ registering() ? "Create an account." : "Welcome back." }}</h2>
        <p>
          {{
            registering()
              ? "Save your bag and follow your orders, all in one place."
              : "Sign in to pick up where you left off."
          }}
        </p>
        <form #form="ngForm" (ngSubmit)="submit()">
          @if (registering()) {
            <label for="name">Your name</label
            ><input
              id="name"
              name="name"
              [(ngModel)]="name"
              required
              maxlength="120"
              autocomplete="name"
            />
          }
          <label for="email">Email address</label
          ><input
            id="email"
            name="email"
            [(ngModel)]="email"
            type="email"
            required
            email
            autocomplete="email"
            maxlength="255"
          />
          <label for="password">Password</label
          ><input
            id="password"
            name="password"
            [(ngModel)]="password"
            [type]="showPassword() ? 'text' : 'password'"
            required
            [minlength]="registering() ? 8 : 1"
            maxlength="72"
            [autocomplete]="registering() ? 'new-password' : 'current-password'"
            aria-describedby="password-help"
          />
          <div class="field-help">
            <small id="password-help">{{
              registering()
                ? "Use at least 8 characters."
                : "Your account password."
            }}</small
            ><button
              type="button"
              class="text-button"
              (click)="showPassword.set(!showPassword())"
            >
              {{ showPassword() ? "Hide" : "Show" }} password
            </button>
          </div>
          @if (error()) {
            <div class="alert error" role="alert">{{ error() }}</div>
          }
          <button class="button full" [disabled]="form.invalid || busy()">
            {{
              busy()
                ? "Just a moment…"
                : registering()
                  ? "Create account →"
                  : "Sign in →"
            }}
          </button>
        </form>
        <p class="auth-switch">
          {{
            registering() ? "Already part of the everyday?" : "New around here?"
          }}
          <button class="text-button" (click)="toggle()">
            {{ registering() ? "Sign in" : "Create an account" }}
          </button>
        </p>
        <a routerLink="/" class="underlined">← Back to the collection</a>
      </div>
    </section>
  `,
})
export class AuthPage {
  session = inject(Session);
  router = inject(Router);
  route = inject(ActivatedRoute);
  registering = signal(false);
  busy = signal(false);
  error = signal("");
  showPassword = signal(false);
  name = "";
  email = "";
  password = "";
  toggle() {
    this.registering.set(!this.registering());
    this.error.set("");
  }
  async submit() {
    this.busy.set(true);
    this.error.set("");
    try {
      if (this.registering())
        await this.session.register(this.name, this.email, this.password);
      else await this.session.login(this.email, this.password);
      const returnTo = this.route.snapshot.queryParamMap.get("returnTo") || "/";
      await this.router.navigateByUrl(
        returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/",
      );
    } catch (e) {
      this.error.set(fields(e) || message(e));
    } finally {
      this.busy.set(false);
    }
  }
}
