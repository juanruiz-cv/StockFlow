import { Test, TestingModule } from '@nestjs/testing';
import { CajaService } from './caja.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CashSession } from '../../entities/cash-session.entity';
import { CashMovement } from '../../entities/cash-movement.entity';
import { TenantContextService } from '../../common/tenants/tenant-context.service';
import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { OpenSessionDto } from './dto/open-session.dto';
import { CloseSessionDto } from './dto/close-session.dto';
import { CashMovementDto } from './dto/cash-movement.dto';

describe('CajaService', () => {
  let service: CajaService;
  let sessionRepo: jest.Mocked<Pick<import('typeorm').Repository<CashSession>, 'find' | 'findOne' | 'create' | 'save'>>;
  let movementRepo: jest.Mocked<Pick<import('typeorm').Repository<CashMovement>, 'find' | 'create' | 'save'>>;
  let tenantContext: jest.Mocked<TenantContextService>;

  const mockSession: Partial<CashSession> = {
    id: 'session-1',
    tenantId: 'tenant-1',
    userId: 'user-1',
    openingBalance: 1000,
    closingBalance: null,
    expectedBalance: null,
    status: 'OPEN',
    openedAt: new Date('2025-01-01T10:00:00Z'),
    closedAt: null,
    notes: null,
    createdAt: new Date('2025-01-01T10:00:00Z'),
    updatedAt: new Date('2025-01-01T10:00:00Z'),
  };

  const mockMovement: Partial<CashMovement> = {
    id: 'mov-1',
    tenantId: 'tenant-1',
    sessionId: 'session-1',
    type: 'IN',
    amount: 500,
    reason: 'Payment received',
    createdAt: new Date('2025-01-01T11:00:00Z'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CajaService,
        {
          provide: getRepositoryToken(CashSession),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(CashMovement),
          useValue: {
            find: jest.fn(),
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
        {
          provide: DataSource,
          useValue: {
            createQueryRunner: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CajaService>(CajaService);
    sessionRepo = module.get(getRepositoryToken(CashSession));
    movementRepo = module.get(getRepositoryToken(CashMovement));
    tenantContext = module.get(TenantContextService) as jest.Mocked<TenantContextService>;
  });

  // ──────────────────────────────────────────────
  // openSession
  // ──────────────────────────────────────────────
  describe('openSession', () => {
    const dto: OpenSessionDto = {
      openingBalance: 1000,
      notes: 'Morning shift',
    };

    it('should create a new open session', async () => {
      tenantContext.getTenantId.mockReturnValue('tenant-1');
      tenantContext.getUserId.mockReturnValue('user-1');
      sessionRepo.findOne.mockResolvedValue(null); // no existing open session
      sessionRepo.create.mockReturnValue(mockSession as CashSession);
      sessionRepo.save.mockResolvedValue(mockSession as CashSession);

      const result = await service.openSession(dto);

      expect(tenantContext.getTenantId).toHaveBeenCalled();
      expect(tenantContext.getUserId).toHaveBeenCalled();
      expect(sessionRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 'tenant-1', status: 'OPEN' },
        }),
      );
      expect(sessionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-1',
          userId: 'user-1',
          openingBalance: 1000,
          status: 'OPEN',
        }),
      );
      expect(sessionRepo.save).toHaveBeenCalled();
      expect(result).toEqual(mockSession);
    });

    it('should throw BadRequestException when session already open', async () => {
      tenantContext.getTenantId.mockReturnValue('tenant-1');
      tenantContext.getUserId.mockReturnValue('user-1');
      sessionRepo.findOne.mockResolvedValue(mockSession as CashSession); // already open

      await expect(service.openSession(dto)).rejects.toThrow(BadRequestException);
      expect(sessionRepo.save).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when tenant context missing', async () => {
      tenantContext.getTenantId.mockReturnValue(null);

      await expect(service.openSession(dto)).rejects.toThrow(NotFoundException);
    });
  });

  // ──────────────────────────────────────────────
  // closeSession
  // ──────────────────────────────────────────────
  describe('closeSession', () => {
    const dto: CloseSessionDto = {
      closingBalance: 1800,
    };

    it('should close the open session with balance reconciliation', async () => {
      tenantContext.getTenantId.mockReturnValue('tenant-1');
      sessionRepo.findOne.mockResolvedValue(mockSession as CashSession); // open session
      movementRepo.find.mockResolvedValue([
        { ...mockMovement, type: 'IN', amount: 500 } as CashMovement,
        { ...mockMovement, type: 'OUT', amount: 200 } as CashMovement,
      ]);

      const savedSession = {
        ...mockSession,
        closingBalance: 1800,
        expectedBalance: 1300, // 1000 + 500 - 200
        status: 'CLOSED',
        closedAt: expect.any(Date),
      };
      sessionRepo.save.mockResolvedValue(savedSession as CashSession);

      const result = await service.closeSession(dto);

      expect(result.status).toBe('CLOSED');
      expect(result.closingBalance).toBe(1800);
      expect(result.expectedBalance).toBe(1300);
      expect(result.closedAt).toBeDefined();
    });

    it('should throw NotFoundException when no open session', async () => {
      tenantContext.getTenantId.mockReturnValue('tenant-1');
      sessionRepo.findOne.mockResolvedValue(null);

      await expect(service.closeSession(dto)).rejects.toThrow(NotFoundException);
    });
  });

  // ──────────────────────────────────────────────
  // getCurrentSession
  // ──────────────────────────────────────────────
  describe('getCurrentSession', () => {
    it('should return the open session', async () => {
      tenantContext.getTenantId.mockReturnValue('tenant-1');
      sessionRepo.findOne.mockResolvedValue(mockSession as CashSession);

      const result = await service.getCurrentSession();
      expect(result).toEqual(mockSession);
    });

    it('should return null when no open session', async () => {
      tenantContext.getTenantId.mockReturnValue('tenant-1');
      sessionRepo.findOne.mockResolvedValue(null);

      const result = await service.getCurrentSession();
      expect(result).toBeNull();
    });
  });

  // ──────────────────────────────────────────────
  // getSessionHistory
  // ──────────────────────────────────────────────
  describe('getSessionHistory', () => {
    it('should return recent sessions', async () => {
      tenantContext.getTenantId.mockReturnValue('tenant-1');
      sessionRepo.find.mockResolvedValue([mockSession as CashSession]);

      const result = await service.getSessionHistory();
      expect(result).toHaveLength(1);
      expect(sessionRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 'tenant-1' },
          order: { openedAt: 'DESC' },
          take: 50,
        }),
      );
    });
  });

  // ──────────────────────────────────────────────
  // getSessionById
  // ──────────────────────────────────────────────
  describe('getSessionById', () => {
    it('should return session by id', async () => {
      tenantContext.getTenantId.mockReturnValue('tenant-1');
      sessionRepo.findOne.mockResolvedValue(mockSession as CashSession);

      const result = await service.getSessionById('session-1');
      expect(result).toEqual(mockSession);
    });

    it('should throw NotFoundException when not found', async () => {
      tenantContext.getTenantId.mockReturnValue('tenant-1');
      sessionRepo.findOne.mockResolvedValue(null);

      await expect(service.getSessionById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // ──────────────────────────────────────────────
  // addMovement
  // ──────────────────────────────────────────────
  describe('addMovement', () => {
    const dto: CashMovementDto = {
      type: 'IN',
      amount: 500,
      reason: 'Payment',
    };

    it('should add movement to open session', async () => {
      tenantContext.getTenantId.mockReturnValue('tenant-1');
      sessionRepo.findOne.mockResolvedValue(mockSession as CashSession);
      movementRepo.create.mockReturnValue(mockMovement as CashMovement);
      movementRepo.save.mockResolvedValue(mockMovement as CashMovement);

      const result = await service.addMovement(dto);

      expect(result.type).toBe('IN');
      expect(result.amount).toBe(500);
      expect(movementRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-1',
          sessionId: 'session-1',
          type: 'IN',
          amount: 500,
        }),
      );
    });

    it('should throw BadRequestException when no open session', async () => {
      tenantContext.getTenantId.mockReturnValue('tenant-1');
      sessionRepo.findOne.mockResolvedValue(null);

      await expect(service.addMovement(dto)).rejects.toThrow(BadRequestException);
    });
  });

  // ──────────────────────────────────────────────
  // getMovements
  // ──────────────────────────────────────────────
  describe('getMovements', () => {
    it('should return movements for a session', async () => {
      tenantContext.getTenantId.mockReturnValue('tenant-1');
      sessionRepo.findOne.mockResolvedValue(mockSession as CashSession);
      movementRepo.find.mockResolvedValue([mockMovement as CashMovement]);

      const result = await service.getMovements('session-1');
      expect(result).toHaveLength(1);
      expect(movementRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { sessionId: 'session-1' },
        }),
      );
    });

    it('should throw NotFoundException when session does not exist', async () => {
      tenantContext.getTenantId.mockReturnValue('tenant-1');
      sessionRepo.findOne.mockResolvedValue(null);

      await expect(service.getMovements('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // ──────────────────────────────────────────────
  // Dual-session rejection
  // ──────────────────────────────────────────────
  describe('dual-session rejection', () => {
    it('should prevent opening a second session when one is open', async () => {
      tenantContext.getTenantId.mockReturnValue('tenant-1');
      tenantContext.getUserId.mockReturnValue('user-1');
      sessionRepo.findOne.mockResolvedValue(mockSession as CashSession); // already open

      await expect(
        service.openSession({ openingBalance: 500 }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ──────────────────────────────────────────────
  // Movement validation
  // ──────────────────────────────────────────────
  describe('movement validation', () => {
    it('should accept IN movements', async () => {
      tenantContext.getTenantId.mockReturnValue('tenant-1');
      sessionRepo.findOne.mockResolvedValue(mockSession as CashSession);
      movementRepo.create.mockReturnValue({ ...mockMovement, type: 'IN' } as CashMovement);
      movementRepo.save.mockResolvedValue({ ...mockMovement, type: 'IN' } as CashMovement);

      const result = await service.addMovement({ type: 'IN', amount: 100 });
      expect(result.type).toBe('IN');
    });

    it('should accept OUT movements', async () => {
      tenantContext.getTenantId.mockReturnValue('tenant-1');
      sessionRepo.findOne.mockResolvedValue(mockSession as CashSession);
      movementRepo.create.mockReturnValue({ ...mockMovement, type: 'OUT' } as CashMovement);
      movementRepo.save.mockResolvedValue({ ...mockMovement, type: 'OUT' } as CashMovement);

      const result = await service.addMovement({ type: 'OUT', amount: 100 });
      expect(result.type).toBe('OUT');
    });
  });
});
