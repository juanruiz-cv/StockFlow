import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type {
  CashSession,
  CashMovement,
  OpenSessionDto,
  CloseSessionDto,
  CreateMovementDto,
  SessionListResponse,
  MovementListResponse,
} from './models';

@Injectable({ providedIn: 'root' })
export class CajaService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/caja`;

  getCurrent(): Observable<CashSession | null> {
    return this.http.get<CashSession | null>(`${this.baseUrl}/current`);
  }

  openSession(dto: OpenSessionDto): Observable<CashSession> {
    return this.http.post<CashSession>(`${this.baseUrl}/open`, dto);
  }

  closeSession(dto: CloseSessionDto): Observable<CashSession> {
    return this.http.post<CashSession>(`${this.baseUrl}/close`, dto);
  }

  getHistory(params?: {
    page?: number;
    limit?: number;
  }): Observable<SessionListResponse> {
    let httpParams = new HttpParams();
    if (params) {
      if (params.page) httpParams = httpParams.set('page', params.page.toString());
      if (params.limit) httpParams = httpParams.set('limit', params.limit.toString());
    }
    return this.http.get<SessionListResponse>(`${this.baseUrl}/history`, { params: httpParams });
  }

  getSession(id: string): Observable<CashSession> {
    return this.http.get<CashSession>(`${this.baseUrl}/sessions/${id}`);
  }

  getMovements(
    sessionId: string,
    params?: { page?: number; limit?: number },
  ): Observable<MovementListResponse> {
    let httpParams = new HttpParams();
    if (params) {
      if (params.page) httpParams = httpParams.set('page', params.page.toString());
      if (params.limit) httpParams = httpParams.set('limit', params.limit.toString());
    }
    return this.http.get<MovementListResponse>(
      `${this.baseUrl}/sessions/${sessionId}/movements`,
      { params: httpParams },
    );
  }

  addMovement(dto: CreateMovementDto): Observable<CashMovement> {
    return this.http.post<CashMovement>(`${this.baseUrl}/movements`, dto);
  }
}
