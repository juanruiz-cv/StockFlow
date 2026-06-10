export interface StockItem {
  id: string;
  product_id: string;
  product_name: string;
  sku: string;
  quantity: number;
  low_stock_threshold: number;
  last_movement_at: string | null;
  last_movement_type: string | null;
}

export interface StockListResponse {
  data: StockItem[];
  total: number;
  page: number;
  limit: number;
}

export interface StockMovement {
  id: string;
  type: 'inbound' | 'outbound' | 'adjust';
  product_id: string;
  product_name: string;
  sku: string;
  quantity: number;
  previous_stock: number;
  new_stock: number;
  reason?: string;
  user_id: string;
  user_name?: string;
  created_at: string;
}

export interface MovementListResponse {
  data: StockMovement[];
  total: number;
  page: number;
  limit: number;
}

export interface InboundDto {
  product_id: string;
  quantity: number;
  reason?: string;
}

export interface OutboundDto {
  product_id: string;
  quantity: number;
  reason?: string;
}

export interface AdjustDto {
  product_id: string;
  quantity: number;
  reason: string;
}
