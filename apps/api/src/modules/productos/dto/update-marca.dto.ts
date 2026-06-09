import { IsString, IsOptional, IsBoolean, MinLength } from 'class-validator';

export class UpdateMarcaDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
