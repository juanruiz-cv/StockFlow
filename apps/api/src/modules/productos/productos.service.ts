import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Product } from '../../entities/product.entity';
import { Category } from '../../entities/category.entity';
import { Brand } from '../../entities/brand.entity';
import { Supplier } from '../../entities/supplier.entity';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';
import { CreateCategoriaDto } from './dto/create-categoria.dto';
import { UpdateCategoriaDto } from './dto/update-categoria.dto';
import { CreateMarcaDto } from './dto/create-marca.dto';
import { UpdateMarcaDto } from './dto/update-marca.dto';
import { CreateProveedorDto } from './dto/create-proveedor.dto';
import { UpdateProveedorDto } from './dto/update-proveedor.dto';
import { TenantContextService } from '../../common/tenants/tenant-context.service';

@Injectable()
export class ProductosService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Brand)
    private readonly brandRepository: Repository<Brand>,
    @InjectRepository(Supplier)
    private readonly supplierRepository: Repository<Supplier>,
    private readonly tenantContext: TenantContextService,
  ) {}

  // ──────────────────────────────────────────────
  //  Tenant ID helper
  // ──────────────────────────────────────────────

  private getTenantId(): string {
    const tenantId = this.tenantContext.getTenantId();
    if (!tenantId) {
      throw new NotFoundException('Tenant context not available');
    }
    return tenantId;
  }

  // ──────────────────────────────────────────────
  //  PRODUCTOS
  // ──────────────────────────────────────────────

  async createProduct(dto: CreateProductoDto): Promise<Product> {
    const tenantId = this.getTenantId();

    // Check SKU uniqueness within tenant
    const existing = await this.productRepository.findOne({
      where: { sku: dto.sku, tenantId },
      withDeleted: true,
    });
    if (existing) {
      throw new ConflictException('SKU already exists in this tenant');
    }

    const product = this.productRepository.create({
      ...dto,
      tenantId,
    });

    return this.productRepository.save(product);
  }

  async findAllProducts(): Promise<Product[]> {
    const tenantId = this.getTenantId();
    return this.productRepository.find({
      where: { tenantId, deletedAt: IsNull() },
      relations: { category: true, brand: true, supplier: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findProductById(id: string): Promise<Product> {
    const tenantId = this.getTenantId();
    const product = await this.productRepository.findOne({
      where: { id, tenantId, deletedAt: IsNull() },
      relations: { category: true, brand: true, supplier: true },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  async updateProduct(id: string, dto: UpdateProductoDto): Promise<Product> {
    const tenantId = this.getTenantId();
    const product = await this.productRepository.findOne({
      where: { id, tenantId, deletedAt: IsNull() },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Check SKU uniqueness on change
    if (dto.sku !== undefined && dto.sku !== product.sku) {
      const existing = await this.productRepository.findOne({
        where: { sku: dto.sku, tenantId },
        withDeleted: true,
      });
      if (existing && existing.id !== id) {
        throw new ConflictException('SKU already exists in this tenant');
      }
      product.sku = dto.sku;
    }

    if (dto.name !== undefined) product.name = dto.name;
    if (dto.description !== undefined) product.description = dto.description;
    if (dto.price !== undefined) product.price = dto.price;
    if (dto.costPrice !== undefined) product.costPrice = dto.costPrice;
    if (dto.taxRate !== undefined) product.taxRate = dto.taxRate;
    if (dto.categoryId !== undefined) product.categoryId = dto.categoryId;
    if (dto.brandId !== undefined) product.brandId = dto.brandId;
    if (dto.supplierId !== undefined) product.supplierId = dto.supplierId;
    if (dto.isActive !== undefined) product.isActive = dto.isActive;

    return this.productRepository.save(product);
  }

  async softDeleteProduct(id: string): Promise<void> {
    const product = await this.findProductById(id);
    product.deletedAt = new Date();
    await this.productRepository.save(product);
  }

  // ──────────────────────────────────────────────
  //  CATEGORIAS
  // ──────────────────────────────────────────────

  async createCategory(dto: CreateCategoriaDto): Promise<Category> {
    const tenantId = this.getTenantId();
    const category = this.categoryRepository.create({ ...dto, tenantId });
    return this.categoryRepository.save(category);
  }

  async findAllCategories(): Promise<Category[]> {
    const tenantId = this.getTenantId();
    return this.categoryRepository.find({
      where: { tenantId },
      order: { name: 'ASC' },
    });
  }

  async findCategoryById(id: string): Promise<Category> {
    const tenantId = this.getTenantId();
    const category = await this.categoryRepository.findOne({
      where: { id, tenantId },
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }

  async updateCategory(id: string, dto: UpdateCategoriaDto): Promise<Category> {
    const tenantId = this.getTenantId();
    const category = await this.categoryRepository.findOne({
      where: { id, tenantId },
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    if (dto.name !== undefined) category.name = dto.name;
    if (dto.description !== undefined) category.description = dto.description;
    if (dto.isActive !== undefined) category.isActive = dto.isActive;
    return this.categoryRepository.save(category);
  }

  async deleteCategory(id: string): Promise<void> {
    const tenantId = this.getTenantId();
    const result = await this.categoryRepository.delete({ id, tenantId });
    if (result.affected === 0) {
      throw new NotFoundException('Category not found');
    }
  }

  // ──────────────────────────────────────────────
  //  MARCAS
  // ──────────────────────────────────────────────

  async createBrand(dto: CreateMarcaDto): Promise<Brand> {
    const tenantId = this.getTenantId();
    const brand = this.brandRepository.create({ ...dto, tenantId });
    return this.brandRepository.save(brand);
  }

  async findAllBrands(): Promise<Brand[]> {
    const tenantId = this.getTenantId();
    return this.brandRepository.find({
      where: { tenantId },
      order: { name: 'ASC' },
    });
  }

  async findBrandById(id: string): Promise<Brand> {
    const tenantId = this.getTenantId();
    const brand = await this.brandRepository.findOne({
      where: { id, tenantId },
    });
    if (!brand) {
      throw new NotFoundException('Brand not found');
    }
    return brand;
  }

  async updateBrand(id: string, dto: UpdateMarcaDto): Promise<Brand> {
    const tenantId = this.getTenantId();
    const brand = await this.brandRepository.findOne({
      where: { id, tenantId },
    });
    if (!brand) {
      throw new NotFoundException('Brand not found');
    }
    if (dto.name !== undefined) brand.name = dto.name;
    if (dto.description !== undefined) brand.description = dto.description;
    if (dto.isActive !== undefined) brand.isActive = dto.isActive;
    return this.brandRepository.save(brand);
  }

  async deleteBrand(id: string): Promise<void> {
    const tenantId = this.getTenantId();
    const result = await this.brandRepository.delete({ id, tenantId });
    if (result.affected === 0) {
      throw new NotFoundException('Brand not found');
    }
  }

  // ──────────────────────────────────────────────
  //  PROVEEDORES
  // ──────────────────────────────────────────────

  async createSupplier(dto: CreateProveedorDto): Promise<Supplier> {
    const tenantId = this.getTenantId();
    const supplier = this.supplierRepository.create({ ...dto, tenantId });
    return this.supplierRepository.save(supplier);
  }

  async findAllSuppliers(): Promise<Supplier[]> {
    const tenantId = this.getTenantId();
    return this.supplierRepository.find({
      where: { tenantId },
      order: { name: 'ASC' },
    });
  }

  async findSupplierById(id: string): Promise<Supplier> {
    const tenantId = this.getTenantId();
    const supplier = await this.supplierRepository.findOne({
      where: { id, tenantId },
    });
    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }
    return supplier;
  }

  async updateSupplier(id: string, dto: UpdateProveedorDto): Promise<Supplier> {
    const tenantId = this.getTenantId();
    const supplier = await this.supplierRepository.findOne({
      where: { id, tenantId },
    });
    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }
    if (dto.name !== undefined) supplier.name = dto.name;
    if (dto.contactName !== undefined) supplier.contactName = dto.contactName;
    if (dto.email !== undefined) supplier.email = dto.email;
    if (dto.phone !== undefined) supplier.phone = dto.phone;
    if (dto.isActive !== undefined) supplier.isActive = dto.isActive;
    return this.supplierRepository.save(supplier);
  }

  async deleteSupplier(id: string): Promise<void> {
    const tenantId = this.getTenantId();

    const supplier = await this.supplierRepository.findOne({
      where: { id, tenantId },
    });
    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    const productCount = await this.productRepository.count({
      where: { supplier: { id }, tenantId },
    });
    if (productCount > 0) {
      throw new ConflictException(
        `Cannot delete supplier: ${productCount} product(s) are associated with this supplier`,
      );
    }

    const result = await this.supplierRepository.delete({ id, tenantId });
    if (result.affected === 0) {
      throw new NotFoundException('Supplier not found');
    }
  }
}
