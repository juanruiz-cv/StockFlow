import { Component, input, output, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-search-input',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative">
      <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
      <input
        [ngModel]="query()"
        (ngModelChange)="onInput($event)"
        [placeholder]="placeholder()"
        class="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 pl-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
