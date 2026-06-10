export interface SidebarItem {
  label: string;
  path: string;
  icon: string;
  permission?: string;
}

export const MENU_ITEMS: SidebarItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: '📊' },
  { label: 'Productos', path: '/products', icon: '📦', permission: 'products:read' },
  { label: 'Clientes', path: '/customers', icon: '👥', permission: 'customers:read' },
  { label: 'Stock', path: '/stock', icon: '📋', permission: 'stock:read' },
  { label: 'Caja', path: '/caja', icon: '💰', permission: 'caja:read' },
  { label: 'Ventas', path: '/sales', icon: '🧾', permission: 'sales:read' },
  { label: 'Admin', path: '/admin/users', icon: '⚙️', permission: 'admin:read' },
];
