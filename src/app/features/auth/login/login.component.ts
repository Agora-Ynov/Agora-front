import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly errorMessage = signal<string | null>(null);
  readonly submitting = signal(false);

  readonly loginForm = this.formBuilder.nonNullable.group({
    email: ['jean.dupont@gmail.com', [Validators.required, Validators.email]],
    password: ['MonMotDePasse123!', [Validators.required, Validators.minLength(8)]],
  });

  constructor() {
    if (this.authService.isAuthenticated()) {
      void this.router.navigate(['/catalogue']);
    }
  }

  submit(): void {
    if (this.loginForm.invalid || this.submitting()) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.errorMessage.set(null);
    this.submitting.set(true);

    const { email, password } = this.loginForm.getRawValue();

    this.authService.login(email, password).subscribe({
      next: async () => {
        this.submitting.set(false);
        await this.router.navigate(['/catalogue']);
      },
      error: error => {
        this.submitting.set(false);
        this.errorMessage.set(error?.error?.message ?? 'Connexion impossible pour le moment.');
      },
    });
  }
}
