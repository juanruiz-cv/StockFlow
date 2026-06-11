import { Component, input, output, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-search-input',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative" role="search">
      <svg class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
      </svg>
      <input
        [ngModel]="query()"
        (ngModelChange)="onInput($event)"
        [placeholder]="placeholder()"
        aria-label="Buscar"
        class="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 pl-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
      />
    </div>
  `,
})
export class SearchInput {
  readonly placeholder = input('Buscar...');
  readonly search = output<string>();

  readonly query = signal('');

  private timeoutId: ReturnType<typeof setTimeout> | null = null;

  protected onInput(value: string): void {
    this.query.set(value);
    if (this.timeoutId) clearTimeout(this.timeoutId);
    this.timeoutId = setTimeout(() => {
      this.search.emit(value);
    }, 300);
  }
}
