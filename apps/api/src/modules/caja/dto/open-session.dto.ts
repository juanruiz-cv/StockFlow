import {
  IsNumber,
  Min,
  IsOptional,
  IsString,
} from 'class-validator';

export class OpenSessionDto {
  @IsNumber()
  @Min(0)
  openingBalance!: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
