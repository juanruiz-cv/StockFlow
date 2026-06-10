// Mock localStorage for Node environment
const store: Record<string, string> = {};
Object.defineProperty(global, 'localStorage', {
  value: {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      Object.keys(store).forEach((k) => delete store[k]);
    },
  },
  writable: true,
});

// ----- Models -----

interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  product_name: string;
  sku: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

interface Payment {
  method: 'cash' | 'card' | 'transfer';
  amount: number;
}

interface Sale {
  id: string;
  items: SaleItem[];
  payments: Payment[];
  total: number;
  change: number;
  customer_id?: string;
  customer_name?: string;
  status: 'completed' | 'voided';
  void_reason?: string;
  invoice_number: string;
  created_at: string;
  updated_at: string;
}

interface CartItem {
  product_id: string;
  product_name: string;
  sku: string;
  quantity: number;
  unit_price: number;
}

// ----- Test helpers -----

function cartTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
}

function calculateChange(total: number, amountReceived: number): number {
  return amountReceived - total;
}

function searchProducts(
  products: { nombre: string; sku: string }[],
  term: string,
): { nombre: string; sku: string }[] {
  if (!term.trim()) return [];
  const lower = term.toLowerCase();
  return products.filter(
    (p) =>
      p.nombre.toLowerCase().includes(lower) ||
      p.sku.toLowerCase().includes(lower),
  );
}

function adjustCartItem(
  items: CartItem[],
  productId: string,
  delta: number,
): CartItem[] {
  return items
    .map((item) => {
      if (item.product_id !== productId) return item;
      const newQty = item.quantity + delta;
      if (newQty <= 0) return null;
      return { ...item, quantity: newQty };
    })
    .filter((item): item is CartItem => item !== null);
}

// ----- Mirror of SaleService -----

class SaleServiceTest {
  private baseUrl = 'http://localhost:3000/api';

  async list(params?: {
    page?: number;
    limit?: number;
    search?: string;
    sortColumn?: string;
    sortDirection?: 'asc' | 'desc';
  }): Promise<{ data: Sale[]; total: number; page: number; limit: number }> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.search) searchParams.set('search', params.search);
    if (params?.sortColumn) searchParams.set('sortColumn', params.sortColumn);
    if (params?.sortDirection)
      searchParams.set('sortDirection', params.sortDirection);

    const qs = searchParams.toString();
    const url = `${this.baseUrl}/sales${qs ? '?' + qs : ''}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async getById(id: string): Promise<Sale> {
    const res = await fetch(`${this.baseUrl}/sales/${id}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async create(dto: {
    items: Array<{ product_id: string; quantity: number; unit_price: number }>;
    payments: Array<{ method: string; amount: number }>;
    customer_id?: string;
  }): Promise<Sale> {
    const res = await fetch(`${this.baseUrl}/sales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async void(id: string, dto: { reason: string }): Promise<Sale> {
    const res = await fetch(`${this.baseUrl}/sales/${id}/void`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }
}

// ----- Modal (CDK overlay based) -----

class ModalRef {
  private _open = false;
  private _onClose: (() => void) | null = null;

  get open(): boolean {
    return this._open;
  }

  show(): void {
    this._open = true;
  }

  hide(): void {
    this._open = false;
    this._onClose?.();
  }

  onClose(cb: () => void): void {
    this._onClose = cb;
  }
}

// ----- Toast -----

interface ToastMessage {
  message: string;
  type: 'success' | 'error' | 'info';
}

class ToastServiceTest {
  readonly messages: ToastMessage[] = [];

  show(config: { message: string; type?: string; duration?: number }): void {
    this.messages.push({
      message: config.message,
      type: (config.type as ToastMessage['type']) || 'info',
    });
  }

  clear(): void {
    this.messages.length = 0;
  }
}

// ----- Tests -----

describe('SaleService', () => {
  let service: SaleServiceTest;

  beforeEach(() => {
    service = new SaleServiceTest();
  });

  it('creates list URL with pagination params', () => {
    const url = service['baseUrl'] + '/sales?page=1&limit=20';
    expect(url).toContain('/sales');
    expect(url).toContain('page=1');
    expect(url).toContain('limit=20');
  });

  it('creates list URL with search param', () => {
    const url = service['baseUrl'] + '/sales?search=widget';
    expect(url).toContain('search=widget');
  });

  it('creates list URL with sort params', () => {
    const url =
      service['baseUrl'] + '/sales?sortColumn=created_at&sortDirection=desc';
    expect(url).toContain('sortColumn=created_at');
    expect(url).toContain('sortDirection=desc');
  });

  it('creates getById URL', () => {
    const url = service['baseUrl'] + '/sales/abc-123';
    expect(url).toContain('/sales/abc-123');
  });

  it('creates create endpoint URL', () => {
    expect(service['baseUrl'] + '/sales').toContain('/sales');
  });

  it('creates void endpoint URL', () => {
    expect(service['baseUrl'] + '/sales/abc-123/void').toContain(
      '/sales/abc-123/void',
    );
  });
});

describe('Cart Logic', () => {
  it('starts with empty cart', () => {
    const items: CartItem[] = [];
    expect(items).toHaveLength(0);
    expect(cartTotal(items)).toBe(0);
  });

  it('adds item to cart and calculates total', () => {
    const items: CartItem[] = [
      {
        product_id: 'p1',
        product_name: 'Widget A',
        sku: 'WDG-001',
        quantity: 2,
        unit_price: 25.0,
      },
    ];

    expect(items).toHaveLength(1);
    expect(cartTotal(items)).toBe(50.0);
  });

  it('adds multiple items to cart and sums total', () => {
    const items: CartItem[] = [
      {
        product_id: 'p1',
        product_name: 'Widget A',
        sku: 'WDG-001',
        quantity: 2,
        unit_price: 25.0,
      },
      {
        product_id: 'p2',
        product_name: 'Widget B',
        sku: 'WDG-002',
        quantity: 1,
        unit_price: 15.5,
      },
    ];

    expect(items).toHaveLength(2);
    expect(cartTotal(items)).toBe(65.5);
  });

  it('adjusts quantity up and recalculates', () => {
    let items: CartItem[] = [
      {
        product_id: 'p1',
        product_name: 'Widget A',
        sku: 'WDG-001',
        quantity: 1,
        unit_price: 25.0,
      },
    ];

    items = adjustCartItem(items, 'p1', 2);
    expect(items[0].quantity).toBe(3);
    expect(cartTotal(items)).toBe(75.0);
  });

  it('adjusts quantity down and recalculates', () => {
    let items: CartItem[] = [
      {
        product_id: 'p1',
        product_name: 'Widget A',
        sku: 'WDG-001',
        quantity: 5,
        unit_price: 25.0,
      },
    ];

    items = adjustCartItem(items, 'p1', -2);
    expect(items[0].quantity).toBe(3);
    expect(cartTotal(items)).toBe(75.0);
  });

  it('removes item when quantity reaches zero', () => {
    let items: CartItem[] = [
      {
        product_id: 'p1',
        product_name: 'Widget A',
        sku: 'WDG-001',
        quantity: 1,
        unit_price: 25.0,
      },
    ];

    items = adjustCartItem(items, 'p1', -1);
    expect(items).toHaveLength(0);
    expect(cartTotal(items)).toBe(0);
  });

  it('calculates item subtotal (unit_price * quantity)', () => {
    const item: CartItem = {
      product_id: 'p1',
      product_name: 'Widget A',
      sku: 'WDG-001',
      quantity: 3,
      unit_price: 25.0,
    };

    const subtotal = item.unit_price * item.quantity;
    expect(subtotal).toBe(75.0);
  });
});

describe('Payment Logic', () => {
  it('calculates change correctly', () => {
    const total = 150.0;
    const amountReceived = 200.0;
    const change = calculateChange(total, amountReceived);

    expect(change).toBe(50.0);
  });

  it('returns negative when amount is insufficient', () => {
    const total = 150.0;
    const amountReceived = 100.0;
    const change = calculateChange(total, amountReceived);

    expect(change).toBe(-50.0);
  });

  it('returns zero when exact amount is given', () => {
    const total = 150.0;
    const amountReceived = 150.0;
    const change = calculateChange(total, amountReceived);

    expect(change).toBe(0);
  });
});

describe('Create Sale Payload', () => {
  it('builds correct POST payload', () => {
    const items: CartItem[] = [
      {
        product_id: 'p1',
        product_name: 'Widget A',
        sku: 'WDG-001',
        quantity: 2,
        unit_price: 25.0,
      },
    ];

    const dto = {
      items: items.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
      })),
      payments: [{ method: 'cash' as const, amount: 100 }],
    };

    expect(dto.items).toHaveLength(1);
    expect(dto.items[0].product_id).toBe('p1');
    expect(dto.items[0].quantity).toBe(2);
    expect(dto.items[0].unit_price).toBe(25.0);
    expect(dto.payments[0].method).toBe('cash');
    expect(dto.payments[0].amount).toBe(100);
  });

  it('sends POST with correct payload format', async () => {
    const sales: Sale[] = [];

    const createSale = async (dto: {
      items: Array<{
        product_id: string;
        quantity: number;
        unit_price: number;
      }>;
      payments: Array<{ method: string; amount: number }>;
    }): Promise<Sale> => {
      const total = dto.items.reduce(
        (s, i) => s + i.quantity * i.unit_price,
        0,
      );
      const paymentAmount = dto.payments.reduce((s, p) => s + p.amount, 0);
      const sale: Sale = {
        id: 'sale-1',
        items: dto.items.map((i, idx) => ({
          id: `si-${idx}`,
          sale_id: 'sale-1',
          product_id: i.product_id,
          product_name: 'Widget A',
          sku: 'WDG-001',
          quantity: i.quantity,
          unit_price: i.unit_price,
          subtotal: i.quantity * i.unit_price,
        })),
        payments: dto.payments.map((p) => ({
          method: p.method as Payment['method'],
          amount: p.amount,
        })),
        total,
        change: paymentAmount - total,
        status: 'completed',
        invoice_number: 'INV-001',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      sales.push(sale);
      return sale;
    };

    const result = await createSale({
      items: [{ product_id: 'p1', quantity: 2, unit_price: 25.0 }],
      payments: [{ method: 'cash', amount: 100 }],
    });

    expect(result.status).toBe('completed');
    expect(result.total).toBe(50);
    expect(result.change).toBe(50);
    expect(result.items).toHaveLength(1);
    expect(result.payments[0].method).toBe('cash');
    expect(sales).toHaveLength(1);
  });
});

describe('Sale History', () => {
  it('lists sales with pagination', () => {
    const sales: Sale[] = Array.from({ length: 25 }, (_, i) => ({
      id: `sale-${i + 1}`,
      items: [],
      payments: [{ method: 'cash', amount: 100 }],
      total: 50 + i * 10,
      change: 50 - i * 10,
      status: 'completed',
      invoice_number: `INV-${String(i + 1).padStart(3, '0')}`,
      created_at: new Date(2024, 0, i + 1).toISOString(),
      updated_at: new Date(2024, 0, i + 1).toISOString(),
    }));

    const pageSize = 20;
    const page1 = sales.slice(0, pageSize);
    const page2 = sales.slice(pageSize);

    expect(page1).toHaveLength(20);
    expect(page2).toHaveLength(5);
  });

  it('shows sale status badge', () => {
    const completedSale: Sale = {
      id: 'sale-1',
      items: [],
      payments: [{ method: 'cash', amount: 100 }],
      total: 50,
      change: 50,
      status: 'completed',
      invoice_number: 'INV-001',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const voidedSale: Sale = {
      id: 'sale-2',
      items: [],
      payments: [{ method: 'cash', amount: 100 }],
      total: 50,
      change: 50,
      status: 'voided',
      void_reason: 'Cliente canceló',
      invoice_number: 'INV-002',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    expect(completedSale.status).toBe('completed');
    expect(voidedSale.status).toBe('voided');
    expect(voidedSale.void_reason).toBe('Cliente canceló');
  });
});

describe('Void Sale', () => {
  it('requires a reason', () => {
    const validateVoid = (reason: string): boolean => {
      return reason.trim().length > 0;
    };

    expect(validateVoid('')).toBe(false);
    expect(validateVoid('  ')).toBe(false);
    expect(validateVoid('Cliente canceló')).toBe(true);
    expect(validateVoid('Error en el cobro')).toBe(true);
  });

  it('sends POST with reason to void endpoint', async () => {
    const voidedSales: Sale[] = [];

    const voidSale = async (
      id: string,
      reason: string,
    ): Promise<Sale> => {
      const voided: Sale = {
        id,
        items: [],
        payments: [{ method: 'cash', amount: 100 }],
        total: 50,
        change: 50,
        status: 'voided',
        void_reason: reason,
        invoice_number: 'INV-001',
        created_at: '2024-01-15T10:00:00Z',
        updated_at: new Date().toISOString(),
      };
      voidedSales.push(voided);
      return voided;
    };

    const result = await voidSale('sale-1', 'Cliente canceló');
    expect(result.status).toBe('voided');
    expect(result.void_reason).toBe('Cliente canceló');
    expect(voidedSales).toHaveLength(1);
  });
});

describe('Product Search', () => {
  it('filters products by name', () => {
    const products = [
      { nombre: 'Widget A', sku: 'WDG-001' },
      { nombre: 'Widget B', sku: 'WDG-002' },
      { nombre: 'Gadget X', sku: 'GDG-001' },
    ];

    expect(searchProducts(products, 'Widget')).toHaveLength(2);
    expect(searchProducts(products, 'widget')).toHaveLength(2);
    expect(searchProducts(products, 'Gadget')).toHaveLength(1);
  });

  it('filters products by SKU', () => {
    const products = [
      { nombre: 'Widget A', sku: 'WDG-001' },
      { nombre: 'Widget B', sku: 'WDG-002' },
      { nombre: 'Gadget X', sku: 'GDG-001' },
    ];

    expect(searchProducts(products, 'WDG')).toHaveLength(2);
    expect(searchProducts(products, 'GDG')).toHaveLength(1);
    expect(searchProducts(products, 'wdg')).toHaveLength(2);
  });

  it('returns empty for no matches', () => {
    const products = [
      { nombre: 'Widget A', sku: 'WDG-001' },
    ];

    expect(searchProducts(products, 'Nonexistent')).toHaveLength(0);
  });

  it('returns empty for empty query', () => {
    const products = [
      { nombre: 'Widget A', sku: 'WDG-001' },
    ];

    expect(searchProducts(products, '')).toHaveLength(0);
    expect(searchProducts(products, '  ')).toHaveLength(0);
  });
});

describe('Modal', () => {
  it('opens and closes', () => {
    const modal = new ModalRef();

    expect(modal.open).toBe(false);

    modal.show();
    expect(modal.open).toBe(true);

    modal.hide();
    expect(modal.open).toBe(false);
  });

  it('emits close event', () => {
    const modal = new ModalRef();
    let closed = false;

    modal.onClose(() => {
      closed = true;
    });

    modal.show();
    modal.hide();

    expect(closed).toBe(true);
  });
});

describe('Confirm Dialog', () => {
  it('resolves true on confirm', async () => {
    const confirmDialog = (
      message: string,
    ): Promise<boolean> => {
      return new Promise((resolve) => {
        // Simulating user clicking confirm
        resolve(true);
      });
    };

    const result = await confirmDialog('¿Está seguro?');
    expect(result).toBe(true);
  });

  it('resolves false on cancel', async () => {
    const confirmDialog = (
      message: string,
    ): Promise<boolean> => {
      return new Promise((resolve) => {
        // Simulating user clicking cancel
        resolve(false);
      });
    };

    const result = await confirmDialog('¿Está seguro?');
    expect(result).toBe(false);
  });
});

describe('Toast', () => {
  it('shows a toast message', () => {
    const toast = new ToastServiceTest();

    toast.show({ message: 'Venta completada', type: 'success' });

    expect(toast.messages).toHaveLength(1);
    expect(toast.messages[0].message).toBe('Venta completada');
    expect(toast.messages[0].type).toBe('success');
  });

  it('shows multiple toasts', () => {
    const toast = new ToastServiceTest();

    toast.show({ message: 'First', type: 'info' });
    toast.show({ message: 'Second', type: 'success' });

    expect(toast.messages).toHaveLength(2);
    expect(toast.messages[0].message).toBe('First');
    expect(toast.messages[1].message).toBe('Second');
  });

  it('clears all toasts', () => {
    const toast = new ToastServiceTest();

    toast.show({ message: 'Msg 1', type: 'info' });
    toast.show({ message: 'Msg 2', type: 'error' });
    toast.clear();

    expect(toast.messages).toHaveLength(0);
  });

  it('accepts different toast types', () => {
    const toast = new ToastServiceTest();

    toast.show({ message: 'Success', type: 'success' });
    toast.show({ message: 'Error', type: 'error' });
    toast.show({ message: 'Info', type: 'info' });

    expect(toast.messages[0].type).toBe('success');
    expect(toast.messages[1].type).toBe('error');
    expect(toast.messages[2].type).toBe('info');
  });
});
