import { z } from 'zod';
import { Idioma, Roteiro } from '../common/roteiro.types';

// Esquema que vai pro Claude como definição de tool (tool_use + tool_choice
// forçado — GA desde 2024, funciona em todos os modelos atuais). Deliberadamente
// NÃO usamos o beta "structured outputs" (output_format): na verificação de
// hoje, esse recurso está em beta, exige header anthropic-beta específico e a
// documentação lista suporte só pra Sonnet 4.5/Opus 4.1 — não Sonnet 5, que é
// o modelo que escolhemos (seção 4.1 do plano). tool_use plano é mais chato de
// garantir 100% do schema, por isso validamos com Zod depois de receber.
//
// Claude referencia qual gancho é a "semente" por índice (0-based) em vez de
// inventar/casar um id de string — é mais confiável, e os ids reais (g1, g2...)
// são gerados no código depois de validar.

export const ROTEIRO_TOOL_NAME = 'salvar_roteiro';

export const ROTEIRO_INPUT_SCHEMA = {
  type: 'object' as const,
  properties: {
    entrada: {
      type: 'object' as const,
      properties: {
        texto: {
          type: 'string' as const,
          description: 'Frase de entrada que estabelece a situação inicial.',
        },
        imagemPrompt: {
          type: 'string' as const,
          description:
            'Prompt em inglês pra um gerador de imagem, descrevendo a cena desse momento.',
        },
      },
      required: ['texto', 'imagemPrompt'],
    },
    ganchos: {
      type: 'array' as const,
      minItems: 2,
      maxItems: 5,
      items: {
        type: 'object' as const,
        properties: {
          texto: { type: 'string' as const },
          imagemPrompt: { type: 'string' as const },
          semente: {
            type: 'boolean' as const,
            description:
              'true se este gancho carrega o detalhe estranho/incompleto que a reviravolta vai resolver. Exatamente um gancho do array deve ter semente=true.',
          },
        },
        required: ['texto', 'imagemPrompt', 'semente'],
      },
    },
    reviravolta: {
      type: 'object' as const,
      properties: {
        texto: {
          type: 'string' as const,
          description: 'A virada, narrada na voz do Wisp.',
        },
        imagemPrompt: { type: 'string' as const },
        resolveGanchoIndex: {
          type: 'integer' as const,
          description:
            'Índice (0-based) do gancho com semente=true que esta reviravolta resolve.',
        },
      },
      required: ['texto', 'imagemPrompt', 'resolveGanchoIndex'],
    },
  },
  required: ['entrada', 'ganchos', 'reviravolta'],
};

const BeatRawSchema = z.object({
  texto: z.string().min(1),
  imagemPrompt: z.string().min(1),
});

export const RoteiroRawSchema = z.object({
  entrada: BeatRawSchema,
  ganchos: z
    .array(BeatRawSchema.extend({ semente: z.boolean() }))
    .min(2)
    .max(5),
  reviravolta: BeatRawSchema.extend({
    resolveGanchoIndex: z.number().int(),
  }),
});

export type RoteiroRaw = z.infer<typeof RoteiroRawSchema>;

/**
 * Validação de negócio que o Zod sozinho não cobre: exatamente uma semente,
 * e o índice que a reviravolta resolve precisa apontar pra ela.
 * Lança erro descritivo — o service usa isso pra decidir se regenera.
 */
export function validarRegrasNarrativas(raw: RoteiroRaw): void {
  const sementes = raw.ganchos.filter((g) => g.semente);
  if (sementes.length !== 1) {
    throw new Error(
      `Esperava exatamente 1 gancho com semente=true, veio ${sementes.length}.`,
    );
  }
  const idx = raw.reviravolta.resolveGanchoIndex;
  if (idx < 0 || idx >= raw.ganchos.length || !raw.ganchos[idx].semente) {
    throw new Error(
      `resolveGanchoIndex (${idx}) não aponta pro gancho semente.`,
    );
  }
}

/** Monta o Roteiro final com ids (e1, g1, g2...) a partir da resposta crua. */
export function montarRoteiro(raw: RoteiroRaw, idioma: Idioma): Roteiro {
  const ganchos = raw.ganchos.map((g, i) => ({
    id: `g${i + 1}`,
    texto: g.texto,
    imagemPrompt: g.imagemPrompt,
    semente: g.semente,
  }));
  const ganchoResolvido = ganchos[raw.reviravolta.resolveGanchoIndex];
  return {
    idioma,
    entrada: {
      id: 'e1',
      texto: raw.entrada.texto,
      imagemPrompt: raw.entrada.imagemPrompt,
    },
    ganchos,
    reviravolta: {
      id: 'reviravolta',
      texto: raw.reviravolta.texto,
      imagemPrompt: raw.reviravolta.imagemPrompt,
      resolve: ganchoResolvido.id,
    },
  };
}
