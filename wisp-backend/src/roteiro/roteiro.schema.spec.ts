import {
  RoteiroRawSchema,
  validarRegrasNarrativas,
  montarRoteiro,
  RoteiroRaw,
} from './roteiro.schema';

function exemploValido(): RoteiroRaw {
  return {
    entrada: { texto: 'João foi à padaria', imagemPrompt: 'a boy at a bakery' },
    ganchos: [
      {
        texto: 'João levou 10 reais',
        imagemPrompt: 'boy holding cash',
        semente: false,
      },
      {
        texto: 'João voltou pra casa com os pães e os 10 reais',
        imagemPrompt: 'boy walking home with bread and cash',
        semente: true,
      },
    ],
    reviravolta: {
      texto: 'Outro cliente tinha pago os pães do João',
      imagemPrompt: 'a customer smiling while paying',
      resolveGanchoIndex: 1,
    },
  };
}

describe('RoteiroRawSchema', () => {
  it('aceita o formato válido', () => {
    expect(() => RoteiroRawSchema.parse(exemploValido())).not.toThrow();
  });

  it('rejeita menos de 2 ganchos', () => {
    const invalido = exemploValido();
    invalido.ganchos = [invalido.ganchos[0]];
    expect(() => RoteiroRawSchema.parse(invalido)).toThrow();
  });

  it('rejeita mais de 5 ganchos', () => {
    const invalido = exemploValido();
    const gancho = invalido.ganchos[0];
    invalido.ganchos = [gancho, gancho, gancho, gancho, gancho, gancho];
    expect(() => RoteiroRawSchema.parse(invalido)).toThrow();
  });
});

describe('validarRegrasNarrativas', () => {
  it('aceita quando exatamente 1 gancho é semente e a reviravolta aponta pra ele', () => {
    expect(() => validarRegrasNarrativas(exemploValido())).not.toThrow();
  });

  it('rejeita quando nenhum gancho é semente', () => {
    const raw = exemploValido();
    raw.ganchos.forEach((g) => (g.semente = false));
    expect(() => validarRegrasNarrativas(raw)).toThrow(/exatamente 1/);
  });

  it('rejeita quando mais de um gancho é semente', () => {
    const raw = exemploValido();
    raw.ganchos.forEach((g) => (g.semente = true));
    expect(() => validarRegrasNarrativas(raw)).toThrow(/exatamente 1/);
  });

  it('rejeita quando resolveGanchoIndex não aponta pra semente', () => {
    const raw = exemploValido();
    raw.reviravolta.resolveGanchoIndex = 0; // gancho 0 não é semente
    expect(() => validarRegrasNarrativas(raw)).toThrow(/não aponta/);
  });

  it('rejeita índice fora do array', () => {
    const raw = exemploValido();
    raw.reviravolta.resolveGanchoIndex = 99;
    expect(() => validarRegrasNarrativas(raw)).toThrow(/não aponta/);
  });
});

describe('montarRoteiro', () => {
  it('gera ids sequenciais e a reviravolta resolve o id certo', () => {
    const roteiro = montarRoteiro(exemploValido(), 'pt-BR');

    expect(roteiro.entrada.id).toBe('e1');
    expect(roteiro.ganchos.map((g) => g.id)).toEqual(['g1', 'g2']);
    expect(roteiro.ganchos[1].semente).toBe(true);
    // resolveGanchoIndex=1 no exemplo → deve resolver o id do gancho[1] (g2)
    expect(roteiro.reviravolta.resolve).toBe('g2');
  });

  it('preserva os textos e prompts de imagem sem alteração', () => {
    const raw = exemploValido();
    const roteiro = montarRoteiro(raw, 'en');

    expect(roteiro.entrada.texto).toBe(raw.entrada.texto);
    expect(roteiro.reviravolta.texto).toBe(raw.reviravolta.texto);
    expect(roteiro.idioma).toBe('en');
  });
});
