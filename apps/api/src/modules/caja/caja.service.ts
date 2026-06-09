import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull } from 'typeorm';
import { CashSession, CashSessionStatus } from '../../entities/cash-session.entity';
import { CashMovement } from '../../entities/cash-movement.entity';
import { TenantContextService } from '../../common/tenants/tenant-context.service';
import { OpenSessionDto } from './dto/open-session.dto';
import { CloseSessionDto } from './dto/close-session.dto';
import { CashMovementDto } from './dto/cash-movement.dto';

@Injectable()
export class CajaService {
  constructor(
    @InjectRepository(CashSession)
    private readonly sessionRepository: Repository<CashSession>,
    @InjectRepository(CashMovement)
    private readonly movementRepository: Repository<CashMovement>,
    private readonly tenantContext: TenantContextService,
    private readonly dataSource: DataSource,
  ) {}

  private getTenantId(): string {
    const tenantId = this.tenantContext.getTenantId();
    if (!tenantId) {
      throw new NotFoundException('Tenant context not available');
    }
    return tenantId;
  }

  private getUserId(): string {
    const userId = this.tenantContext.getUserId();
    if (!userId) {
      throw new NotFoundException('User context not available');
    }
    return userId;
  }

  /**
   * Open a new cash session for the current tenant.
   * Throws if there is already an open session (enforced by partial unique index + app check).
   */
  async openSession(dto: OpenSessionDto): Promise<CashSession> {
    const tenantId = this.getTenantId();
    const userId = this.getUserId();

    // Check for existing open session
    const existingOpen = await this.sessionRepository.findOne({
      where: { tenantId, status: 'OPEN' },
    });
    if (existingOpen) {
      throw new BadRequestException('There is already an open cash session for this tenant');
    }

    const session = this.sessionRepository.create({
      tenantId,
      userId,
      openingBalance: dto.openingBalance,
      status: 'OPEN',
      notes: dto.notes ?? null,
    });

    return this.sessionRepository.save(session);
  }

  /**
   * Close the currently open cash session.
   * Calculates expected balance and reconciles with provided closing balance.
   */
  async closeSession(dto: CloseSessionDto): Promise<CashSession> {
    const tenantId = this.getTenantId();

    const session = await this.sessionRepository.findOne({
      where: { tenantId, status: 'OPEN' },
    });
    if (!session) {
      throw new NotFoundException('No open cash session found');
    }

    // Calculate expected balance based on all movements
    const movements = await this.movementRepository.find({
      where: { sessionId: session.id },
    });

    let expectedBalance = Number(session.openingBalance);
    for (const m of movements) {
      if (m.type === 'IN') {
        expectedBalance += Number(m.amount);
      } else {
        expectedBalance -= Number(m.amount);
      }
    }

    session.closingBalance = dto.closingBalance;
    session.expectedBalance = expectedBalance;
    session.closedAt = new Date();
    session.status = 'CLOSED';
    session.notes = dto.notes ?? session.notes;

    return this.sessionRepository.save(session);
  }

  /**
   * Get the currently open session for the tenant.
   */
  async getCurrentSession(): Promise<CashSession | null> {
    const tenantId = this.getTenantId();
    return this.sessionRepository.findOne({
      where: { tenantId, status: 'OPEN' },
      relations: { user: true },
    });
  }

  /**
   * Get session history for the tenant.
   */
  async getSessionHistory(): Promise<CashSession[]> {
    const tenantId = this.getTenantId();
    return this.sessionRepository.find({
      where: { tenantId },
      order: { openedAt: 'DESC' },
      relations: { user: true },
      take: 50,
    });
  }

  /**
   * Get a specific session by ID.
   */
  async getSessionById(id: string): Promise<CashSession> {
    const tenantId = this.getTenantId();
    const session = await this.sessionRepository.findOne({
      where: { id, tenantId },
      relations: { user: true },
    });
    if (!session) {
      throw new NotFoundException('Cash session not found');
    }
    return session;
  }

  /**
   * Add a cash movement to the currently open session.
   */
  async addMovement(dto: CashMovementDto): Promise<CashMovement> {
    const tenantId = this.getTenantId();

    // Verify there's an open session
    const session = await this.sessionRepository.findOne({
      where: { tenantId, status: 'OPEN' },
    });
    if (!session) {
      throw new BadRequestException('No open cash session available');
    }

    const movement = this.movementRepository.create({
      tenantId,
      sessionId: session.id,
      type: dto.type,
      amount: dto.amount,
      reason: dto.reason ?? null,
      referenceType: dto.referenceType ?? null,
      referenceId: dto.referenceId ?? null,
    });

    return this.movementRepository.save(movement);
  }

  /**
   * Get movements for a specific session.
   */
  async getMovements(sessionId: string): Promise<CashMovement[]> {
    const tenantId = this.getTenantId();
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId, tenantId },
    });
    if (!session) {
      throw new NotFoundException('Cash session not found');
    }

    return this.movementRepository.find({
      where: { sessionId },
      order: { createdAt: 'ASC' },
    });
  }
}
