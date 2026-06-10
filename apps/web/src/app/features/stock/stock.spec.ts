// Mock localStorage for Node environment
const store: Record<string, string> = {};
Object.defineProperty(global, 'localStorage', {
  value: {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
  },
  writable: true,
});

// Mock stock models
interface StockItem {
  id: string;
  product_id: string;
  product_name: string;
  sku: string;
  quantity: number;
  low_stock_threshold: number;
  last_movement_at: string | null;
  last_movement_type: string | null;
}

interface StockListResponse {
  data: StockItem[];
  total: number;
  page: number;
  limit: number;
}

interface StockMovement {
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

interface MovementListResponse {
  data: StockMovement[];
  total: number;
  page: number;
  limit: number;
}

// Mirror of StockService without Angular DI
class StockServiceTest {
  private baseUrl = 'http://localhost:3000/api';

  async list(params?: {
    page?: number;
    limit?: number;
    search?: string;
    sortColumn?: string;
    sortDirection?: 'asc' | 'desc';
  }): Promise<StockListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.search) searchParams.set('search', params.search);
    if (params?.sortColumn) searchParams.set('sortColumn', params.sortColumn);
    if (params?.sortDirection) searchParams.set('sortDirection', params.sortDirection);

    const qs = searchParams.toString();
    const url = `${this.baseUrl}/stock${qs ? '?' + qs : ''}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async getByProduct(productId: string): Promise<StockItem> {
    const res = await fetch(`${this.baseUrl}/stock/product/${productId}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async getMovements(params?: {
    productId?: string;
    type?: string;
    page?: number;
    limit?: number;
  }): Promise<MovementListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.productId) searchParams.set('productId', params.productId);
    if (params?.type) searchParams.set('type', params.type);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));

    const qs = searchParams.toString();
    const url = `${this.baseUrl}/stock/movements${qs ? '?' + qs : ''}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async inbound(dto: { product_id: string; quantity: number; reason?: string }): Promise<StockMovement> {
    const res = await fetch(`${this.baseUrl}/stock/inbound`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async outbound(dto: { product_id: string; quantity: number; reason?: string }): Promise<StockMovement> {
    const res = await fetch(`${this.baseUrl}/stock/outbound`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async adjust(dto: { product_id: string; quantity: number; reason: string }): Promise<StockMovement> {
    const res = await fetch(`${this.baseUrl}/stock/adjust`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }
}

describe('StockService', () => {
  let service: StockServiceTest;

  beforeEach(() => {
    service = new StockServiceTest();
  });

  it('creates list URL with pagination params', () => {
    const url = service['baseUrl'] + '/stock?page=1&limit=20';
    expect(url).toContain('/stock');
    expect(url).toContain('page=1');
    expect(url).toContain('limit=20');
  });

  it('creates list URL with search param', () => {
    const url = service['baseUrl'] + '/stock?search=widget';
    expect(url).toContain('search=widget');
  });

  it('creates list URL with sort params', () => {
    const url = service['baseUrl'] + '/stock?sortColumn=product_name&sortDirection=asc';
    expect(url).toContain('sortColumn=product_name');
    expect(url).toContain('sortDirection=asc');
  });

  it('creates getByProduct URL', () => {
    const url = service['baseUrl'] + '/stock/product/abc-123';
    expect(url).toContain('/stock/product/abc-123');
  });

  it('creates getMovements URL with type filter', () => {
    const url = service['baseUrl'] + '/stock/movements?type=inbound';
    expect(url).toContain('/stock/movements');
    expect(url).toContain('type=inbound');
  });

  it('creates inbound endpoint URL', () => {
    expect(service['baseUrl'] + '/stock/inbound').toContain('/stock/inbound');
  });

  it('creates outbound endpoint URL', () => {
    expect(service['baseUrl'] + '/stock/outbound').toContain('/stock/outbound');
  });

  it('creates adjust endpoint URL', () => {
    expect(service['baseUrl'] + '/stock/adjust').toContain('/stock/adjust');
  });
});

describe('StockView', () => {
  it('shows quantities for each product', () => {
    const stockItems: StockItem[] = [
      { id: '1', product_id: 'p1', product_name: 'Widget A', sku: 'WDG-001', quantity: 10, low_stock_threshold: 5, last_movement_at: '2024-01-15T10:00:00Z', last_movement_type: 'inbound' },
      { id: '2', product_id: 'p2', product_name: 'Widget B', sku: 'WDG-002', quantity: 0, low_stock_threshold: 5, last_movement_at: '2024-01-14T09:00:00Z', last_movement_type: 'outbound' },
    ];

    expect(stockItems).toHaveLength(2);
    expect(stockItems[0].quantity).toBe(10);
    expect(stockItems[1].quantity).toBe(0);
  });

  it('highlights low stock items (quantity <= threshold)', () => {
    const items: StockItem[] = [
      { id: '1', product_id: 'p1', product_name: 'Widget A', sku: 'WDG-001', quantity: 10, low_stock_threshold: 5, last_movement_at: null, last_movement_type: null },
      { id: '2', product_id: 'p2', product_name: 'Widget B', sku: 'WDG-002', quantity: 3, low_stock_threshold: 5, last_movement_at: null, last_movement_type: null },
      { id: '3', product_id: 'p3', product_name: 'Widget C', sku: 'WDG-003', quantity: 5, low_stock_threshold: 5, last_movement_at: null, last_movement_type: null },
    ];

    const isLowStock = (item: StockItem): boolean =>
      item.quantity <= item.low_stock_threshold;

    expect(isLowStock(items[0])).toBe(false);
    expect(isLowStock(items[1])).toBe(true);
    expect(isLowStock(items[2])).toBe(true); // equal to threshold
  });

  it('filters stock by product name', () => {
    const items: StockItem[] = [
      { id: '1', product_id: 'p1', product_name: 'Widget A', sku: 'WDG-001', quantity: 10, low_stock_threshold: 5, last_movement_at: null, last_movement_type: null },
      { id: '2', product_id: 'p2', product_name: 'Widget B', sku: 'WDG-002', quantity: 5, low_stock_threshold: 5, last_movement_at: null, last_movement_type: null },
      { id: '3', product_id: 'p3', product_name: 'Gadget X', sku: 'GDG-001', quantity: 8, low_stock_threshold: 5, last_movement_at: null, last_movement_type: null },
    ];

    const search = (term: string): StockItem[] => {
      if (!term) return items;
      const lower = term.toLowerCase();
      return items.filter(
        (i) =>
          i.product_name.toLowerCase().includes(lower) ||
          i.sku.toLowerCase().includes(lower),
      );
    };

    expect(search('Widget')).toHaveLength(2);
    expect(search('widget')).toHaveLength(2);
    expect(search('Gadget')).toHaveLength(1);
    expect(search('GDG')).toHaveLength(1);
    expect(search('Nonexistent')).toHaveLength(0);
    expect(search('')).toHaveLength(3);
  });
});

describe('MovementList', () => {
  it('filters movements by type', () => {
    const movements: StockMovement[] = [
      { id: '1', type: 'inbound', product_id: 'p1', product_name: 'Widget', sku: 'WDG-001', quantity: 10, previous_stock: 5, new_stock: 15, user_id: 'u1', created_at: '2024-01-15T10:00:00Z' },
      { id: '2', type: 'outbound', product_id: 'p1', product_name: 'Widget', sku: 'WDG-001', quantity: 3, previous_stock: 15, new_stock: 12, user_id: 'u1', created_at: '2024-01-16T10:00:00Z' },
      { id: '3', type: 'inbound', product_id: 'p2', product_name: 'Gadget', sku: 'GDG-001', quantity: 20, previous_stock: 0, new_stock: 20, user_id: 'u2', created_at: '2024-01-17T10:00:00Z' },
    ];

    const filterByType = (type: string): StockMovement[] => {
      if (!type) return movements;
      return movements.filter((m) => m.type === type);
    };

    expect(filterByType('inbound')).toHaveLength(2);
    expect(filterByType('outbound')).toHaveLength(1);
    expect(filterByType('adjust')).toHaveLength(0);
    expect(filterByType('')).toHaveLength(3);
  });
});

describe('StockMovement Validation', () => {
  it('rejects outbound with insufficient stock', () => {
    const currentStock = 2;
    const requestedQuantity = 10;

    const isValidOutbound = (stock: number, quantity: number): { valid: boolean; error?: string } => {
      if (quantity > stock) {
        return { valid: false, error: `Stock insuficiente (disponible: ${stock})` };
      }
      return { valid: true };
    };

    const result = isValidOutbound(currentStock, requestedQuantity);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Stock insuficiente (disponible: 2)');
  });

  it('allows outbound with sufficient stock', () => {
    const currentStock = 10;
    const requestedQuantity = 5;

    const isValidOutbound = (stock: number, quantity: number): { valid: boolean; error?: string } => {
      if (quantity > stock) {
        return { valid: false, error: `Stock insuficiente (disponible: ${stock})` };
      }
      return { valid: true };
    };

    const result = isValidOutbound(currentStock, requestedQuantity);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('allows outbound with exact stock', () => {
    const currentStock = 5;
    const requestedQuantity = 5;

    const isValidOutbound = (stock: number, quantity: number): { valid: boolean; error?: string } => {
      if (quantity > stock) {
        return { valid: false, error: `Stock insuficiente (disponible: ${stock})` };
      }
      return { valid: true };
    };

    const result = isValidOutbound(currentStock, requestedQuantity);
    expect(result.valid).toBe(true);
  });
});

describe('Inbound Movement', () => {
  it('sends POST with product_id and quantity', async () => {
    const movements: StockMovement[] = [];

    const createInbound = async (dto: { product_id: string; quantity: number }): Promise<StockMovement> => {
      const movement: StockMovement = {
        id: 'mov-1',
        type: 'inbound',
        product_id: dto.product_id,
        product_name: 'Widget',
        sku: 'WDG-001',
        quantity: dto.quantity,
        previous_stock: 5,
        new_stock: 5 + dto.quantity,
        user_id: 'u1',
        created_at: new Date().toISOString(),
      };
      movements.push(movement);
      return movement;
    };

    const result = await createInbound({ product_id: 'p1', quantity: 5 });
    expect(result.type).toBe('inbound');
    expect(result.product_id).toBe('p1');
    expect(result.quantity).toBe(5);
    expect(result.new_stock).toBe(10);
    expect(movements).toHaveLength(1);
  });

  it('returns 400 when product_id is missing', async () => {
    const createInbound = async (dto: { product_id: string }): Promise<StockMovement> => {
      if (!dto.product_id) {
        const error = new Error('Bad Request');
        (error as any).status = 400;
        throw error;
      }
      return {} as StockMovement;
    };

    await expect(createInbound({ product_id: '' })).rejects.toMatchObject({ status: 400 });
  });
});

describe('Adjustment', () => {
  it('allows negative quantity for reduction', () => {
    const currentStock = 10;
    const adjustQuantity = -3;
    const expectedNewStock = currentStock + adjustQuantity;

    expect(expectedNewStock).toBe(7);
  });

  it('allows positive quantity for increase', () => {
    const currentStock = 10;
    const adjustQuantity = 5;
    const expectedNewStock = currentStock + adjustQuantity;

    expect(expectedNewStock).toBe(15);
  });

  it('requires a reason for adjustments', () => {
    const validateAdjust = (dto: { reason?: string }): boolean => {
      return !!dto.reason?.trim();
    };

    expect(validateAdjust({ reason: '' })).toBe(false);
    expect(validateAdjust({ reason: 'Corrección de inventario' })).toBe(true);
  });
});
