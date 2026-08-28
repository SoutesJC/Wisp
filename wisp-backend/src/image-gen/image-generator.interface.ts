// Contrato comum pra qualquer provedor de geração de imagem.
// Implementações concretas (Nano Banana, Imagen, etc.) entram na Fase 3 —
// trocar de provedor não deve exigir mudar nada fora deste módulo.

export interface ImageGenerationResult {
  filePath: string;
  provider: string;
  costUsd: number;
}

export interface ImageGenerator {
  generate(prompt: string): Promise<ImageGenerationResult>;
}

export const IMAGE_GENERATOR = Symbol('IMAGE_GENERATOR');
