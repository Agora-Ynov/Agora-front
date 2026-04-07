import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../core/auth/auth.service';
import { ApiErrorResponse } from '../../../core/auth/auth.model';
import { RegisterRequestDto } from '../../../core/api';

function passwordMatchValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const password = control.get('password')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;

    if (!password || !confirmPassword) {
      return null;
    }

    return password === confirmPassword ? null : { passwordMismatch: true };
  };
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  isSubmitting = false;
  errorMessage = '';
  successMessage = '';
  showPassword = false;
  showConfirmPassword = false;

  registerForm = this.fb.group(
    {
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
      acceptedTerms: [false, [Validators.requiredTrue]],
    },
    {
      validators: passwordMatchValidator(),
    }
  );

  constructor() {
    if (this.authService.isAuthenticated()) {
      void this.router.navigate(['/catalogue']);
    }
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    const payload: RegisterRequestDto = {
      firstName: this.registerForm.value.firstName ?? '',
      lastName: this.registerForm.value.lastName ?? '',
      email: this.registerForm.value.email ?? '',
      phone: this.registerForm.value.phone ?? '',
      password: this.registerForm.value.password ?? '',
    };

    this.authService.register(payload).subscribe({
      next: () => {
        this.authService.login(payload.email, payload.password).subscribe({
          next: () => {
            this.isSubmitting = false;
            void this.router.navigate(['/catalogue']);
          },
          error: (error: HttpErrorResponse) => {
            this.isSubmitting = false;
            const apiError = error.error as ApiErrorResponse;
            this.errorMessage =
              apiError?.message ??
              "Compte cree, mais la connexion automatique a echoue. Merci de vous connecter manuellement.";
            void this.router.navigate(['/login']);
          },
        });
      },
      error: (error: HttpErrorResponse) => {
        this.isSubmitting = false;
        const apiError = error.error as ApiErrorResponse;
        this.errorMessage =
          apiError?.message ?? 'Une erreur est survenue lors de la creation du compte.';
      },
    });
  }

  get firstNameControl() {
    return this.registerForm.get('firstName');
  }

  get lastNameControl() {
    return this.registerForm.get('lastName');
  }

  get emailControl() {
    return this.registerForm.get('email');
  }

  get phoneControl() {
    return this.registerForm.get('phone');
  }

  get passwordControl() {
    return this.registerForm.get('password');
  }

  get confirmPasswordControl() {
    return this.registerForm.get('confirmPassword');
  }

  get acceptedTermsControl() {
    return this.registerForm.get('acceptedTerms');
  }

  get passwordsDoNotMatch(): boolean {
    return (
      !!this.registerForm.errors?.['passwordMismatch'] &&
      this.confirmPasswordControl?.touched === true
    );
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }
}
