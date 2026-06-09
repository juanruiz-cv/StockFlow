import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Like } from 'typeorm';
import { Customer } from '../../entities/customer.entity';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';
import { TenantContextService } from '../../common/tenants/tenant-context.service';

@Injectable()
export class ClientesService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    private readonly tenantContext: TenantContextService,
  ) {}

  private getTenantId(): string {
    const tenantId = this.tenantContext.getTenantId();
    if (!tenantId) {
      throw new NotFoundException('Tenant context not available');
    }
    return tenantId;
  }

  /**
   * Create a new customer within the current tenant.
   * Checks email uniqueness when email is provided.
   */
  async create(dto: CreateClienteDto): Promise<Customer> {
    const tenantId = this.getTenantId();

    if (dto.email) {
      const existing = await this.customerRepository.findOne({
        where: { email: dto.email, tenantId },
        withDeleted: true,
      });
      if (existing) {
        throw new ConflictException('Email already exists in this tenant');
      }
    }

    const customer = this.customerRepository.create({
      ...dto,
      tenantId,
    });

    return this.customerRepository.save(customer);
  }

  /**
   * Search customers with pagination.
   * Supports filtering by name, email, phone, or document number.
   */
  async findAll(
    search?: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ data: Customer[]; total: number; page: number; limit: number }> {
    const tenantId = this.getTenantId();

    const where: any = search
      ? [
          { tenantId, deletedAt: IsNull(), name: Like(`%${search}%`) },
          { tenantId, deletedAt: IsNull(), email: Like(`%${search}%`) },
        ]
      : { tenantId, deletedAt: IsNull() };

    const [data, total] = await this.customerRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total, page, limit };
  }

  /**
   * Find a customer by ID within the current tenant.
   */
  async findById(id: string): Promise<Customer> {
    const tenantId = this.getTenantId();
    const customer = await this.customerRepository.findOne({
      where: { id, tenantId, deletedAt: IsNull() },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }
    return customer;
  }

  /**
   * Update customer fields.
   * Checks email uniqueness on email change.
   */
  async update(id: string, dto: UpdateClienteDto): Promise<Customer> {
    const tenantId = this.getTenantId();
    const customer = await this.customerRepository.findOne({
      where: { id, tenantId, deletedAt: IsNull() },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    if (dto.email !== undefined && dto.email !== customer.email) {
      const existing = await this.customerRepository.findOne({
        where: { email: dto.email, tenantId },
        withDeleted: true,
      });
      if (existing && existing.id !== id) {
        throw new ConflictException('Email already exists in this tenant');
      }
      customer.email = dto.email;
    }

    if (dto.name !== undefined) customer.name = dto.name;
    if (dto.phone !== undefined) customer.phone = dto.phone;
    if (dto.documentType !== undefined) customer.documentType = dto.documentType;
    if (dto.documentNumber !== undefined) customer.documentNumber = dto.documentNumber;
    if (dto.address !== undefined) customer.address = dto.address;
    if (dto.isActive !== undefined) customer.isActive = dto.isActive;

    return this.customerRepository.save(customer);
  }

  /**
   * Soft-delete a customer.
   */
  async softDelete(id: string): Promise<void> {
    const customer = await this.findById(id);
    customer.deletedAt = new Date();
    await this.customerRepository.save(customer);
  }
}
