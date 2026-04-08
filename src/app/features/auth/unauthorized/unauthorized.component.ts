import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-unauthorized',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="unauthorized-page">
      <article class="unauthorized-card">
        <p class="unauthorized-card__eyebrow">Acces refuse</p>
        <h1>Vous n'avez pas les droits pour ouvrir cette page.</h1>
        <a class="unauthorized-link" routerLink="/account">Retour au profil</a>
      </article>
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .unauthorized-page {
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 1.5rem;
        background: linear-gradient(180deg, #f7f9fc 0%, #ffffff 100%);
      }

      .unauthorized-card {
        max-width: 720px;
        padding: 2rem;
        border: 1px solid rgba(17, 24, 39, 0.1);
        border-radius: 1.5rem;
        background: #fff;
        box-shadow: 0 18px 40px rgba(15, 23, 42, 0.05);
      }

      .unauthorized-card__eyebrow {
        margin: 0 0 0.75rem;
        color: #ef2e2e;
        font-size: 0.9rem;
        font-weight: 700;
        letter-spacing: 0.14em;
        text-transform: uppercase;
      }

      .unauthorized-card h1 {
        margin: 0;
        font-size: clamp(1.8rem, 4vw, 2.6rem);
        line-height: 1.15;
      }

      .unauthorized-link {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 3rem;
        margin-top: 1.5rem;
        padding: 0.85rem 1.2rem;
        border-radius: 0.95rem;
        background: #09081a;
        color: #fff;
        text-decoration: none;
      }
    `,
  ],
})
export class UnauthorizedComponent {}
