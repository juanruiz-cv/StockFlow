export interface CashSession {
  id: string;
  estado: 'abierta' | 'cerrada';
  saldo_apertura: number;
  saldo_actual: number;
  saldo_cierre?: number;
  abierta_por: string;
  abierta_por_nombre?: string;
  cerrada_por?: string;
  cerrada_por_nombre?: string;
  abierta_en: string;
  cerrada_en?: string;
  created_at: string;
  updated_at: string;
}

export interface CashMovement {
  id: string;
  sesion_id: string;
  tipo: 'ingreso' | 'egreso';
  monto: number;
  descripcion?: string;
  registrado_por: string;
  registrado_por_nombre?: string;
  created_at: string;
}

export interface OpenSessionDto {
  saldo_apertura: number;
}

export interface CloseSessionDto {
  saldo_cierre: number;
}

export interface CreateMovementDto {
  sesion_id: string;
  tipo: 'ingreso' | 'egreso';
  monto: number;
  descripcion?: string;
}

export interface SessionListResponse {
  data: CashSession[];
  total: number;
  page: number;
  limit: number;
}

export interface MovementListResponse {
  data: CashMovement[];
  total: number;
  page: number;
  limit: number;
}
