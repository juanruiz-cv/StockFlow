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

class TokenServiceTest {
  getAccessToken(): string | null {
    return localStorage.getItem('stockflow_access_token');
  }
  getRefreshToken(): string | null {
    return localStorage.getItem('stockflow_refresh_token');
  }
  setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem('stockflow_access_token', accessToken);
    localStorage.setItem('stockflow_refresh_token', refreshToken);
  }
  clear(): void {
    localStorage.removeItem('stockflow_access_token');
    localStorage.removeItem('stockflow_refresh_token');
  }
}

describe('TokenService', () => {
  let service: TokenServiceTest;

  beforeEach(() => {
    localStorage.clear();
    service = new TokenServiceTest();
  });

  it('starts with no tokens', () => {
    expect(service.getAccessToken()).toBeNull();
    expect(service.getRefreshToken()).toBeNull();
  });

  it('stores and retrieves tokens', () => {
    service.setTokens('access-123', 'refresh-456');
    expect(service.getAccessToken()).toBe('access-123');
    expect(service.getRefreshToken()).toBe('refresh-456');
  });

  it('clears tokens', () => {
    service.setTokens('access', 'refresh');
    service.clear();
    expect(service.getAccessToken()).toBeNull();
    expect(service.getRefreshToken()).toBeNull();
  });
});
