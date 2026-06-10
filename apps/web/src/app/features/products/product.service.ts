import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type {
  Product,
  ProductListResponse,
  CreateProductDto,
  UpdateProductDto,
  Categoria,
  CreateCategoriaDto,
  Marca,
  CreateMarcaDto,
  Proveedor,
  CreateProveedorDto,
  PaginatedResponse,
} from './models';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/products`;

  list(params?: {
    page?: number;
    limit?: number;
    search?: string;
    sortColumn?: string;
    sortDirection?: 'asc' | 'desc';
  }): Observable<ProductListResponse> {
    let httpParams = new HttpParams();
    if (params) {
      if (params.page) httpParams = httpParams.set('page', params.page.toString());
      if (params.limit) httpParams = httpParams.set('limit', params.limit.toString());
      if (params.search) httpParams = httpParams.set('search', params.search);
      if (params.sortColumn) httpParams = httpParams.set('sortColumn', params.sortColumn);
      if (params.sortDirection) httpParams = httpParams.set('sortDirection', params.sortDirection);
    }
    return this.http.get<ProductListResponse>(this.baseUrl, { params: httpParams });
  }

  getById(id: string): Observable<Product> {
    return this.http.get<Product>(`${this.baseUrl}/${id}`);
  }

  create(dto: CreateProductDto): Observable<Product> {
    return this.http.post<Product>(this.baseUrl, dto);
  }

  update(id: string, dto: UpdateProductDto): Observable<Product> {
    return this.http.patch<Product>(`${this.baseUrl}/${id}`, dto);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  checkSku(sku: string): Observable<{ exists: boolean }> {
    return this.http.get<{ exists: boolean }>(`${this.baseUrl}/check-sku`, {
      params: new HttpParams().set('sku', sku),
    });
  }

  // Categories
  listCategories(): Observable<Categoria[]> {
    return this.http.get<Categoria[]>(`${environment.apiBaseUrl}/categorias`);
  }

  createCategory(dto: CreateCategoriaDto): Observable<Categoria> {
    return this.http.post<Categoria>(`${environment.apiBaseUrl}/categorias`, dto);
  }

  updateCategory(id: string, dto: CreateCategoriaDto): Observable<Categoria> {
    return this.http.patch<Categoria>(`${environment.apiBaseUrl}/categorias/${id}`, dto);
  }

  deleteCategory(id: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiBaseUrl}/categorias/${id}`);
  }

  // Brands
  listBrands(): Observable<Marca[]> {
    return this.http.get<Marca[]>(`${environment.apiBaseUrl}/marcas`);
  }

  createBrand(dto: CreateMarcaDto): Observable<Marca> {
    return this.http.post<Marca>(`${environment.apiBaseUrl}/marcas`, dto);
  }

  updateBrand(id: string, dto: CreateMarcaDto): Observable<Marca> {
    return this.http.patch<Marca>(`${environment.apiBaseUrl}/marcas/${id}`, dto);
  }

  deleteBrand(id: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiBaseUrl}/marcas/${id}`);
  }

  // Suppliers
  listSuppliers(): Observable<Proveedor[]> {
    return this.http.get<Proveedor[]>(`${environment.apiBaseUrl}/proveedores`);
  }

  createSupplier(dto: CreateProveedorDto): Observable<Proveedor> {
    return this.http.post<Proveedor>(`${environment.apiBaseUrl}/proveedores`, dto);
  }

  updateSupplier(id: string, dto: CreateProveedorDto): Observable<Proveedor> {
    return this.http.patch<Proveedor>(`${environment.apiBaseUrl}/proveedores/${id}`, dto);
  }

  deleteSupplier(id: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiBaseUrl}/proveedores/${id}`);
  }
}
