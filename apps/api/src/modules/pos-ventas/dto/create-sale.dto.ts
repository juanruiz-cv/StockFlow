import {
  IsUUID,
  IsNumber,
  IsPositive,
  IsOptional,
  IsString,
  IsArray,
  ValidateNested,
  IsEnum,
  MinLength,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SaleItemDto {
  @IsUUID('4')
  productId!: string;

  @IsNumber()
  @IsPositive()
  quantity!: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  unitPrice?: number;
}

export class PaymentDto {
  @IsEnum(['cash', 'card', 'transfer'] as const)
  type!: 'cash' | 'card' | 'transfer';

  @IsNumber()
  @IsPositive()
  amount!: number;
}

export class CreateSaleDto {
  @IsOptional()
  @IsUUID('4')
  customerId?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SaleItemDto)
  items!: SaleItemDto[];

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PaymentDto)
  payments!: PaymentDto[];

  @IsOptional()
  @IsString()
  @MinLength(1)
  notes?: string;
}
