// Tipos compartilhados do roteiro estruturado.
// Espelha o schema JSON do plano técnico, seção 1 — entrada/ganchos/reviravolta,
// com a regra da "semente": um gancho carrega o detalhe que a reviravolta resolve.

export type Idioma = 'pt-BR' | 'en';

export interface RoteiroBeat {
  id: string;
  texto: string;
  imagemPrompt: string;
}

export interface Gancho extends RoteiroBeat {
  semente: boolean;
}

export interface Reviravolta extends RoteiroBeat {
  /** id do gancho (semente) que esta reviravolta resolve */
  resolve: string;
}

export interface Roteiro {
  idioma: Idioma;
  entrada: RoteiroBeat;
  ganchos: Gancho[];
  reviravolta: Reviravolta;
}

export enum InputMode {
  SO_ASSUNTO = 'so_assunto',
  ASSUNTO_MAIS_GANCHOS = 'assunto_mais_ganchos',
  ROTEIRO_COMPLETO = 'roteiro_completo',
}

/** Quem narra cada parte — ver plano técnico, seção 2. */
export type VoicePersona = 'narrador' | 'wisp';
