import { Component, inject, signal, effect, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { of, catchError, tap } from 'rxjs';
import { CajaService } from './caja.service';
import { CashSession } from './models';

@Component({
  selector: 'app-session',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-gray-900">Caja</h1>
        @if (session()) {
          <a
            routerLink="/caja/movements"
            class="cursor-pointer rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors duration-150 hover:bg-gray-50"
          >
            Ver Movimientos
          </a>
        }
      </div>

      <!-- Session Status Bar -->
      <div
        class="rounded-lg border p-4"
        [class.border-green-200]="session()?.estado === 'abierta'"
        [class.bg-green-50]="session()?.estado === 'abierta'"
        [class.border-gray-200]="!session() || session()?.estado === 'cerrada'"
        [class.bg-white]="!session() || session()?.estado === 'cerrada'"
      >
        @if (session(); as s) {
          <div class="flex items-center justify-between">
            <div>
              <div class="flex items-center gap-2">
                <span
                  class="inline-flex h-2.5 w-2.5 rounded-full"
                  [class.bg-green-500]="s.estado === 'abierta'"
                  [class.bg-gray-400]="s.estado === 'cerrada'"
                ></span>
                <span class="font-semibold text-gray-900">
                  {{ s.estado === 'abierta' ? 'Sesión abierta' : 'Sesión cerrada' }}
                </span>
              </div>
              <div class="mt-2 space-y-1 text-sm text-gray-600">
                <p>Saldo apertura: <span class="font-medium text-gray-900">\${{ s.saldo_apertura.toFixed(2) }}</span></p>
                @if (s.estado === 'abierta') {
                  <p>Saldo actual: <span class="font-medium text-gray-900">\${{ s.saldo_actual.toFixed(2) }}</span></p>
                }
                @if (s.estado === 'cerrada' && s.saldo_cierre != null) {
                  <p>Saldo cierre: <span class="font-medium text-gray-900">\${{ s.saldo_cierre.toFixed(2) }}</span></p>
                }
                <p class="text-xs text-gray-400">
                  Abierta {{ s.abierta_en | date:'short' }}
                  @if (s.cerrada_en) {
                    &middot; Cerrada {{ s.cerrada_en | date:'short' }}
                  }
                </p>
              </div>
            </div>
          </div>
        } @else {
          <div class="flex items-center gap-2">
            <span class="inline-flex h-2.5 w-2.5 rounded-full bg-gray-300"></span>
            <p class="text-gray-500">Sin sesión activa</p>
          </div>
        }
      </div>

      <!-- Loading indicator -->
      @if (loading()) {
        <div class="text-center text-sm text-gray-500">Cargando...</div>
      }

      <!-- Open Session Form -->
      @if (!session() && !loading()) {
        <form
          [formGroup]="openForm"
          (ngSubmit)="onOpenSession()"
          class="space-y-4 rounded-lg border border-gray-200 bg-white p-6"
        >
          <h2 class="text-lg font-semibold text-gray-900">Abrir Sesión</h2>

          <div>
            <label class="block text-sm font-medium text-gray-700">Saldo de apertura *</label>
            <input
              type="number"
              formControlName="saldo_apertura"
              step="0.01"
              min="0"
              class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            @if (openForm.get('saldo_apertura')?.invalid && openForm.get('saldo_apertura')?.touched) {
              <p class="mt-1 text-xs text-red-500">Ingrese un saldo válido</p>
            }
          </div>

          @if (submitError()) {
            <div class="rounded-lg bg-red-50 p-3 text-sm text-red-600">{{ submitError() }}</div>
          }

          <div class="flex justify-end">
            <button
              type="submit"
              [disabled]="submitting() || openForm.invalid"
              class="cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-all duration-150 hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50"
            >
              {{ submitting() ? 'Abriendo...' : 'Abrir Sesión' }}
            </button>
          </div>
        </form>
      }

      <!-- Close Session Form -->
      @if (session()?.estado === 'abierta' && !loading()) {
        <form
          [formGroup]="closeForm"
          (ngSubmit)="onCloseSession()"
          class="space-y-4 rounded-lg border border-gray-200 bg-white p-6"
        >
          <h2 class="text-lg font-semibold text-gray-900">Cerrar Sesión</h2>

          <div>
            <label class="block text-sm font-medium text-gray-700">Saldo de cierre *</label>
            <input
              type="number"
              formControlName="saldo_cierre"
              step="0.01"
              min="0"
              class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            @if (closeForm.get('saldo_cierre')?.invalid && closeForm.get('saldo_cierre')?.touched) {
              <p class="mt-1 text-xs text-red-500">Ingrese un saldo válido</p>
            }
          </div>

          @if (closeError()) {
            <div class="rounded-lg bg-red-50 p-3 text-sm text-red-600">{{ closeError() }}</div>
          }

          <div class="flex justify-end">
            <button
              type="submit"
              [disabled]="submitting() || closeForm.invalid"
              class="cursor-pointer rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-all duration-150 hover:bg-red-700 active:scale-[0.98] disabled:opacity-50"
            >
              {{ submitting() ? 'Cerrando...' : 'Cerrar Sesión' }}
            </button>
          </div>
        </form>
      }
    </div>
  `,
})
export class SessionPage {
  private readonly cajaService = inject(CajaService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly session = signal<CashSession | null>(null);
  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly submitError = signal('');
  readonly closeError = signal('');

  readonly openForm = this.fb.group({
    saldo_apertura: [0, [Validators.required, Validators.min(0.01)]],
  });

  readonly closeForm = this.fb.group({
    saldo_cierre: [0, [Validators.required, Validators.min(0)]],
  });

  constructor() {
    this.loadCurrentSession();

    const sub = effect(() => {
      // Re-fetch on navigation back (no params needed, just initial load)
    });
    this.destroyRef.onDestroy(() => sub.destroy());
  }

  private loadCurrentSession(): void {
    this.loading.set(true);
    this.cajaService
      .getCurrent()
      .pipe(
        tap({
          next: (s) => {
            this.session.set(s);
            this.loading.set(false);
          },
          error: () => this.loading.set(false),
        }),
        catchError(() => of(null)),
      )
      .subscribe();
  }

  onOpenSession(): void {
    if (this.openForm.invalid) return;

    this.submitting.set(true);
    this.submitError.set('');

    this.cajaService
      .openSession({ saldo_apertura: this.openForm.value.saldo_apertura! })
      .pipe(
        tap({
          next: (s) => {
            this.session.set(s);
            this.submitting.set(false);
            this.openForm.reset({ saldo_apertura: 0 });
          },
          error: (err) => {
            this.submitting.set(false);
            this.submitError.set(err.error?.message || 'Error al abrir la sesión. Intente nuevamente.');
          },
        }),
        catchError(() => of(null)),
      )
      .subscribe();
  }

  onCloseSession(): void {
    if (this.closeForm.invalid) return;

    this.submitting.set(true);
    this.closeError.set('');

    this.cajaService
      .closeSession({ saldo_cierre: this.closeForm.value.saldo_cierre! })
      .pipe(
        tap({
          next: (s) => {
            this.session.set(s);
            this.submitting.set(false);
            this.closeForm.reset({ saldo_cierre: 0 });
          },
          error: (err) => {
            this.submitting.set(false);
            this.closeError.set(err.error?.message || 'Error al cerrar la sesión. Intente nuevamente.');
          },
        }),
        catchError(() => of(null)),
      )
      .subscribe();
  }
}
