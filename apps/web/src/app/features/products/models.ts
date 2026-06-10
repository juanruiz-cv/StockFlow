export interface Product {
  id: string;
  nombre: string;
  sku: string;
  descripcion?: string;
  precio_compra: number;
  precio_venta: number;
  stock_actual: number;
  stock_minimo: number;
  categoria_id: string;
  marca_id: string;
  proveedor_id: string;
  categoria_nombre?: string;
  marca_nombre?: string;
  proveedor_nombre?: string;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductListResponse {
  data: Product[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateProductDto {
  nombre: string;
  sku: string;
  descripcion?: string;
  precio_compra: number;
  precio_venta: number;
  stock_actual: number;
  stock_minimo: number;
  categoria_id: string;
  marca_id: string;
  proveedor_id: string;
}

export interface UpdateProductDto extends Partial<CreateProductDto> {
  activo?: boolean;
}

export interface Categoria {
  id: string;
  nombre: string;
  descripcion?: string;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCategoriaDto {
  nombre: string;
  descripcion?: string;
}

export interface Marca {
  id: string;
  nombre: string;
  descripcion?: string;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateMarcaDto {
  nombre: string;
  descripcion?: string;
}

export interface Proveedor {
  id: string;
  nombre: string;
  contacto?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateProveedorDto {
  nombre: string;
  contacto?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
