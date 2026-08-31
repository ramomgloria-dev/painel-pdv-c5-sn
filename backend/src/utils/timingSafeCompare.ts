import { timingSafeEqual } from 'node:crypto';

/**
 * Compara duas strings em tempo constante (evita timing attack ao validar a
 * senha decodificada do Consinco). timingSafeEqual exige buffers do mesmo
 * tamanho, então normalizamos o comprimento antes de comparar — strings de
 * tamanho diferente nunca são iguais de qualquer forma.
 */
export function timingSafeStringEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a, 'utf8');
  const bufferB = Buffer.from(b, 'utf8');

  if (bufferA.length !== bufferB.length) {
    // Ainda gasta um tempo comparável ao caso "igual" para não vazar,
    // por tempo de resposta, que o tamanho já está errado.
    timingSafeEqual(bufferA, bufferA);
    return false;
  }

  return timingSafeEqual(bufferA, bufferB);
}
