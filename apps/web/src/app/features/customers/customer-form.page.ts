import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { of, catchError, tap, switchMap } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { CustomerService } from './customer.service';

@Component({
  selector: 'app-customer-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto max-w-2xl space-y-6">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-gray-900">{{ isEditing() ? 'Editar Cliente' : 'Nuevo Cliente' }}</h1>
        <a routerLink="/customers" class="text-sm text-blue-600 transition-colors duration-150 hover:text-blue-800">&larr; Volver</a>
      </div>

      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4 rounded-lg border border-gray-200 bg-white p-6">
        <div>
          <label class="block text-sm font-medium text-gray-700">Nombre *</label>
          <input
            formControlName="nombre"
            class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
          @if (form.get('nombre')?.invalid && form.get('nombre')?.touched) {
            <p class="mt-1 text-xs text-red-500">El nombre es requerido</p>
          }
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            formControlName="email"
            class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700">Teléfono</label>
          <input
            formControlName="telefono"
            class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        @if (submitError()) {
          <div class="rounded-lg bg-red-50 p-3 text-sm text-red-600">{{ submitError() }}</div>
        }

        <div class="flex justify-end gap-3">
          <a routerLink="/customers" class="cursor-pointer rounded-lg border border-gray-300 px-4 py-2 text-sm transition-colors duration-150 hover:bg-gray-50">Cancelar</a>
          <button
            type="submit"
            [disabled]="submitting()"
            class="cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-all duration-150 hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50"
          >
            {{ submitting() ? 'Guardando...' : isEditing() ? 'Actualizar' : 'Crear Cliente' }}
          </button>
        </div>
      </form>
    </div>
  `,
})
export class CustomerFormPage {
  private readonly fb = inject(FormBuilder);
  private readonly customerService = inject(CustomerService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly isEditing = signal(false);
  readonly submitting = signal(false);
  readonly submitError = signal('');

  readonly customerId = toSignal(
    this.route.paramMap.pipe(
      tap((params) => {
        const id = params.get('id');
        if (id && id !== 'new') {
          this.isEditing.set(true);
          this.loadCustomer(id);
        }
      }),
      switchMap((params) => {
        const id = params.get('id');
        return of(id && id !== 'new' ? id : null);
      }),
    ),
  );

  readonly form = this.fb.group({
    nombre: ['', Validators.required],
    email: [''],
    telefono: [''],
  });

  private loadCustomer(id: string): void {
    this.customerService.getById(id).subscribe((customer) => {
      this.form.patchValue({
        nombre: customer.nombre,
        email: customer.email,
        telefono: customer.telefono || '',
      });
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.submitting.set(true);
    this.submitError.set('');

    const dto = this.form.value;
    const action = this.isEditing()
      ? this.customerService.update(this.route.snapshot.paramMap.get('id')!, dto as any)
      : this.customerService.create(dto as any);

    action.pipe(
      tap({
        next: () => this.router.navigate(['/customers']),
        error: () => {
          this.submitting.set(false);
          this.submitError.set('Error al guardar el cliente. Intente nuevamente.');
        },
      }),
      catchError(() => of(null)),
    ).subscribe();
  }
}
