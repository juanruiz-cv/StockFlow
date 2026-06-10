export interface User {
  id: string;
  name: string;
  email: string;
  roles: string[];
  roleIds?: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Role {
  id: string;
  name: string;
  permissions: string[];
  permissionIds?: string[];
  created_at: string;
  updated_at: string;
}

export interface Permission {
  id: string;
  resource: string;
  action: string;
  name: string;
}

export interface UserListResponse {
  data: User[];
  total: number;
  page: number;
  limit: number;
}

export interface RoleListResponse {
  data: Role[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateUserDto {
  name: string;
  email: string;
  password: string;
}

export interface UpdateUserDto {
  name?: string;
  email?: string;
  is_active?: boolean;
}

export interface CreateRoleDto {
  name: string;
}

export interface UpdateRoleDto {
  name?: string;
  permissionIds?: string[];
}
