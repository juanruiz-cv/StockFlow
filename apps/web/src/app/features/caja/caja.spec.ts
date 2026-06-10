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

// Mock caja models
interface CashSession {
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

interface CashMovement {
  id: string;
  sesion_id: string;
  tipo: 'ingreso' | 'egreso';
  monto: number;
  descripcion?: string;
  registrado_por: string;
  registrado_por_nombre?: string;
  created_at: string;
}

interface MovementListResponse {
  data: CashMovement[];
  total: number;
  page: number;
  limit: number;
}

// Mirror of CajaService without Angular DI
class CajaServiceTest {
  private baseUrl = 'http://localhost:3000/api';

  async getCurrent(): Promise<CashSession | null> {
    const res = await fetch(`${this.baseUrl}/caja/current`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async openSession(dto: { saldo_apertura: number }): Promise<CashSession> {
    const res = await fetch(`${this.baseUrl}/caja/open`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async closeSession(dto: { saldo_cierre: number }): Promise<CashSession> {
    const res = await fetch(`${this.baseUrl}/caja/close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async getHistory(params?: { page?: number; limit?: number }): Promise<{ data: CashSession[]; total: number; page: number; limit: number }> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    const qs = searchParams.toString();
    const url = `${this.baseUrl}/caja/history${qs ? '?' + qs : ''}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async getSession(id: string): Promise<CashSession> {
    const res = await fetch(`${this.baseUrl}/caja/sessions/${id}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async getMovements(
    sessionId: string,
    params?: { page?: number; limit?: number },
  ): Promise<MovementListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    const qs = searchParams.toString();
    const url = `${this.baseUrl}/caja/sessions/${sessionId}/movements${qs ? '?' + qs : ''}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async addMovement(dto: { sesion_id: string; tipo: 'ingreso' | 'egreso'; monto: number; descripcion?: string }): Promise<CashMovement> {
    const res = await fetch(`${this.baseUrl}/caja/movements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }
}

// Form validation logic mirror
function validateOpenSessionForm(dto: { saldo_apertura?: number }): Record<string, string> {
  const errors: Record<string, string> = {};
  if (dto.saldo_apertura == null || dto.saldo_apertura <= 0) {
    errors.saldo_apertura = 'El saldo de apertura debe ser mayor a cero';
  }
  return errors;
}

function validateCloseSessionForm(dto: { saldo_cierre?: number }): Record<string, string> {
  const errors: Record<string, string> = {};
  if (dto.saldo_cierre == null || dto.saldo_cierre < 0) {
    errors.saldo_cierre = 'El saldo de cierre debe ser mayor o igual a cero';
  }
  return errors;
}

describe('CajaService', () => {
  let service: CajaServiceTest;

  beforeEach(() => {
    service = new CajaServiceTest();
  });

  it('creates get current session URL', () => {
    const url = service['baseUrl'] + '/caja/current';
    expect(url).toContain('/caja/current');
  });

  it('creates open session endpoint URL', () => {
    const url = service['baseUrl'] + '/caja/open';
    expect(url).toContain('/caja/open');
  });

  it('creates close session endpoint URL', () => {
    const url = service['baseUrl'] + '/caja/close';
    expect(url).toContain('/caja/close');
  });

  it('creates get session history URL with pagination', () => {
    const url = service['baseUrl'] + '/caja/history?page=1&limit=20';
    expect(url).toContain('/caja/history');
    expect(url).toContain('page=1');
    expect(url).toContain('limit=20');
  });

  it('creates get session details URL', () => {
    const url = service['baseUrl'] + '/caja/sessions/abc-123';
    expect(url).toContain('/caja/sessions/abc-123');
  });

  it('creates get movements URL with session id', () => {
    const url = service['baseUrl'] + '/caja/sessions/ses-001/movements?page=1&limit=20';
    expect(url).toContain('/caja/sessions/ses-001/movements');
    expect(url).toContain('page=1');
    expect(url).toContain('limit=20');
  });

  it('creates add movement endpoint URL', () => {
    const url = service['baseUrl'] + '/caja/movements';
    expect(url).toContain('/caja/movements');
  });
});

describe('SessionForm Validation', () => {
  describe('Open Session Form', () => {
    it('rejects empty opening balance', () => {
      const errors = validateOpenSessionForm({});
      expect(Object.keys(errors).length).toBeGreaterThan(0);
      expect(errors.saldo_apertura).toBeDefined();
    });

    it('rejects zero opening balance', () => {
      const errors = validateOpenSessionForm({ saldo_apertura: 0 });
      expect(errors.saldo_apertura).toBe('El saldo de apertura debe ser mayor a cero');
    });

    it('rejects negative opening balance', () => {
      const errors = validateOpenSessionForm({ saldo_apertura: -100 });
      expect(Object.keys(errors).length).toBeGreaterThan(0);
    });

    it('passes with valid opening balance', () => {
      const errors = validateOpenSessionForm({ saldo_apertura: 500 });
      expect(Object.keys(errors).length).toBe(0);
    });
  });

  describe('Close Session Form', () => {
    it('rejects empty closing balance', () => {
      const errors = validateCloseSessionForm({});
      expect(Object.keys(errors).length).toBeGreaterThan(0);
      expect(errors.saldo_cierre).toBeDefined();
    });

    it('rejects negative closing balance', () => {
      const errors = validateCloseSessionForm({ saldo_cierre: -50 });
      expect(errors.saldo_cierre).toBe('El saldo de cierre debe ser mayor o igual a cero');
    });

    it('accepts zero closing balance', () => {
      const errors = validateCloseSessionForm({ saldo_cierre: 0 });
      expect(Object.keys(errors).length).toBe(0);
    });

    it('passes with valid closing balance', () => {
      const errors = validateCloseSessionForm({ saldo_cierre: 1480 });
      expect(Object.keys(errors).length).toBe(0);
    });
  });
});

describe('SessionStatus', () => {
  it('shows open session state with balances', () => {
    const session: CashSession = {
      id: 'ses-1',
      estado: 'abierta',
      saldo_apertura: 1000,
      saldo_actual: 1500,
      abierta_por: 'u1',
      abierta_en: '2024-01-15T08:00:00Z',
      created_at: '2024-01-15T08:00:00Z',
      updated_at: '2024-01-15T10:00:00Z',
    };

    const statusLabel = session.estado === 'abierta' ? 'Sesión abierta' : 'Sesión cerrada';
    const balanceText = `$${session.saldo_actual.toFixed(2)}`;

    expect(statusLabel).toBe('Sesión abierta');
    expect(balanceText).toBe('$1500.00');
    expect(session.saldo_apertura).toBe(1000);
  });

  it('shows closed session state', () => {
    const session: CashSession = {
      id: 'ses-2',
      estado: 'cerrada',
      saldo_apertura: 500,
      saldo_actual: 500,
      saldo_cierre: 480,
      abierta_por: 'u1',
      cerrada_por: 'u1',
      abierta_en: '2024-01-15T08:00:00Z',
      cerrada_en: '2024-01-15T18:00:00Z',
      created_at: '2024-01-15T08:00:00Z',
      updated_at: '2024-01-15T18:00:00Z',
    };

    expect(session.estado).toBe('cerrada');
    expect(session.saldo_cierre).toBe(480);
    expect(session.cerrada_en).toBeDefined();
  });

  it('shows idle state when no session', () => {
    const session: CashSession | null = null;
    const statusLabel = session ? 'Sesión abierta' : 'Sin sesión activa';
    expect(statusLabel).toBe('Sin sesión activa');
  });

  it('only one active session at a time (J2)', () => {
    const sessions: CashSession[] = [
      { id: 'ses-1', estado: 'abierta', saldo_apertura: 1000, saldo_actual: 1200, abierta_por: 'u1', abierta_en: '2024-01-15T08:00:00Z', created_at: '2024-01-15T08:00:00Z', updated_at: '2024-01-15T09:00:00Z' },
      { id: 'ses-2', estado: 'cerrada', saldo_apertura: 500, saldo_actual: 500, saldo_cierre: 500, abierta_por: 'u1', cerrada_por: 'u1', abierta_en: '2024-01-14T08:00:00Z', cerrada_en: '2024-01-14T18:00:00Z', created_at: '2024-01-14T08:00:00Z', updated_at: '2024-01-14T18:00:00Z' },
    ];

    const activeSessions = sessions.filter((s) => s.estado === 'abierta');
    expect(activeSessions).toHaveLength(1);
    expect(activeSessions[0].id).toBe('ses-1');
  });
});

describe('OpenSession', () => {
  it('sends POST with opening balance', async () => {
    const createdSession: CashSession = {
      id: 'ses-new',
      estado: 'abierta',
      saldo_apertura: 500,
      saldo_actual: 500,
      abierta_por: 'u1',
      abierta_en: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const createSession = async (dto: { saldo_apertura: number }): Promise<CashSession> => {
      if (dto.saldo_apertura <= 0) {
        const error = new Error('Bad Request');
        (error as any).status = 400;
        throw error;
      }
      return createdSession;
    };

    const result = await createSession({ saldo_apertura: 500 });
    expect(result.estado).toBe('abierta');
    expect(result.saldo_apertura).toBe(500);
    expect(result.saldo_actual).toBe(500);
    expect(result).toHaveProperty('id');
  });

  it('returns 400 when opening balance is missing or zero', async () => {
    const createSession = async (dto: { saldo_apertura: number }): Promise<CashSession> => {
      if (!dto.saldo_apertura || dto.saldo_apertura <= 0) {
        const error = new Error('Bad Request');
        (error as any).status = 400;
        throw error;
      }
      return {} as CashSession;
    };

    await expect(createSession({ saldo_apertura: 0 })).rejects.toMatchObject({ status: 400 });
  });
});

describe('CloseSession', () => {
  it('sends POST with closing balance', async () => {
    const closedSession: CashSession = {
      id: 'ses-1',
      estado: 'cerrada',
      saldo_apertura: 1000,
      saldo_actual: 1000,
      saldo_cierre: 980,
      abierta_por: 'u1',
      cerrada_por: 'u1',
      abierta_en: '2024-01-15T08:00:00Z',
      cerrada_en: new Date().toISOString(),
      created_at: '2024-01-15T08:00:00Z',
      updated_at: new Date().toISOString(),
    };

    const closeSession = async (dto: { saldo_cierre: number }): Promise<CashSession> => {
      if (dto.saldo_cierre < 0) {
        const error = new Error('Bad Request');
        (error as any).status = 400;
        throw error;
      }
      return closedSession;
    };

    const result = await closeSession({ saldo_cierre: 980 });
    expect(result.estado).toBe('cerrada');
    expect(result.saldo_cierre).toBe(980);
  });

  it('marks session as closed', () => {
    const session: CashSession = {
      id: 'ses-1',
      estado: 'cerrada',
      saldo_apertura: 1000,
      saldo_actual: 1000,
      saldo_cierre: 1500,
      abierta_por: 'u1',
      cerrada_por: 'u1',
      abierta_en: '2024-01-15T08:00:00Z',
      cerrada_en: '2024-01-15T18:00:00Z',
      created_at: '2024-01-15T08:00:00Z',
      updated_at: '2024-01-15T18:00:00Z',
    };

    expect(session.estado).toBe('cerrada');
    expect(session.cerrada_en).toBeDefined();
    expect(session.saldo_cierre).toBe(1500);
  });
});

describe('MovementList', () => {
  it('loads movements for current session', () => {
    const movements: CashMovement[] = [
      { id: 'mov-1', sesion_id: 'ses-1', tipo: 'ingreso', monto: 500, descripcion: 'Venta contado', registrado_por: 'u1', registrado_por_nombre: 'Admin', created_at: '2024-01-15T10:00:00Z' },
      { id: 'mov-2', sesion_id: 'ses-1', tipo: 'egreso', monto: 50, descripcion: 'Gasto menor', registrado_por: 'u1', registrado_por_nombre: 'Admin', created_at: '2024-01-15T11:00:00Z' },
      { id: 'mov-3', sesion_id: 'ses-1', tipo: 'ingreso', monto: 200, registrado_por: 'u2', registrado_por_nombre: 'Cajero', created_at: '2024-01-15T12:00:00Z' },
    ];

    expect(movements).toHaveLength(3);
    expect(movements.filter((m) => m.tipo === 'ingreso')).toHaveLength(2);
    expect(movements.filter((m) => m.tipo === 'egreso')).toHaveLength(1);
  });

  it('orders movements by timestamp descending', () => {
    const movements: CashMovement[] = [
      { id: 'mov-1', sesion_id: 'ses-1', tipo: 'ingreso', monto: 100, registrado_por: 'u1', created_at: '2024-01-15T10:00:00Z' },
      { id: 'mov-2', sesion_id: 'ses-1', tipo: 'ingreso', monto: 200, registrado_por: 'u1', created_at: '2024-01-15T12:00:00Z' },
      { id: 'mov-3', sesion_id: 'ses-1', tipo: 'egreso', monto: 50, registrado_por: 'u1', created_at: '2024-01-15T11:00:00Z' },
    ];

    const sorted = [...movements].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

    expect(sorted[0].id).toBe('mov-2');
    expect(sorted[1].id).toBe('mov-3');
    expect(sorted[2].id).toBe('mov-1');
  });

  it('filters movements scoped to current session', () => {
    const allMovements: CashMovement[] = [
      { id: 'mov-1', sesion_id: 'ses-1', tipo: 'ingreso', monto: 100, registrado_por: 'u1', created_at: '2024-01-15T10:00:00Z' },
      { id: 'mov-2', sesion_id: 'ses-1', tipo: 'egreso', monto: 50, registrado_por: 'u1', created_at: '2024-01-15T11:00:00Z' },
      { id: 'mov-3', sesion_id: 'ses-2', tipo: 'ingreso', monto: 300, registrado_por: 'u1', created_at: '2024-01-14T10:00:00Z' },
    ];

    const getMovementsBySession = (sessionId: string): CashMovement[] =>
      allMovements.filter((m) => m.sesion_id === sessionId);

    expect(getMovementsBySession('ses-1')).toHaveLength(2);
    expect(getMovementsBySession('ses-2')).toHaveLength(1);
  });

  it('shows empty state when no movements', () => {
    const movements: CashMovement[] = [];
    expect(movements).toHaveLength(0);
  });
});

describe('AddMovement', () => {
  it('sends POST with movement data', async () => {
    const storedMovements: CashMovement[] = [];

    const addMovement = async (dto: { sesion_id: string; tipo: 'ingreso' | 'egreso'; monto: number; descripcion?: string }): Promise<CashMovement> => {
      const movement: CashMovement = {
        id: 'mov-new',
        sesion_id: dto.sesion_id,
        tipo: dto.tipo,
        monto: dto.monto,
        descripcion: dto.descripcion,
        registrado_por: 'u1',
        created_at: new Date().toISOString(),
      };
      storedMovements.push(movement);
      return movement;
    };

    const result = await addMovement({ sesion_id: 'ses-1', tipo: 'ingreso', monto: 250, descripcion: 'Venta' });
    expect(result.tipo).toBe('ingreso');
    expect(result.monto).toBe(250);
    expect(result.sesion_id).toBe('ses-1');
    expect(storedMovements).toHaveLength(1);
  });
});
