import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type {
  StockItem,
  StockListResponse,
  StockMovement,
  MovementListResponse,
  InboundDto,
  OutboundDto,
  AdjustDto,
} from './models';

@Injectable({ providedIn: 'root' })
export class StockService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/stock`;

  list(params?: {
    page?: number;
    limit?: number;
    search?: string;
    sortColumn?: string;
    sortDirection?: 'asc' | 'desc';
  }): Observable<StockListResponse> {
    let httpParams = new HttpParams();
    if (params) {
      if (params.page) httpParams = httpParams.set('page', params.page.toString());
      if (params.limit) httpParams = httpParams.set('limit', params.limit.toString());
      if (params.search) httpParams = httpParams.set('search', params.search);
      if (params.sortColumn) httpParams = httpParams.set('sortColumn', params.sortColumn);
      if (params.sortDirection) httpParams = httpParams.set('sortDirection', params.sortDirection);
    }
    return this.http.get<StockListResponse>(this.baseUrl, { params: httpParams });
  }

  getByProduct(productId: string): Observable<StockItem> {
    return this.http.get<StockItem>(`${this.baseUrl}/product/${productId}`);
  }

  getMovements(params?: {
    productId?: string;
    type?: string;
    page?: number;
    limit?: number;
  }): Observable<MovementListResponse> {
    let httpParams = new HttpParams();
    if (params) {
      if (params.productId) httpParams = httpParams.set('productId', params.productId);
      if (params.type) httpParams = httpParams.set('type', params.type);
      if (params.page) httpParams = httpParams.set('page', params.page.toString());
      if (params.limit) httpParams = httpParams.set('limit', params.limit.toString());
    }
    return this.http.get<MovementListResponse>(`${this.baseUrl}/movements`, { params: httpParams });
  }

  inbound(dto: InboundDto): Observable<StockMovement> {
    return this.http.post<StockMovement>(`${this.baseUrl}/inbound`, dto);
  }

  outbound(dto: OutboundDto): Observable<StockMovement> {
    return this.http.post<StockMovement>(`${this.baseUrl}/outbound`, dto);
  }

  adjust(dto: AdjustDto): Observable<StockMovement> {
    return this.http.post<StockMovement>(`${this.baseUrl}/adjust`, dto);
  }
}
