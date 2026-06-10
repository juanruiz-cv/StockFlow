export interface Customer {
  id: string;
  nombre: string;
  email: string;
  telefono?: string;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomerListResponse {
  data: Customer[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateCustomerDto {
  nombre: string;
  email: string;
  telefono?: string;
}

export interface UpdateCustomerDto extends Partial<CreateCustomerDto> {
  activo?: boolean;
}
