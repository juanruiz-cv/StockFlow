import {
  IsEnum,
  IsNumber,
  IsPositive,
  IsOptional,
  IsString,
  MinLength,
  IsUUID,
} from 'class-validator';

export class CashMovementDto {
  @IsEnum(['IN', 'OUT'])
  type!: 'IN' | 'OUT';

  @IsNumber()
  @IsPositive()
  amount!: number;

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
