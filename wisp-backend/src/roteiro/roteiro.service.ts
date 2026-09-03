import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { PrismaService } from '../common/prisma.service';
import { InputMode, Roteiro } from '../common/roteiro.types';
import {
  ROTEIRO_INPUT_SCHEMA,
  ROTEIRO_TOOL_NAME,
  RoteiroRaw,
  RoteiroRawSchema,
  montarRoteiro,
  validarRegrasNarrativas,
} from './roteiro.schema';
import {
  buildSystemPrompt,
  buildUserPromptModoAssunto,
  buildUserPromptModoCompleto,
  buildUserPromptModoGanchos,
} from './roteiro.prompts';
import { GerarRoteiroDto } from './dto/gerar-roteiro.dto';

// Modelo fixado por versão específica (não alias) — seção 4.1 do plano.
// Configurável porque o formato do nome muda por gateway: Anthropic direta
// usa o nome puro ("claude-sonnet-5"), OpenRouter exige prefixo de provedor
// ("anthropic/claude-sonnet-5"). Reconferir docs.claude.com/openrouter.ai/docs
// se for trocar; não assumir que continua atual.
const MODEL_PADRAO = 'claude-sonnet-5';
const MAX_TOKENS = 2048;
const MAX_TENTATIVAS = 2;

@Injectable()
export class RoteiroService {
  private readonly logger = new Logger(RoteiroService.name);
  private readonly client: Anthropic;
  private readonly model: string;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.model = this.config.get<string>('ANTHROPIC_MODEL') || MODEL_PADRAO;

    // ANTHROPIC_BASE_URL vazio = Anthropic direta (padrão): autentica com
    // ANTHROPIC_API_KEY via header x-api-key.
    //
    // Setado (ex: gateway tipo OpenRouter, endpoint /v1/messages compatível
    // com a Anthropic): esses gateways autenticam com Bearer token, não
    // x-api-key — por isso authToken aqui, não apiKey. Confirmado direto no
    // client.d.ts instalado (@anthropic-ai/sdk expõe os dois, authToken usa
    // Authorization: Bearer). Usar ANTHROPIC_AUTH_TOKEN nesse caso, deixando
    // ANTHROPIC_API_KEY em branco pra não mandar os dois headers.
    //
    // tool_use/tool_choice passam intactos nesse modo (documentado pelo
    // OpenRouter). Não testado neste ambiente por falta de chave.
    const authToken = this.config.get<string>('ANTHROPIC_AUTH_TOKEN');
    this.client = new Anthropic({
      apiKey: authToken
        ? undefined
        : this.config.get<string>('ANTHROPIC_API_KEY'),
      authToken: authToken || undefined,
      baseURL: this.config.get<string>('ANTHROPIC_BASE_URL') || undefined,
    });
  }

  async gerarRoteiro(
    dto: GerarRoteiroDto,
  ): Promise<{ jobId: string; roteiro: Roteiro }> {
    const job = await this.prisma.job.create({
      data: {
        status: 'gerando_roteiro',
        inputMode: dto.modo,
        idioma: dto.idioma,
        assuntoOriginal: dto.assunto ?? dto.roteiroCompleto?.entrada,
      },
    });

    try {
      const roteiro = await this.executarComRetry(dto);

      const proximoStatus =
        dto.modo === InputMode.SO_ASSUNTO
          ? 'aguardando_revisao_roteiro'
          : 'gerando_midia';

      await this.prisma.job.update({
        where: { id: job.id },
        data: {
          status: proximoStatus,
          roteiroJson: JSON.stringify(roteiro),
        },
      });

      return { jobId: job.id, roteiro };
    } catch (err) {
      await this.prisma.job.update({
        where: { id: job.id },
        data: { status: 'falhou', erro: (err as Error).message },
      });
      throw err;
    }
  }

  private async executarComRetry(dto: GerarRoteiroDto): Promise<Roteiro> {
    let ultimoErro: Error | undefined;
    for (let tentativa = 1; tentativa <= MAX_TENTATIVAS; tentativa++) {
      try {
        const raw = await this.chamarClaude(dto);
        RoteiroRawSchema.parse(raw);
        validarRegrasNarrativas(raw);
        return montarRoteiro(raw, dto.idioma);
      } catch (err) {
        ultimoErro = err as Error;
        this.logger.warn(
          `Tentativa ${tentativa}/${MAX_TENTATIVAS} falhou: ${ultimoErro.message}`,
        );
      }
    }
    throw new Error(
      `Roteiro inválido após ${MAX_TENTATIVAS} tentativas: ${ultimoErro?.message}`,
    );
  }

  private async chamarClaude(dto: GerarRoteiroDto): Promise<RoteiroRaw> {
    const userPrompt = this.buildUserPrompt(dto);

    // tool_use com tool_choice forçado — não o beta output_format. Ver
    // comentário no topo de roteiro.schema.ts pro raciocínio completo.
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: MAX_TOKENS,
      system: buildSystemPrompt(dto.idioma),
      messages: [{ role: 'user', content: userPrompt }],
      tools: [
        {
          name: ROTEIRO_TOOL_NAME,
          description: 'Salva o roteiro estruturado gerado.',
          input_schema: ROTEIRO_INPUT_SCHEMA,
        },
      ],
      tool_choice: { type: 'tool', name: ROTEIRO_TOOL_NAME },
    });

    const toolUse = response.content.find((block) => block.type === 'tool_use');
    if (!toolUse || toolUse.type !== 'tool_use') {
      throw new Error('Claude não retornou um tool_use block.');
    }
    return toolUse.input as RoteiroRaw;
  }

  private buildUserPrompt(dto: GerarRoteiroDto): string {
    switch (dto.modo) {
      case InputMode.SO_ASSUNTO:
        if (!dto.assunto)
          throw new Error('assunto é obrigatório no modo SO_ASSUNTO');
        return buildUserPromptModoAssunto(dto.assunto);
      case InputMode.ASSUNTO_MAIS_GANCHOS:
        if (!dto.assunto || !dto.ganchos) {
          throw new Error(
            'assunto e ganchos são obrigatórios no modo ASSUNTO_MAIS_GANCHOS',
          );
        }
        return buildUserPromptModoGanchos(dto.assunto, dto.ganchos);
      case InputMode.ROTEIRO_COMPLETO:
        if (!dto.roteiroCompleto) {
          throw new Error(
            'roteiroCompleto é obrigatório no modo ROTEIRO_COMPLETO',
          );
        }
        return buildUserPromptModoCompleto(dto.roteiroCompleto);
    }
  }
}
