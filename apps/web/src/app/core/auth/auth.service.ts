import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { TokenService } from './token.service';
import { LoginRequest, LoginResponse, User } from './models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly #user = signal<User | null>(this.#loadUser());
  readonly user = this.#user.asReadonly();
  readonly isAuthenticated = computed(() => this.#user() !== null);
  readonly permissions = computed(() => this.#user()?.permissions ?? []);

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router,
    private readonly tokenService: TokenService,
  ) {}

  #loadUser(): User | null {
    const stored = localStorage.getItem('stockflow_user');
    if (!stored) return null;
    try {
      return JSON.parse(stored) as User;
    } catch {
      return null;
    }
  }

  login(request: LoginRequest): Promise<void> {
    return new Promise((resolve, reject) => {
      this.http
        .post<LoginResponse>(`${environment.apiBaseUrl}/auth/login`, request)
        .subscribe({
          next: (response) => {
            this.tokenService.setTokens(
              response.access_token,
              response.refresh_token,
            );
            localStorage.setItem(
              'stockflow_user',
              JSON.stringify(response.user),
            );
            this.#user.set(response.user);
            this.router.navigate(['/dashboard']);
            resolve();
          },
          error: (err) => reject(err),
        });
    });
  }

  logout(): void {
    this.tokenService.clear();
    localStorage.removeItem('stockflow_user');
    this.#user.set(null);
    this.router.navigate(['/login']);
  }
}
