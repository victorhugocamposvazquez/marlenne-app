'use client';

import type { VoiceAdapter } from '@/components/chat/MarlenChat';
import { pickEngine } from '@/hooks/voice-engine';

/** Envuelve el motor de voz de la app para el panel del chat. */
export function createVoiceAdapter(): VoiceAdapter {
  return {
    start(onPartial, onFinal) {
      const engine = pickEngine();
      engine.onPartial = text => {
        onPartial({ text, understood: text ? [text] : [] });
      };
      engine.onFinal = text => {
        onFinal(text.trim());
      };
      engine.onUnavailable = () => {
        onFinal('');
      };
      engine.onDenied = () => {
        onFinal('');
      };
      void engine.start();
      return () => {
        engine.abort();
      };
    },
  };
}
