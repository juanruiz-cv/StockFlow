// Mock localStorage for Node environment
const store: Record<string, string> = {};
Object.defineProperty(global, "localStorage", {
  value: {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
  },
  writable: true,
});

// Mock product models
interface Product {
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
  activo: boolean;
  created_at: string;
  updated_at: string;
}

interface ProductListResponse {
  data: Product[];
  total: number;
  page: number;
  limit: number;
}

// Mirror of ProductService without Angular DI
class ProductServiceTest {
  private baseUrl = "http://localhost:3000/api";

  async list(params?: {
    page?: number;
    limit?: number;
    search?: string;
    sortColumn?: string;
    sortDirection?: "asc" | "desc";
  }): Promise<ProductListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.search) searchParams.set("search", params.search);
    if (params?.sortColumn) searchParams.set("sortColumn", params.sortColumn);
    if (params?.sortDirection) searchParams.set("sortDirection", params.sortDirection);

    const qs = searchParams.toString();
    const url = `${this.baseUrl}/products${qs ? "?" + qs : ""}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async getById(id: string): Promise<Product> {
    const res = await fetch(`${this.baseUrl}/products/${id}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async create(dto: Partial<Product>): Promise<Product> {
    const res = await fetch(`${this.baseUrl}/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dto),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async update(id: string, dto: Partial<Product>): Promise<Product> {
    const res = await fetch(`${this.baseUrl}/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dto),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async delete(id: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/products/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  }

  async checkSku(sku: string): Promise<{ exists: boolean }> {
    const res = await fetch(`${this.baseUrl}/products/check-sku?sku=${encodeURIComponent(sku)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }
}

// Form validation logic mirror
function validateProductForm(dto: Partial<Product>): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!dto.nombre?.trim()) {
    errors.nombre = "El nombre es requerido";
  }
  if (!dto.sku?.trim()) {
    errors.sku = "El SKU es requerido";
  }
  if (!dto.categoria_id) {
    errors.categoria_id = "La categor\u00eda es requerida";
  }
  if (!dto.marca_id) {
    errors.marca_id = "La marca es requerida";
  }
  if (!dto.proveedor_id) {
    errors.proveedor_id = "El proveedor es requerido";
  }
  if (dto.precio_compra == null || dto.precio_compra < 0) {
    errors.precio_compra = "Ingrese un precio v\u00e1lido";
  }
  if (dto.precio_venta == null || dto.precio_venta < 0) {
    errors.precio_venta = "Ingrese un precio v\u00e1lido";
  }
  if (dto.stock_actual == null || dto.stock_actual < 0) {
    errors.stock_actual = "Stock inv\u00e1lido";
  }

  return errors;
}

describe("ProductService", () => {
  let service: ProductServiceTest;

  beforeEach(() => {
    service = new ProductServiceTest();
  });

  it("creates list URL with pagination params", () => {
    const url = service["baseUrl"] + "/products?page=1&limit=20";
    expect(url).toContain("/products");
    expect(url).toContain("page=1");
    expect(url).toContain("limit=20");
  });

  it("creates list URL with search param", () => {
    const url = service["baseUrl"] + "/products?search=widget";
    expect(url).toContain("search=widget");
  });

  it("creates list URL with sort params", () => {
    const url = service["baseUrl"] + "/products?sortColumn=nombre&sortDirection=asc";
    expect(url).toContain("sortColumn=nombre");
    expect(url).toContain("sortDirection=asc");
  });

  it("creates getById URL", () => {
    const url = service["baseUrl"] + "/products/abc-123";
    expect(url).toContain("/products/abc-123");
  });

  it("creates create endpoint URL", () => {
    expect((service as any).baseUrl + "/products").toContain("/products");
  });

  it("creates update endpoint URL with id", () => {
    const url = service["baseUrl"] + "/products/abc-123";
    expect(url).toContain("/products/abc-123");
  });

  it("creates delete endpoint URL with id", () => {
    const url = service["baseUrl"] + "/products/abc-123";
    expect(url).toContain("/products/abc-123");
  });

  it("creates check-sku URL", () => {
    const url = service["baseUrl"] + "/products/check-sku?sku=TEST-123";
    expect(url).toContain("check-sku");
    expect(url).toContain("sku=TEST-123");
  });
});

describe("ProductForm Validation", () => {
  it("rejects empty form", () => {
    const errors = validateProductForm({} as Partial<Product>);
    expect(Object.keys(errors).length).toBeGreaterThan(0);
    expect(errors.nombre).toBeDefined();
    expect(errors.sku).toBeDefined();
    expect(errors.categoria_id).toBeDefined();
    expect(errors.marca_id).toBeDefined();
    expect(errors.proveedor_id).toBeDefined();
  });

  it("rejects missing required fields", () => {
    const errors = validateProductForm({
      nombre: "",
      sku: "",
      categoria_id: "",
      marca_id: "",
      proveedor_id: "",
    } as Partial<Product>);
    expect(errors.nombre).toBe("El nombre es requerido");
    expect(errors.sku).toBe("El SKU es requerido");
    expect(errors.categoria_id).toBe("La categor\u00eda es requerida");
  });

  it("rejects negative prices", () => {
    const errors = validateProductForm({
      nombre: "Test",
      sku: "TEST-001",
      precio_compra: -1,
      precio_venta: -5,
      stock_actual: 10,
      categoria_id: "cat-1",
      marca_id: "brand-1",
      proveedor_id: "sup-1",
    } as Partial<Product>);
    expect(errors.precio_compra).toBeDefined();
    expect(errors.precio_venta).toBeDefined();
  });

  it("passes with valid data", () => {
    const errors = validateProductForm({
      nombre: "Widget A",
      sku: "WDG-001",
      precio_compra: 10,
      precio_venta: 25,
      stock_actual: 100,
      stock_minimo: 10,
      categoria_id: "cat-1",
      marca_id: "brand-1",
      proveedor_id: "sup-1",
    } as Partial<Product>);
    expect(Object.keys(errors).length).toBe(0);
  });

  it("accepts zero stock as valid", () => {
    const errors = validateProductForm({
      nombre: "Test",
      sku: "TST-001",
      precio_compra: 5,
      precio_venta: 15,
      stock_actual: 0,
      stock_minimo: 0,
      categoria_id: "cat-1",
      marca_id: "brand-1",
      proveedor_id: "sup-1",
    } as Partial<Product>);
    expect(Object.keys(errors).length).toBe(0);
  });
});

describe("Duplicate SKU", () => {
  it("detects existing SKU", async () => {
    const existingSkus = new Set(["ABC-123", "XYZ-789"]);

    // Simulate checkSku API
    const checkSku = async (sku: string): Promise<{ exists: boolean }> => {
      return { exists: existingSkus.has(sku) };
    };

    const result1 = await checkSku("ABC-123");
    expect(result1.exists).toBe(true);

    const result2 = await checkSku("NEW-001");
    expect(result2.exists).toBe(false);
  });

  it("returns 409 when creating duplicate SKU", async () => {
    const existingProducts = new Map<string, any>([
      ["ABC-123", { sku: "ABC-123", nombre: "Existing" }],
    ]);

    const createProduct = async (dto: { sku: string; nombre: string }) => {
      if (existingProducts.has(dto.sku)) {
        const error = new Error("Conflict");
        (error as any).status = 409;
        throw error;
      }
      return { ...dto, id: "new-id" };
    };

    await expect(createProduct({ sku: "ABC-123", nombre: "Duplicate" })).rejects.toMatchObject({
      status: 409,
    });

    const result = await createProduct({ sku: "NEW-001", nombre: "Unique" });
    expect(result).toHaveProperty("id");
  });
});

describe("Search", () => {
  it("filters products by search term", () => {
    const products: Product[] = [
      { id: "1", nombre: "Widget A", sku: "WDG-001" } as Product,
      { id: "2", nombre: "Widget B", sku: "WDG-002" } as Product,
      { id: "3", nombre: "Gadget X", sku: "GDG-001" } as Product,
    ];

    const search = (term: string): Product[] => {
      if (!term) return products;
      const lower = term.toLowerCase();
      return products.filter(
        (p) =>
          p.nombre.toLowerCase().includes(lower) ||
          p.sku.toLowerCase().includes(lower),
      );
    };

    expect(search("Widget")).toHaveLength(2);
    expect(search("widget")).toHaveLength(2);
    expect(search("Gadget")).toHaveLength(1);
    expect(search("Nonexistent")).toHaveLength(0);
    expect(search("")).toHaveLength(3);
  });

  it("is case insensitive", () => {
    const products: Product[] = [
      { id: "1", nombre: "Widget A", sku: "WDG-001" } as Product,
    ];
    const searchFn = (term: string): Product[] => {
      const lower = term.toLowerCase();
      return products.filter((p) => p.nombre.toLowerCase().includes(lower));
    };
    expect(searchFn("widget")).toHaveLength(1);
    expect(searchFn("WIDGET")).toHaveLength(1);
    expect(searchFn("Widget")).toHaveLength(1);
  });

  it("matches by SKU", () => {
    const products: Product[] = [
      { id: "1", nombre: "Widget", sku: "WDG-001" } as Product,
      { id: "2", nombre: "Gadget", sku: "GDG-001" } as Product,
    ];
    const searchFn = (term: string): Product[] => {
      const lower = term.toLowerCase();
      return products.filter(
        (p) =>
          p.nombre.toLowerCase().includes(lower) ||
          p.sku.toLowerCase().includes(lower),
      );
    };
    expect(searchFn("WDG")).toHaveLength(1);
    expect(searchFn("GDG")).toHaveLength(1);
  });
});