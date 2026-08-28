import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { RoteiroService } from './roteiro.service';
import { GerarRoteiroDto } from './dto/gerar-roteiro.dto';
import { PrismaService } from '../common/prisma.service';

@Controller('roteiro')
export class RoteiroController {
  constructor(
    private readonly roteiroService: RoteiroService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('gerar')
  gerar(@Body() dto: GerarRoteiroDto) {
    return this.roteiroService.gerarRoteiro(dto);
  }

  /**
   * Pausa 1 (seção 3.1 do plano): busca o roteiro gerado pra revisão manual
   * antes de seguir pra geração de imagem/áudio.
   */
  @Get(':jobId')
  async buscar(@Param('jobId') jobId: string) {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException(`Job ${jobId} não encontrado`);
    return {
      id: job.id,
      status: job.status,
      roteiro: job.roteiroJson ? JSON.parse(job.roteiroJson) : null,
      erro: job.erro,
    };
  }
}
