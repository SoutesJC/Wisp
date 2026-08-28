import { VoicePersona } from '../common/roteiro.types';

// Contrato comum pra qualquer provedor de TTS. Implementação concreta
// (ElevenLabs) entra na Fase 2 — ver plano técnico, seção 4.2.

export interface WordTimestamp {
  word: string;
  startMs: number;
  endMs: number;
}

export interface TtsResult {
  filePath: string;
  durationMs: number;
  timestamps: WordTimestamp[];
  provider: string;
  costUsd: number;
}

export interface TextToSpeech {
  /**
   * @param voice 'narrador' ou 'wisp' — cada um mapeia pra um voice_id fixo
   * do provedor (nunca varia entre vídeos, ver seção 2.1 do plano).
   */
  synthesize(text: string, voice: VoicePersona): Promise<TtsResult>;
}

export const TEXT_TO_SPEECH = Symbol('TEXT_TO_SPEECH');
