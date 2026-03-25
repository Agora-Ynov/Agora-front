import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import { AuthService } from '../../../core/auth/auth.service';
import { ApiErrorResponse, LoginRequest, LoginResponse } from '../../../core/auth/auth.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  isSubmitting = false;
  errorMessage = '';

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    const payload: LoginRequest = {
      email: this.loginForm.value.email ?? '',
      password: this.loginForm.value.password ?? ''
    };

    // Temporaire : utiliser loginMock tant que le back n'est pas prêt
this.authService.loginMock(payload).subscribe({
  next: (response: LoginResponse) => {
    this.authService.saveSession(response);
    this.isSubmitting = false;
    this.router.navigate(['/']);
  },
  error: (error: HttpErrorResponse) => {
    this.isSubmitting = false;

    const apiError = error.error as ApiErrorResponse;
    this.errorMessage = apiError?.message || 'Une erreur est survenue lors de la connexion.';
  }
});
  }

  get emailControl() {
    return this.loginForm.get('email');
  }

  get passwordControl() {
    return this.loginForm.get('password');
  }
}