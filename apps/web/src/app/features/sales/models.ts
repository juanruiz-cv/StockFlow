export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  product_name: string;
  sku: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface Payment {
  method: 'cash' | 'card' | 'transfer';
  amount: number;
}

export interface Sale {
  id: string;
  items: SaleItem[];
  payments: Payment[];
  total: number;
  change: number;
  customer_id?: string;
  customer_name?: string;
  status: 'completed' | 'voided';
  void_reason?: string;
  voided_at?: string;
  invoice_number: string;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  product_id: string;
  product_name: string;
  sku: string;
  quantity: number;
  unit_price: number;
}

export interface CreateSaleDto {
  items: Array<{
    product_id: string;
    quantity: number;
    unit_price: number;
  }>;
  payments: Array<{
    method: 'cash' | 'card' | 'transfer';
    amount: number;
  }>;
  customer_id?: string;
}

export interface VoidSaleDto {
  reason: string;
}

export interface SaleListResponse {
  data: Sale[];
  total: number;
  page: number;
  limit: number;
}
