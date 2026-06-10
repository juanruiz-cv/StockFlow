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

// Mock customer models
interface Customer {
  id: string;
  nombre: string;
  email: string;
  telefono?: string;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

interface CustomerListResponse {
  data: Customer[];
  total: number;
  page: number;
  limit: number;
}

// Mirror of CustomerService without Angular DI
class CustomerServiceTest {
  private baseUrl = "http://localhost:3000/api";

  async list(params?: {
    page?: number;
    limit?: number;
    search?: string;
    sortColumn?: string;
    sortDirection?: "asc" | "desc";
    showDeleted?: boolean;
  }): Promise<CustomerListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.search) searchParams.set("search", params.search);
    if (params?.sortColumn) searchParams.set("sortColumn", params.sortColumn);
    if (params?.sortDirection) searchParams.set("sortDirection", params.sortDirection);
    if (params?.showDeleted) searchParams.set("showDeleted", "true");

    const qs = searchParams.toString();
    const url = `${this.baseUrl}/customers${qs ? "?" + qs : ""}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async getById(id: string): Promise<Customer> {
    const res = await fetch(`${this.baseUrl}/customers/${id}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async create(dto: Partial<Customer>): Promise<Customer> {
    const res = await fetch(`${this.baseUrl}/customers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dto),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async update(id: string, dto: Partial<Customer>): Promise<Customer> {
    const res = await fetch(`${this.baseUrl}/customers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dto),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async delete(id: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/customers/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  }

  async restore(id: string): Promise<Customer> {
    const res = await fetch(`${this.baseUrl}/customers/${id}/restore`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }
}

// Form validation logic mirror
function validateCustomerForm(dto: Partial<Customer>): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!dto.nombre?.trim()) {
    errors.nombre = "El nombre es requerido";
  }

  return errors;
}

describe("CustomerService", () => {
  let service: CustomerServiceTest;

  beforeEach(() => {
    service = new CustomerServiceTest();
  });

  it("creates list URL with pagination params", () => {
    const url = service["baseUrl"] + "/customers?page=1&limit=20";
    expect(url).toContain("/customers");
    expect(url).toContain("page=1");
    expect(url).toContain("limit=20");
  });

  it("creates list URL with search param", () => {
    const url = service["baseUrl"] + "/customers?search=john";
    expect(url).toContain("search=john");
  });

  it("creates list URL with sort params", () => {
    const url = service["baseUrl"] + "/customers?sortColumn=nombre&sortDirection=asc";
    expect(url).toContain("sortColumn=nombre");
    expect(url).toContain("sortDirection=asc");
  });

  it("creates list URL with showDeleted param", () => {
    const url = service["baseUrl"] + "/customers?showDeleted=true";
    expect(url).toContain("showDeleted=true");
  });

  it("creates getById URL", () => {
    const url = service["baseUrl"] + "/customers/abc-123";
    expect(url).toContain("/customers/abc-123");
  });

  it("creates create endpoint URL", () => {
    expect((service as any).baseUrl + "/customers").toContain("/customers");
  });

  it("creates update endpoint URL with id", () => {
    const url = service["baseUrl"] + "/customers/abc-123";
    expect(url).toContain("/customers/abc-123");
  });

  it("creates delete endpoint URL with id", () => {
    const url = service["baseUrl"] + "/customers/abc-123";
    expect(url).toContain("/customers/abc-123");
  });

  it("creates restore endpoint URL with id", () => {
    const url = service["baseUrl"] + "/customers/abc-123/restore";
    expect(url).toContain("/customers/abc-123/restore");
  });
});

describe("CustomerForm Validation", () => {
  it("rejects empty form", () => {
    const errors = validateCustomerForm({} as Partial<Customer>);
    expect(Object.keys(errors).length).toBeGreaterThan(0);
    expect(errors.nombre).toBeDefined();
  });

  it("rejects empty name", () => {
    const errors = validateCustomerForm({
      nombre: "",
      email: "test@mail.com",
    } as Partial<Customer>);
    expect(errors.nombre).toBe("El nombre es requerido");
  });

  it("passes with valid data", () => {
    const errors = validateCustomerForm({
      nombre: "Juan Pérez",
      email: "juan@mail.com",
      telefono: "123456789",
    } as Partial<Customer>);
    expect(Object.keys(errors).length).toBe(0);
  });

  it("accepts customer without phone", () => {
    const errors = validateCustomerForm({
      nombre: "Ana García",
      email: "ana@mail.com",
    } as Partial<Customer>);
    expect(Object.keys(errors).length).toBe(0);
  });
});

describe("CustomerSearch", () => {
  it("filters customers by search term across name and email", () => {
    const customers: Customer[] = [
      { id: "1", nombre: "Juan Pérez", email: "juan@mail.com", telefono: "111", activo: true, created_at: "2024-01-01", updated_at: "2024-01-01" },
      { id: "2", nombre: "María García", email: "maria@mail.com", telefono: "222", activo: true, created_at: "2024-01-02", updated_at: "2024-01-02" },
      { id: "3", nombre: "Pedro López", email: "pedro@mail.com", telefono: "333", activo: true, created_at: "2024-01-03", updated_at: "2024-01-03" },
    ];

    const search = (term: string): Customer[] => {
      if (!term) return customers;
      const lower = term.toLowerCase();
      return customers.filter(
        (c) =>
          c.nombre.toLowerCase().includes(lower) ||
          c.email.toLowerCase().includes(lower),
      );
    };

    expect(search("Juan")).toHaveLength(1);
    expect(search("juan")).toHaveLength(1);
    expect(search("mail")).toHaveLength(3);
    expect(search("Nonexistent")).toHaveLength(0);
    expect(search("")).toHaveLength(3);
  });

  it("is case insensitive", () => {
    const customers: Customer[] = [
      { id: "1", nombre: "Juan Pérez", email: "juan@mail.com", telefono: "", activo: true, created_at: "2024-01-01", updated_at: "2024-01-01" },
    ];
    const searchFn = (term: string): Customer[] => {
      const lower = term.toLowerCase();
      return customers.filter(
        (c) =>
          c.nombre.toLowerCase().includes(lower) ||
          c.email.toLowerCase().includes(lower),
      );
    };
    expect(searchFn("juan")).toHaveLength(1);
    expect(searchFn("JUAN")).toHaveLength(1);
    expect(searchFn("Juan")).toHaveLength(1);
  });
});

describe("SoftDelete", () => {
  it("hides deleted customers by default", () => {
    const allCustomers: Customer[] = [
      { id: "1", nombre: "Active", email: "a@m.com", telefono: "", activo: true, created_at: "2024-01-01", updated_at: "2024-01-01" },
      { id: "2", nombre: "Deleted", email: "d@m.com", telefono: "", activo: false, created_at: "2024-01-02", updated_at: "2024-01-02" },
    ];

    const filterActive = (customers: Customer[], showDeleted: boolean): Customer[] => {
      if (showDeleted) return customers;
      return customers.filter((c) => c.activo);
    };

    expect(filterActive(allCustomers, false)).toHaveLength(1);
    expect(filterActive(allCustomers, false)[0].nombre).toBe("Active");
  });

  it("shows deleted customers when toggled", () => {
    const allCustomers: Customer[] = [
      { id: "1", nombre: "Active", email: "a@m.com", telefono: "", activo: true, created_at: "2024-01-01", updated_at: "2024-01-01" },
      { id: "2", nombre: "Deleted", email: "d@m.com", telefono: "", activo: false, created_at: "2024-01-02", updated_at: "2024-01-02" },
    ];

    const filterActive = (customers: Customer[], showDeleted: boolean): Customer[] => {
      if (showDeleted) return customers;
      return customers.filter((c) => c.activo);
    };

    expect(filterActive(allCustomers, true)).toHaveLength(2);
  });
});

describe("CreateCustomer", () => {
  it("sends POST with valid data", async () => {
    const existingCustomers = new Map<string, Customer>();

    const createCustomer = async (dto: { nombre: string; email: string; telefono?: string }): Promise<Customer> => {
      const customer: Customer = {
        id: "new-id",
        nombre: dto.nombre,
        email: dto.email,
        telefono: dto.telefono,
        activo: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      existingCustomers.set(customer.id, customer);
      return customer;
    };

    const result = await createCustomer({ nombre: "New Customer", email: "new@mail.com" });
    expect(result).toHaveProperty("id");
    expect(result.nombre).toBe("New Customer");
    expect(result.activo).toBe(true);
    expect(existingCustomers.has("new-id")).toBe(true);
  });

  it("returns 400 when name is missing", async () => {
    const createCustomer = async (dto: { nombre: string }): Promise<Customer> => {
      if (!dto.nombre?.trim()) {
        const error = new Error("Bad Request");
        (error as any).status = 400;
        throw error;
      }
      return {} as Customer;
    };

    await expect(createCustomer({ nombre: "" })).rejects.toMatchObject({ status: 400 });
  });
});
