import { Idioma } from '../common/roteiro.types';

const GUIA_NARRADOR = `Tom do Narrador (usado em "entrada" e nos "ganchos"): voz neutra, direta,
sem características marcantes — só apresenta a situação e constrói a
expectativa passo a passo. Não é engraçado nem irônico; é o contraste com o
Wisp que faz a virada funcionar.`;

const GUIA_WISP = `Tom do Wisp (usado só em "reviravolta"): poético, sádico e irônico, mas NUNCA
diretamente cruel. Ele entrega a virada como quem sacode a cabeça sorrindo,
achando graça da ironia da situação — não zombando de sofrimento real, não
humilhando ninguém, não descendo o nível. É a voz de quem percebe a piada
cósmica por trás dos eventos e entrega isso com prazer malicioso mas
afetuoso. Se a única forma de fazer a reviravolta funcionar for à custa de
crueldade genuína, prefira uma virada mais fraca a cruzar essa linha, pragmatismo lúcido 
sobre como as coisas realmente funcionam, nunca cruel; comenta o tema por trás da virada 
(perda, perspectiva) em vez de narrar o fato.`;

const EXEMPLO_FEW_SHOT = `Exemplo (estrutura, não o assunto — não repita este tema):
entrada: "João foi à padaria"
gancho 1 (semente=false): "João levou 10 reais"
gancho 2 (semente=true): "João voltou pra casa com os pães e os 10 reais"
reviravolta (resolve o gancho 2): "Outro cliente tinha pago os pães do João"

Note que o gancho 2 já planta uma pergunta implícita (como assim ele voltou
com o dinheiro?) e a reviravolta responde especificamente a ela — não é uma
ironia genérica solta no final.`;

export function buildSystemPrompt(idioma: Idioma): string {
  const idiomaTexto = idioma === 'pt-BR' ? 'português do Brasil' : 'inglês';
  return `Você monta roteiros curtos para vídeos verticais de poucos segundos,
narrados por dois personagens que não interagem entre si: o Narrador
(entrada + ganchos) e o Wisp (reviravolta).

Estrutura obrigatória: entrada → 2 a 5 ganchos → reviravolta. Um gancho
(e só um) carrega a "semente": um detalhe estranho ou incompleto que fica
sem explicação até a reviravolta resolver especificamente ele — não vale
a reviravolta ser uma ironia genérica desconectada dos ganchos.

${GUIA_NARRADOR}

${GUIA_WISP}

${EXEMPLO_FEW_SHOT}

Cada item (entrada, cada gancho, reviravolta) também precisa de um
imagemPrompt: uma descrição em INGLÊS, visual e concreta, pra um gerador de
imagem representar aquele momento — sem texto/palavras dentro da imagem.

Idioma do texto narrado (não do imagemPrompt): ${idiomaTexto}.

Narração completa (entrada + todos os ganchos + reviravolta) Duração alvo de 
narração: 20–35s, com peso desigual — ganchos enxutos (~15–25 palavras cada), 
fala do Wisp mais longa e elaborada (~35–60 palavras): é o clímax, não uma linha a mais.

Use a tool "${'salvar_roteiro'}" pra devolver o resultado. Não responda em
texto livre.`;
}

export function buildUserPromptModoAssunto(assunto: string): string {
  return `Monte um roteiro completo (entrada, ganchos com uma semente, e
reviravolta) a partir deste assunto: "${assunto}"`;
}

export function buildUserPromptModoGanchos(
  assunto: string,
  ganchos: { texto: string; semente?: boolean }[],
): string {
  const listaGanchos = ganchos
    .map(
      (g, i) => `${i}. ${g.texto}${g.semente ? ' [marcado como semente]' : ''}`,
    )
    .join('\n');
  const algumaMarcada = ganchos.some((g) => g.semente);
  return `Assunto: "${assunto}"

Os ganchos já estão escritos, use-os exatamente como estão (não reescreva o
texto deles, só gere o imagemPrompt de cada um):
${listaGanchos}

${
  algumaMarcada
    ? 'Um gancho já foi marcado como semente acima — respeite essa marcação.'
    : 'Nenhum gancho foi marcado como semente — escolha o que melhor serve de base pra uma reviravolta e marque semente=true nele.'
}

Escreva a reviravolta (na voz do Wisp) resolvendo especificamente a semente.`;
}

export function buildUserPromptModoCompleto(roteiro: {
  entrada: string;
  ganchos: { texto: string; semente: boolean }[];
  reviravolta: string;
}): string {
  const listaGanchos = roteiro.ganchos
    .map((g, i) => `${i}. ${g.texto}${g.semente ? ' [semente]' : ''}`)
    .join('\n');
  return `O roteiro já está pronto — não reescreva nenhum texto. Só valide a
estrutura e gere o imagemPrompt de cada item.

entrada: "${roteiro.entrada}"
ganchos:
${listaGanchos}
reviravolta: "${roteiro.reviravolta}"

Devolva os mesmos textos, com resolveGanchoIndex apontando pro índice do
gancho marcado [semente].`;
}
