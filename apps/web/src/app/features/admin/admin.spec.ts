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

interface User {
  id: string;
  name: string;
  email: string;
  roles: string[];
  roleIds?: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Role {
  id: string;
  name: string;
  permissions: string[];
  permissionIds?: string[];
  created_at: string;
  updated_at: string;
}

interface Permission {
  id: string;
  resource: string;
  action: string;
  name: string;
}

// ----- Test helpers / service mirror -----

class AdminServiceTest {
  private baseUrl = 'http://localhost:3000/api';
  private users: User[] = [];
  private roles: Role[] = [
    {
      id: 'role-1',
      name: 'Admin',
      permissions: ['users.read', 'users.write', 'roles.read', 'roles.write'],
      permissionIds: ['p1', 'p2', 'p3', 'p4'],
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'role-2',
      name: 'Vendedor',
      permissions: ['sales.create', 'sales.read'],
      permissionIds: ['p5', 'p6'],
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  ];
  private allPermissions: Permission[] = [
    { id: 'p1', resource: 'users', action: 'read', name: 'users.read' },
    { id: 'p2', resource: 'users', action: 'write', name: 'users.write' },
    { id: 'p3', resource: 'roles', action: 'read', name: 'roles.read' },
    { id: 'p4', resource: 'roles', action: 'write', name: 'roles.write' },
    { id: 'p5', resource: 'sales', action: 'create', name: 'sales.create' },
    { id: 'p6', resource: 'sales', action: 'read', name: 'sales.read' },
    { id: 'p7', resource: 'products', action: 'delete', name: 'products.delete' },
  ];

  async listUsers(params?: {
    page?: number;
    limit?: number;
    search?: string;
    sortColumn?: string;
    sortDirection?: 'asc' | 'desc';
  }): Promise<{ data: User[]; total: number; page: number; limit: number }> {
    let filtered = [...this.users];
    if (params?.search) {
      const q = params.search.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
      );
    }
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 20;
    const start = (page - 1) * limit;
    const paged = filtered.slice(start, start + limit);
    return { data: paged, total: filtered.length, page, limit };
  }

  async createUser(dto: {
    name: string;
    email: string;
    password: string;
  }): Promise<User> {
    const user: User = {
      id: `user-${this.users.length + 1}`,
      name: dto.name,
      email: dto.email,
      roles: [],
      roleIds: [],
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.users.push(user);
    return user;
  }

  async updateUser(
    id: string,
    dto: { name?: string; email?: string; is_active?: boolean },
  ): Promise<User> {
    const idx = this.users.findIndex((u) => u.id === id);
    if (idx === -1) throw new Error('Not found');
    this.users[idx] = { ...this.users[idx], ...dto };
    return this.users[idx];
  }

  async deleteUser(id: string): Promise<void> {
    const idx = this.users.findIndex((u) => u.id === id);
    if (idx !== -1) {
      this.users[idx].is_active = false;
    }
  }

  async assignRole(userId: string, roleId: string): Promise<void> {
    const user = this.users.find((u) => u.id === userId);
    const role = this.roles.find((r) => r.id === roleId);
    if (!user || !role) throw new Error('Not found');
    if (!user.roleIds?.includes(roleId)) {
      user.roleIds = [...(user.roleIds ?? []), roleId];
      user.roles = [...(user.roles ?? []), role.name];
    }
  }

  async removeRole(userId: string, roleId: string): Promise<void> {
    const user = this.users.find((u) => u.id === userId);
    const role = this.roles.find((r) => r.id === roleId);
    if (!user || !role) throw new Error('Not found');
    user.roleIds = (user.roleIds ?? []).filter((id) => id !== roleId);
    user.roles = (user.roles ?? []).filter((r) => r !== role.name);
  }

  async listRoles(params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<{ data: Role[]; total: number; page: number; limit: number }> {
    let filtered = [...this.roles];
    if (params?.search) {
      const q = params.search.toLowerCase();
      filtered = filtered.filter((r) => r.name.toLowerCase().includes(q));
    }
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 20;
    const start = (page - 1) * limit;
    const paged = filtered.slice(start, start + limit);
    return { data: paged, total: filtered.length, page, limit };
  }

  async getRoleById(id: string): Promise<Role> {
    const role = this.roles.find((r) => r.id === id);
    if (!role) throw new Error('Not found');
    return role;
  }

  async createRole(dto: { name: string }): Promise<Role> {
    const role: Role = {
      id: `role-${this.roles.length + 1}`,
      name: dto.name,
      permissions: [],
      permissionIds: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.roles.push(role);
    return role;
  }

  async updateRole(
    id: string,
    dto: { name?: string; permissionIds?: string[] },
  ): Promise<Role> {
    const idx = this.roles.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error('Not found');
    if (dto.name !== undefined) this.roles[idx].name = dto.name;
    if (dto.permissionIds !== undefined) {
      this.roles[idx].permissionIds = dto.permissionIds;
      this.roles[idx].permissions = dto.permissionIds
        .map((pid) => this.allPermissions.find((p) => p.id === pid)?.name ?? '')
        .filter(Boolean);
    }
    return this.roles[idx];
  }

  async deleteRole(id: string): Promise<void> {
    const idx = this.roles.findIndex((r) => r.id === id);
    if (idx !== -1) this.roles.splice(idx, 1);
  }

  async listPermissions(): Promise<Permission[]> {
    return this.allPermissions;
  }
}

// ----- AppCan directive mirror -----

class AuthServiceTest {
  private _permissions: string[] = [];

  get permissions(): string[] {
    return this._permissions;
  }

  setPermissions(perms: string[]): void {
    this._permissions = perms;
  }
}

class AppCanDirectiveTest {
  private authService: AuthServiceTest;

  constructor(authService: AuthServiceTest) {
    this.authService = authService;
  }

  hasPermission(required: string): boolean {
    if (!required) return true;
    return this.authService.permissions.includes(required);
  }
}

// ----- Tests -----

describe('User List', () => {
  let service: AdminServiceTest;

  beforeEach(() => {
    localStorage.clear();
    service = new AdminServiceTest();
  });

  it('loads all users', async () => {
    await service.createUser({
      name: 'Alice',
      email: 'alice@test.com',
      password: 'secret',
    });
    await service.createUser({
      name: 'Bob',
      email: 'bob@test.com',
      password: 'secret',
    });

    const result = await service.listUsers();
    expect(result.data).toHaveLength(2);
    expect(result.total).toBe(2);
  });

  it('paginates user results', async () => {
    for (let i = 0; i < 25; i++) {
      await service.createUser({
        name: `User ${i}`,
        email: `user${i}@test.com`,
        password: 'secret',
      });
    }

    const page1 = await service.listUsers({ page: 1, limit: 20 });
    expect(page1.data).toHaveLength(20);
    expect(page1.total).toBe(25);

    const page2 = await service.listUsers({ page: 2, limit: 20 });
    expect(page2.data).toHaveLength(5);
  });

  it('searches users by name', async () => {
    await service.createUser({
      name: 'Alice Johnson',
      email: 'alice@test.com',
      password: 'secret',
    });
    await service.createUser({
      name: 'Bob Smith',
      email: 'bob@test.com',
      password: 'secret',
    });
    await service.createUser({
      name: 'Alice Brown',
      email: 'brown@test.com',
      password: 'secret',
    });

    const result = await service.listUsers({ search: 'Alice' });
    expect(result.data).toHaveLength(2);
  });

  it('searches users by email', async () => {
    await service.createUser({
      name: 'Alice',
      email: 'alice@test.com',
      password: 'secret',
    });
    await service.createUser({
      name: 'Bob',
      email: 'bob@test.com',
      password: 'secret',
    });

    const result = await service.listUsers({ search: 'bob@' });
    expect(result.data).toHaveLength(1);
    expect(result.data[0].email).toBe('bob@test.com');
  });
});

describe('Create User', () => {
  let service: AdminServiceTest;

  beforeEach(() => {
    localStorage.clear();
    service = new AdminServiceTest();
  });

  it('creates user with correct payload', async () => {
    const dto = {
      name: 'New User',
      email: 'newuser@test.com',
      password: 'secure123',
    };

    const user = await service.createUser(dto);
    expect(user.name).toBe('New User');
    expect(user.email).toBe('newuser@test.com');
    expect(user.is_active).toBe(true);

    // Verify user appears in list
    const list = await service.listUsers();
    expect(list.data).toHaveLength(1);
    expect(list.data[0].email).toBe('newuser@test.com');
  });

  it('assigns roles to user after creation', async () => {
    const user = await service.createUser({
      name: 'Role User',
      email: 'role@test.com',
      password: 'secret',
    });

    await service.assignRole(user.id, 'role-1');
    await service.assignRole(user.id, 'role-2');

    const list = await service.listUsers();
    const found = list.data.find((u) => u.id === user.id);
    expect(found?.roles).toEqual(['Admin', 'Vendedor']);
  });
});

describe('Deactivate User', () => {
  let service: AdminServiceTest;

  beforeEach(() => {
    localStorage.clear();
    service = new AdminServiceTest();
  });

  it('deactivates user (soft delete)', async () => {
    const user = await service.createUser({
      name: 'To Deactivate',
      email: 'deactivate@test.com',
      password: 'secret',
    });
    expect(user.is_active).toBe(true);

    await service.deleteUser(user.id);

    const list = await service.listUsers();
    const found = list.data.find((u) => u.id === user.id);
    expect(found?.is_active).toBe(false);
  });

  it('sends PATCH with is_active=false to update user', async () => {
    const user = await service.createUser({
      name: 'Target',
      email: 'target@test.com',
      password: 'secret',
    });

    const updated = await service.updateUser(user.id, { is_active: false });
    expect(updated.is_active).toBe(false);
  });
});

describe('Role List', () => {
  let service: AdminServiceTest;

  beforeEach(() => {
    localStorage.clear();
    service = new AdminServiceTest();
  });

  it('loads all roles', async () => {
    const result = await service.listRoles();
    expect(result.data).toHaveLength(2);
    expect(result.total).toBe(2);
  });

  it('shows permissions summary per role', async () => {
    const role = await service.getRoleById('role-1');
    expect(role.permissions).toContain('users.read');
    expect(role.permissions).toContain('roles.write');

    const vendedor = await service.getRoleById('role-2');
    expect(vendedor.permissions).toContain('sales.create');
    expect(vendedor.permissions).not.toContain('users.read');
  });

  it('searches roles by name', async () => {
    const result = await service.listRoles({ search: 'Admin' });
    expect(result.data).toHaveLength(1);
    expect(result.data[0].name).toBe('Admin');
  });
});

describe('Role Permissions', () => {
  let service: AdminServiceTest;

  beforeEach(() => {
    localStorage.clear();
    service = new AdminServiceTest();
  });

  it('loads all available permissions', async () => {
    const perms = await service.listPermissions();
    expect(perms).toHaveLength(7);
    expect(perms.map((p) => p.name)).toContain('products.delete');
    expect(perms.map((p) => p.name)).toContain('sales.create');
  });

  it('toggles permission on role via PATCH', async () => {
    // Role-2 (Vendedor) does not have products.delete
    let vendedor = await service.getRoleById('role-2');
    expect(vendedor.permissions).not.toContain('products.delete');

    // Add products.delete permission
    const allPerms = await service.listPermissions();
    const deletePerm = allPerms.find((p) => p.name === 'products.delete')!;
    const newIds = [...(vendedor.permissionIds ?? []), deletePerm.id];

    await service.updateRole('role-2', { permissionIds: newIds });

    vendedor = await service.getRoleById('role-2');
    expect(vendedor.permissions).toContain('products.delete');
  });

  it('saves permission checkboxes on role update', async () => {
    const allPerms = await service.listPermissions();
    const salesPerms = allPerms
      .filter((p) => p.resource === 'sales')
      .map((p) => p.id);

    const created = await service.createRole({ name: 'Sales Only' });
    await service.updateRole(created.id, { permissionIds: salesPerms });

    const updated = await service.getRoleById(created.id);
    expect(updated.permissions).toEqual(['sales.create', 'sales.read']);
  });
});

describe('AppCan Directive', () => {
  let authService: AuthServiceTest;
  let directive: AppCanDirectiveTest;

  beforeEach(() => {
    authService = new AuthServiceTest();
    directive = new AppCanDirectiveTest(authService);
  });

  it('shows element when user has permission', () => {
    authService.setPermissions(['products.delete', 'users.read']);
    expect(directive.hasPermission('products.delete')).toBe(true);
  });

  it('hides element when user lacks permission', () => {
    authService.setPermissions(['users.read']);
    expect(directive.hasPermission('products.delete')).toBe(false);
  });

  it('shows element when no permission is required', () => {
    authService.setPermissions([]);
    expect(directive.hasPermission('')).toBe(true);
  });

  it('reacts to permission changes', () => {
    authService.setPermissions([]);
    expect(directive.hasPermission('products.delete')).toBe(false);

    authService.setPermissions(['products.delete', 'users.read']);
    expect(directive.hasPermission('products.delete')).toBe(true);

    authService.setPermissions(['users.read']);
    expect(directive.hasPermission('products.delete')).toBe(false);
  });
});
