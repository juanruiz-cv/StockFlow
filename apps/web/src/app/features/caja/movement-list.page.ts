import { Component, inject, signal, computed, effect, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { of, catchError, tap, switchMap } from 'rxjs';
import { PaginationState } from '../../shared/ui/table';
import { CajaService } from './caja.service';
import { CashSession, CashMovement } from './models';

@Component({
  selector: 'app-movement-list',
  standalone: true,
  imports: [RouterLink, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-gray-900">Movimientos de Caja</h1>
        <a
          routerLink="/caja"
          class="cursor-pointer rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors duration-150 hover:bg-gray-50"
        >
          &larr; Volver a Caja
        </a>
      </div>

      <!-- Session info header -->
      @if (currentSession(); as s) {
        <div class="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm">
          <span class="font-medium">Sesión:</span>
          {{ s.estado === 'abierta' ? 'Abierta' : 'Cerrada' }}
          &middot;
          Saldo apertura: <span class="font-medium">\${{ s.saldo_apertura.toFixed(2) }}</span>
          @if (s.estado === 'abierta') {
            &middot;
            Saldo actual: <span class="font-medium">\${{ s.saldo_actual.toFixed(2) }}</span>
          }
        </div>
      }

      <div class="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table class="w-full text-left text-sm">
          <thead class="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th scope="col" class="px-4 py-3">Tipo</th>
              <th scope="col" class="px-4 py-3">Monto</th>
              <th scope="col" class="px-4 py-3">Descripción</th>
              <th scope="col" class="px-4 py-3">Registrado por</th>
              <th scope="col" class="px-4 py-3">Fecha</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            @for (movement of movements(); track movement.id) {
              <tr class="transition-colors duration-150 hover:bg-gray-50">
                <td class="px-4 py-3">
                  <span
                    class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
                    [class.bg-green-100]="movement.tipo === 'ingreso'"
                    [class.text-green-700]="movement.tipo === 'ingreso'"
                    [class.bg-red-100]="movement.tipo === 'egreso'"
                    [class.text-red-700]="movement.tipo === 'egreso'"
                  >
                    {{ movement.tipo === 'ingreso' ? 'Ingreso' : 'Egreso' }}
                  </span>
                </td>
                <td class="px-4 py-3 font-medium">
                  <span
                    [class.text-green-600]="movement.tipo === 'ingreso'"
                    [class.text-red-600]="movement.tipo === 'egreso'"
                  >
                    {{ movement.tipo === 'ingreso' ? '+' : '-' }}\${{ Math.abs(movement.monto).toFixed(2) }}
                  </span>
                </td>
                <td class="px-4 py-3 text-gray-500">{{ movement.descripcion || '—' }}</td>
                <td class="px-4 py-3 text-gray-500">{{ movement.registrado_por_nombre || '—' }}</td>
                <td class="px-4 py-3 text-gray-500">{{ movement.created_at | date:'short' }}</td>
              </tr>
            } @empty {
              <tr>
                <td colspan="5" class="px-4 py-12 text-center text-gray-500">
                  @if (loading()) {
                    Cargando...
                  } @else {
                    No hay movimientos en esta sesión
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>

        @if (pagination().total > 0) {
          <div class="flex items-center justify-between border-t border-gray-200 px-4 py-3">
            <div class="text-sm text-gray-500">
              {{ (pagination().page - 1) * pagination().limit + 1 }}&ndash;{{
                Math.min(pagination().page * pagination().limit, pagination().total)
              }} de {{ pagination().total }}
            </div>
            <div class="flex items-center gap-1">
              <button
                (click)="onPageChange(pagination().page - 1)"
                [disabled]="pagination().page <= 1"
              class="cursor-pointer rounded-md px-3 py-1 text-sm transition-all duration-150 hover:bg-gray-100 disabled:opacity-40"
            >
              Anterior
            </button>
            @for (p of pages(); track $index) {
              <button
                (click)="onPageChange(p)"
                class="cursor-pointer rounded-md px-3 py-1 text-sm transition-all duration-150"
                [class.bg-blue-600]="p === pagination().page"
                [class.text-white]="p === pagination().page"
                [class.hover:bg-gray-100]="p !== pagination().page"
              >
                {{ p }}
              </button>
            }
            <button
              (click)="onPageChange(pagination().page + 1)"
              [disabled]="pagination().page >= totalPages()"
              class="cursor-pointer rounded-md px-3 py-1 text-sm transition-all duration-150 hover:bg-gray-100 disabled:opacity-40"
            >
              Siguiente
              </button>
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class MovementListPage {
  protected readonly Math = Math;

  private readonly cajaService = inject(CajaService);
  private readonly destroyRef = inject(DestroyRef);

  readonly currentSession = signal<CashSession | null>(null);
  readonly sessionId = signal<string | null>(null);
  readonly currentPage = signal(1);
  readonly loading = signal(false);

  readonly movements = signal<CashMovement[]>([]);
  readonly pagination = signal<PaginationState>({ page: 1, limit: 20, total: 0 });

  protected totalPages = computed(() =>
    Math.max(1, Math.ceil(this.pagination().total / this.pagination().limit)),
  );

  protected pages = computed(() => {
    const total = this.totalPages();
    const current = this.pagination().page;
    const start = Math.max(1, current - 2);
    const end = Math.min(total, start + 4);
    const count = end - start + 1;
    if (count <= 0) return [1];
    return Array.from({ length: count }, (_, i) => start + i);
  });

  constructor() {
    // Load current session first, then initial page of movements
    this.cajaService.getCurrent().pipe(
      tap((s) => {
        if (s) {
          this.currentSession.set(s);
          this.sessionId.set(s.id);
        }
      }),
      switchMap((s) => {
        if (!s) return of(null);
        return this.cajaService.getMovements(s.id, { page: 1, limit: 20 });
      }),
      tap({
        next: (res) => {
          if (res) {
            this.movements.set(res.data);
            this.pagination.set({ page: res.page, limit: res.limit, total: res.total });
          }
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      }),
      catchError(() => of(null)),
    ).subscribe();

    // Effect for page changes
    const sub = effect(() => {
      const page = this.currentPage();
      const sId = this.sessionId();
      if (sId && page > 1) {
        this.loadMovements(sId, page);
      }
    });
    this.destroyRef.onDestroy(() => sub.destroy());
  }

  private loadMovements(sessionId: string, page: number): void {
    this.loading.set(true);
    this.cajaService
      .getMovements(sessionId, { page, limit: 20 })
      .pipe(
        tap({
          next: (res) => {
            this.movements.set(res.data);
            this.pagination.set({ page: res.page, limit: res.limit, total: res.total });
            this.loading.set(false);
          },
          error: () => this.loading.set(false),
        }),
        catchError(() => of(null)),
      )
      .subscribe();
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }
}
