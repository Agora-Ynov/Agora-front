import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map, switchMap, take, tap } from 'rxjs/operators';
import { AgoraAuthService } from '../../../core/api';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-activate-account',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './activate-account.component.html',
  styleUrl: './activate-account.component.scss',
})
export class ActivateAccountComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly agoraAuth = inject(AgoraAuthService);
  private readonly authService = inject(AuthService);

  readonly token = signal('');
  readonly emailHint = signal<string | null>(null);
  readonly tokenValid = signal<boolean | null>(null);
  readonly checking = signal(true);
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);
  readonly newPassword = signal('');
  readonly confirmPassword = signal('');

  ngOnInit(): void {
    this.route.queryParamMap
      .pipe(
        take(1),
        map(params => params.get('token') ?? ''),
        tap(t => this.token.set(t)),
        switchMap(t =>
          this.agoraAuth.validateActivation(t || undefined, 'body', false, {
            transferCache: false,
          })
        )
      )
      .subscribe({
        next: status => {
          this.checking.set(false);
          const ok = status.valid === true;
          this.tokenValid.set(ok);
          this.emailHint.set(status.targetEmail ?? null);
          if (!ok) {
            this.error.set('Ce lien d’activation est invalide ou expire.');
          }
        },
        error: () => {
          this.checking.set(false);
          this.tokenValid.set(false);
          this.error.set('Verification du lien impossible.');
        },
      });
  }

  submit(): void {
    this.error.set(null);
    const t = this.token().trim();
    const p1 = this.newPassword();
    const p2 = this.confirmPassword();
    if (!t || !p1 || p1.length < 8) {
      this.error.set('Mot de passe requis (8 caracteres minimum).');
      return;
    }
    if (p1 !== p2) {
      this.error.set('Les mots de passe ne correspondent pas.');
      return;
    }
    this.submitting.set(true);
    this.agoraAuth
      .activateAccount({ token: t, newPassword: p1 }, 'body', false, { transferCache: false })
      .pipe(switchMap(res => this.authService.establishSessionFromLoginResponse(res)))
      .subscribe({
        next: () => {
          this.submitting.set(false);
          void this.router.navigateByUrl('/account');
        },
        error: () => {
          this.submitting.set(false);
          this.error.set('Activation impossible (lien usage unique ou mot de passe refuse).');
        },
      });
  }
}
