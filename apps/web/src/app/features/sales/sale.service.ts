import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type {
  Sale,
  SaleListResponse,
  CreateSaleDto,
  VoidSaleDto,
} from './models';

@Injectable({ providedIn: 'root' })
export class SaleService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/sales`;

  list(params?: {
    page?: number;
    limit?: number;
    search?: string;
    sortColumn?: string;
    sortDirection?: 'asc' | 'desc';
  }): Observable<SaleListResponse> {
    let httpParams = new HttpParams();
    if (params) {
      if (params.page) httpParams = httpParams.set('page', params.page.toString());
      if (params.limit) httpParams = httpParams.set('limit', params.limit.toString());
      if (params.search) httpParams = httpParams.set('search', params.search);
      if (params.sortColumn) httpParams = httpParams.set('sortColumn', params.sortColumn);
      if (params.sortDirection) httpParams = httpParams.set('sortDirection', params.sortDirection);
    }
    return this.http.get<SaleListResponse>(this.baseUrl, { params: httpParams });
  }

  getById(id: string): Observable<Sale> {
    return this.http.get<Sale>(`${this.baseUrl}/${id}`);
  }

  create(dto: CreateSaleDto): Observable<Sale> {
    return this.http.post<Sale>(this.baseUrl, dto);
  }

  void(id: string, dto: VoidSaleDto): Observable<Sale> {
    return this.http.post<Sale>(`${this.baseUrl}/${id}/void`, dto);
  }
}
