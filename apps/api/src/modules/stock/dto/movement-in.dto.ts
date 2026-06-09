import {
  IsUUID,
  IsNumber,
  IsPositive,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class MovementInDto {
  @IsUUID('4')
  productId!: string;

  @IsNumber()
  @IsPositive()
  quantity!: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  unitPrice?: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  reason?: string;

  @IsOptional()
  @IsString()
  referenceType?: string;

  @IsOptional()
  @IsUUID('4')
  referenceId?: string;
}
