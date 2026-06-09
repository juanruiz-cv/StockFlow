import { Test, TestingModule } from '@nestjs/testing';
import { ClientesService } from './clientes.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Customer } from '../../entities/customer.entity';
import { TenantContextService } from '../../common/tenants/tenant-context.service';
import {
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';

describe('ClientesService', () => {
  let service: ClientesService;
  let customerRepo: jest.Mocked<Pick<import('typeorm').Repository<Customer>, 'find' | 'findOne' | 'findAndCount' | 'create' | 'save'>>;
  let tenantContext: jest.Mocked<TenantContextService>;

  const mockCustomer: Partial<Customer> = {
    id: 'cust-1',
    tenantId: 'tenant-1',
    name: 'Juan Pérez',
    email: 'juan@example.com',
    phone: '11-1234-5678',
    documentType: 'DNI',
    documentNumber: '12345678',
    isActive: true,
    deletedAt: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientesService,
        {
          provide: getRepositoryToken(Customer),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            findAndCount: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: TenantContextService,
          useValue: {
            getTenantId: jest.fn(),
            getCurrentContext: jest.fn(),
            getUserId: jest.fn(),
            run: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ClientesService>(ClientesService);
    customerRepo = module.get(getRepositoryToken(Customer));
    tenantContext = module.get(TenantContextService) as jest.Mocked<TenantContextService>;
  });

  // ──────────────────────────────────────────────
  // create
  // ──────────────────────────────────────────────
  describe('create', () => {
    const dto: CreateClienteDto = {
      name: 'New Customer',
      email: 'new@example.com',
    };

    it('should create a customer with tenantId', async () => {
      tenantContext.getTenantId.mockReturnValue('tenant-1');
      customerRepo.findOne.mockResolvedValue(null); // no duplicate email
      customerRepo.create.mockReturnValue(mockCustomer as Customer);
      customerRepo.save.mockResolvedValue(mockCustomer as Customer);

      const result = await service.create(dto);

      expect(tenantContext.getTenantId).toHaveBeenCalled();
      expect(customerRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { email: dto.email, tenantId: 'tenant-1' },
          withDeleted: true,
        }),
      );
      expect(customerRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ ...dto, tenantId: 'tenant-1' }),
      );
      expect(result).toEqual(mockCustomer);
    });

    it('should throw ConflictException on duplicate email', async () => {
      tenantContext.getTenantId.mockReturnValue('tenant-1');
      customerRepo.findOne.mockResolvedValue(mockCustomer as Customer);

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
      expect(customerRepo.save).not.toHaveBeenCalled();
    });

    it('should create a customer without email (no uniqueness check)', async () => {
      tenantContext.getTenantId.mockReturnValue('tenant-1');
      const noEmailDto: CreateClienteDto = { name: 'No Email Customer' };
      const savedCustomer = { ...mockCustomer, email: null, name: 'No Email Customer' };
      customerRepo.create.mockReturnValue(savedCustomer as Customer);
      customerRepo.save.mockResolvedValue(savedCustomer as Customer);

      const result = await service.create(noEmailDto);

      expect(customerRepo.findOne).not.toHaveBeenCalled(); // no email check
      expect(result.name).toBe('No Email Customer');
    });
  });

  // ──────────────────────────────────────────────
  // findAll (with search and pagination)
  // ──────────────────────────────────────────────
  describe('findAll', () => {
    it('should return paginated customers', async () => {
      tenantContext.getTenantId.mockReturnValue('tenant-1');
      const customers = [mockCustomer as Customer];
      customerRepo.findAndCount.mockResolvedValue([customers, 1]);

      const result = await service.findAll(undefined, 1, 20);

      expect(customerRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 20,
        }),
      );
      expect(result.data).toEqual(customers);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
    });

    it('should filter by search term (name or email)', async () => {
      tenantContext.getTenantId.mockReturnValue('tenant-1');
      customerRepo.findAndCount.mockResolvedValue([[mockCustomer as Customer], 1]);

      const result = await service.findAll('Juan', 1, 20);

      expect(customerRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.arrayContaining([
            expect.objectContaining({
              name: expect.objectContaining({ _value: '%Juan%' }),
            }),
            expect.objectContaining({
              email: expect.objectContaining({ _value: '%Juan%' }),
            }),
          ]),
        }),
      );
      expect(result.data).toHaveLength(1);
    });
  });

  // ──────────────────────────────────────────────
  // findById
  // ──────────────────────────────────────────────
  describe('findById', () => {
    it('should return customer when found', async () => {
      tenantContext.getTenantId.mockReturnValue('tenant-1');
      customerRepo.findOne.mockResolvedValue(mockCustomer as Customer);

      const result = await service.findById('cust-1');
      expect(result).toEqual(mockCustomer);
    });

    it('should throw NotFoundException when not found', async () => {
      tenantContext.getTenantId.mockReturnValue('tenant-1');
      customerRepo.findOne.mockResolvedValue(null);

      await expect(service.findById('cust-1')).rejects.toThrow(NotFoundException);
    });
  });

  // ──────────────────────────────────────────────
  // update
  // ──────────────────────────────────────────────
  describe('update', () => {
    it('should update customer name', async () => {
      tenantContext.getTenantId.mockReturnValue('tenant-1');
      customerRepo.findOne.mockResolvedValue(mockCustomer as Customer);
      customerRepo.save.mockResolvedValue({ ...mockCustomer, name: 'Updated Name' } as Customer);

      const result = await service.update('cust-1', { name: 'Updated Name' });

      expect(result.name).toBe('Updated Name');
    });

    it('should throw ConflictException when new email is taken', async () => {
      tenantContext.getTenantId.mockReturnValue('tenant-1');
      const otherCustomer = { ...mockCustomer, id: 'cust-2', email: 'taken@example.com' } as Customer;
      customerRepo.findOne
        .mockResolvedValueOnce(mockCustomer as Customer) // findById
        .mockResolvedValueOnce(otherCustomer); // duplicate email

      await expect(
        service.update('cust-1', { email: 'taken@example.com' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ──────────────────────────────────────────────
  // softDelete
  // ──────────────────────────────────────────────
  describe('softDelete', () => {
    it('should set deletedAt on customer', async () => {
      tenantContext.getTenantId.mockReturnValue('tenant-1');
      const customer = { ...mockCustomer, deletedAt: null } as Customer;
      customerRepo.findOne.mockResolvedValue(customer);
      customerRepo.save.mockImplementation(async (u: any) => ({ ...u, deletedAt: new Date() }));

      await service.softDelete('cust-1');

      expect(customerRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ deletedAt: expect.any(Date) }),
      );
    });

    it('should throw NotFoundException when not found', async () => {
      tenantContext.getTenantId.mockReturnValue('tenant-1');
      customerRepo.findOne.mockResolvedValue(null);

      await expect(service.softDelete('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // ──────────────────────────────────────────────
  // Tenant isolation (integration-style)
  // ──────────────────────────────────────────────
  describe('tenant isolation', () => {
    it('should only return customers from current tenant', async () => {
      tenantContext.getTenantId.mockReturnValue('tenant-a');
      const tenantACust = { ...mockCustomer, id: 'ca-1', tenantId: 'tenant-a' } as Customer;
      const tenantBCust = { ...mockCustomer, id: 'cb-1', tenantId: 'tenant-b', email: 'other@example.com' } as Customer;

      customerRepo.findAndCount.mockImplementation((_opts?: any) => {
        const currentTenantId = tenantContext.getTenantId();
        const all = [tenantACust, tenantBCust].filter(
          (c) => c.tenantId === currentTenantId && c.deletedAt === null,
        );
        return Promise.resolve([all, all.length]);
      });

      const result = await service.findAll();

      expect(result.data).toHaveLength(1);
      expect(result.data[0].tenantId).toBe('tenant-a');
    });
  });
});
