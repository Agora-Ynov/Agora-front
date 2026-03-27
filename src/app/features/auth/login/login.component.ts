import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../core/auth/auth.service';
import { ApiErrorResponse, LoginResponse } from '../../../core/auth/auth.model';
import { LoginRequestDto } from '../../../core/api';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  isSubmitting = false;
  errorMessage = '';

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  constructor() {
    if (this.authService.isAuthenticated()) {
      void this.router.navigate(['/catalogue']);
    }

  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    const payload: LoginRequestDto = {
      email: this.loginForm.value.email ?? '',
      password: this.loginForm.value.password ?? '',
    };

    this.authService.loginMock(payload).subscribe({
      next: (response: LoginResponse) => {
        this.authService.saveSession(response);
        this.isSubmitting = false;
        void this.router.navigate(['/catalogue']);
      },
      error: (error: HttpErrorResponse) => {
        this.isSubmitting = false;
        const apiError = error.error as ApiErrorResponse;
        this.errorMessage = apiError?.message ?? 'Une erreur est survenue lors de la connexion.';
      },
    });
  }

  get emailControl() {
    return this.loginForm.get('email');
  }

  get passwordControl() {
    return this.loginForm.get('password');
  }
}
