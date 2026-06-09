# StockFlow

SaaS multi-tenant para comercios de informática — POS, stock, garantías y RMA.

## Stack

- **Monorepo**: Nx
- **Backend**: NestJS (Modular Monolith)
- **Frontend**: Angular (Standalone + Signals)
- **Base de datos**: PostgreSQL con RLS multi-tenant
- **Caché**: Redis
- **Infra**: Docker + Coolify

## Fases

1. Core Infraestructura & Autenticación
2. Núcleo Transaccional (POS, Stock, Caja)
3. Dominio Informático (Seriales, Garantías, RMA)
4. Compras, Proveedores y Reportes
