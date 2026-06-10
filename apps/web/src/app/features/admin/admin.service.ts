import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type {
  User,
  UserListResponse,
  CreateUserDto,
  UpdateUserDto,
  Role,
  RoleListResponse,
  CreateRoleDto,
  UpdateRoleDto,
  Permission,
} from './models';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}`;

  // ── Users ──

  listUsers(params?: {
    page?: number;
    limit?: number;
    search?: string;
    sortColumn?: string;
    sortDirection?: 'asc' | 'desc';
  }): Observable<UserListResponse> {
    let httpParams = new HttpParams();
    if (params) {
      if (params.page) httpParams = httpParams.set('page', params.page.toString());
      if (params.limit) httpParams = httpParams.set('limit', params.limit.toString());
      if (params.search) httpParams = httpParams.set('search', params.search);
      if (params.sortColumn) httpParams = httpParams.set('sortColumn', params.sortColumn);
      if (params.sortDirection) httpParams = httpParams.set('sortDirection', params.sortDirection);
    }
    return this.http.get<UserListResponse>(`${this.baseUrl}/users`, { params: httpParams });
  }

  getUserById(id: string): Observable<User> {
    return this.http.get<User>(`${this.baseUrl}/users/${id}`);
  }

  createUser(dto: CreateUserDto): Observable<User> {
    return this.http.post<User>(`${this.baseUrl}/users`, dto);
  }

  updateUser(id: string, dto: UpdateUserDto): Observable<User> {
    return this.http.patch<User>(`${this.baseUrl}/users/${id}`, dto);
  }

  deleteUser(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/users/${id}`);
  }

  assignRole(userId: string, roleId: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/users/${userId}/roles`, { roleId });
  }

  removeRole(userId: string, roleId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/users/${userId}/roles/${roleId}`);
  }

  // ── Roles ──

  listRoles(params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Observable<RoleListResponse> {
    let httpParams = new HttpParams();
    if (params) {
      if (params.page) httpParams = httpParams.set('page', params.page.toString());
      if (params.limit) httpParams = httpParams.set('limit', params.limit.toString());
      if (params.search) httpParams = httpParams.set('search', params.search);
    }
    return this.http.get<RoleListResponse>(`${this.baseUrl}/roles`, { params: httpParams });
  }

  getRoleById(id: string): Observable<Role> {
    return this.http.get<Role>(`${this.baseUrl}/roles/${id}`);
  }

  createRole(dto: CreateRoleDto): Observable<Role> {
    return this.http.post<Role>(`${this.baseUrl}/roles`, dto);
  }

  updateRole(id: string, dto: UpdateRoleDto): Observable<Role> {
    return this.http.patch<Role>(`${this.baseUrl}/roles/${id}`, dto);
  }

  deleteRole(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/roles/${id}`);
  }

  // ── Permissions ──

  listPermissions(): Observable<Permission[]> {
    return this.http.get<Permission[]>(`${this.baseUrl}/permissions`);
  }
}
