import {
  IsUUID,
  IsNumber,
  Min,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class AdjustDto {
  @IsUUID('4')
  productId!: string;

  @IsNumber()
  @Min(0)
  newQuantity!: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  reason?: string;
}
