import {
  HttpInterceptorFn,
  HttpErrorResponse,
} from '@angular/common/http';
import { inject } from '@angular/core';
import {
  BehaviorSubject,
  catchError,
  filter,
  from,
  Observable,
  switchMap,
  throwError,
} from 'rxjs';
import { environment } from '../../../environments/environment';
import { TokenService } from './token.service';
import { RefreshResponse } from './models';

let isRefreshing = false;
const refreshSubject = new BehaviorSubject<string | null>(null);

function refreshTokens(
  tokenService: TokenService,
): Observable<string | null> {
  const refreshTokenValue = tokenService.getRefreshToken();
  if (!refreshTokenValue) return from(Promise.resolve(null));

  isRefreshing = true;
  refreshSubject.next(null);

  return from(
    fetch(`${environment.apiBaseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshTokenValue }),
    }).then((res) => {
      if (!res.ok) {
        tokenService.clear();
        return null;
      }
      return res.json() as Promise<RefreshResponse>;
    }).then((data) => {
      if (!data) return null;
      tokenService.setTokens(data.access_token, data.refresh_token);
      refreshSubject.next(data.access_token);
      return data.access_token;
    }).catch(() => {
      tokenService.clear();
      return null;
    }).finally(() => {
      isRefreshing = false;
    }),
  );
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenService = inject(TokenService);

  const isAuthUrl = req.url.includes('/auth/');
  if (isAuthUrl) {
    return next(req);
  }

  const accessToken = tokenService.getAccessToken();
  if (accessToken) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${accessToken}` },
    });
  }

  return next(req).pipe(
    catchError((error) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        !req.url.includes('/auth/login')
      ) {
        if (!isRefreshing) {
          return refreshTokens(tokenService).pipe(
            switchMap((newToken) => {
              if (!newToken) {
                window.location.href = '/login';
                return throwError(() => error);
              }
              const cloned = req.clone({
                setHeaders: { Authorization: `Bearer ${newToken}` },
              });
              return next(cloned);
            }),
          );
        } else {
          return refreshSubject.pipe(
            filter((token): token is string => token !== null),
            switchMap((token) => {
              const cloned = req.clone({
                setHeaders: { Authorization: `Bearer ${token}` },
              });
              return next(cloned);
            }),
          );
        }
      }
      return throwError(() => error);
    }),
  );
};
