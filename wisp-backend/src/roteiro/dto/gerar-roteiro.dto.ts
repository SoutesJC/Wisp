import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { InputMode } from '../../common/roteiro.types';

export class GanchoInputDto {
  @IsString()
  @MinLength(1)
  texto: string;

  @IsOptional()
  @IsBoolean()
  semente?: boolean;
}

export class RoteiroCompletoInputDto {
  @IsString()
  @MinLength(1)
  entrada: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GanchoInputDto)
  ganchos: { texto: string; semente: boolean }[];

  @IsString()
  @MinLength(1)
  reviravolta: string;
}

export class GerarRoteiroDto {
  @IsEnum(InputMode)
  modo: InputMode;

  @IsIn(['pt-BR', 'en'])
  idioma: 'pt-BR' | 'en';

  // modo SO_ASSUNTO e ASSUNTO_MAIS_GANCHOS
  @IsOptional()
  @IsString()
  @MinLength(1)
  assunto?: string;

  // modo ASSUNTO_MAIS_GANCHOS
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GanchoInputDto)
  ganchos?: GanchoInputDto[];

  // modo ROTEIRO_COMPLETO
  @IsOptional()
  @ValidateNested()
  @Type(() => RoteiroCompletoInputDto)
  roteiroCompleto?: RoteiroCompletoInputDto;
}
