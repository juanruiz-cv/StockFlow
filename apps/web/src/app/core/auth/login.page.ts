import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from './auth.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="flex min-h-screen items-center justify-center bg-gray-100">
      <div class="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
        <h1 class="mb-6 text-center text-2xl font-bold text-gray-900">
          StockFlow
        </h1>
        <h2 class="mb-6 text-center text-lg text-gray-600">Iniciar sesión</h2>

        @if (error()) {
          <div
            class="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700"
          >
            {{ error() }}
          </div>
        }

        <form
          [formGroup]="loginForm"
          (ngSubmit)="onSubmit()"
          class="space-y-4"
        >
          <div>
            <label
              for="email"
              class="block text-sm font-medium text-gray-700"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              formControlName="email"
              class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="correo@ejemplo.com"
            />
          </div>

          <div>
            <label
              for="password"
              class="block text-sm font-medium text-gray-700"
            >
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              formControlName="password"
              class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            [disabled]="loginForm.invalid || loading()"
            class="w-full cursor-pointer rounded-md bg-blue-600 px-4 py-2 text-white transition-colors duration-200 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {{ loading() ? 'Ingresando...' : 'Ingresar' }}
          </button>
        </form>
      </div>
    </div>
  `,
})
export class LoginPage {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly loginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  onSubmit(): void {
    if (this.loginForm.invalid) return;

    this.loading.set(true);
    this.error.set(null);

    const { email, password } = this.loginForm.getRawValue();

    this.authService.login({ email, password }).catch((err) => {
      if (err instanceof HttpErrorResponse && err.status === 401) {
        this.error.set('Email o contraseña incorrectos');
      } else {
        this.error.set('Error de conexión. Intente nuevamente.');
      }
      this.loading.set(false);
    });
  }
}
