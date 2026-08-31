import { useEffect, useState } from 'react';

export interface PassoTutorial {
  alvoSelector: string;
  titulo: string;
  texto: string;
}

/**
 * Controla um tutorial passo-a-passo simples, guardando "já vi esse
 * tutorial" no localStorage do navegador (por chave versionada — trocar a
 * chave, ex. de "_v1" pra "_v2", faz o tutorial reaparecer pra todo mundo
 * depois de um redesenho). Sem depender de nenhuma tabela no banco: o
 * trade-off é que o estado é por navegador, não por conta — por isso a
 * página também expõe um jeito de reiniciar manualmente.
 */
export function useTutorial(chave: string, passos: PassoTutorial[]) {
  const chaveStorage = `tutorial_concluido:${chave}`;
  const [ativo, setAtivo] = useState(false);
  const [passoAtual, setPassoAtual] = useState(0);

  useEffect(() => {
    let concluido = false;
    try {
      concluido = localStorage.getItem(chaveStorage) === '1';
    } catch {
      /* localStorage indisponível (aba privada, etc.) — só não auto-inicia */
    }
    if (!concluido) setAtivo(true);
  }, [chaveStorage]);

  function marcarConcluido() {
    try {
      localStorage.setItem(chaveStorage, '1');
    } catch {
      /* sem persistência — tutorial pode voltar a aparecer, sem problema */
    }
  }

  function proximo() {
    setPassoAtual((p) => {
      const proximoPasso = p + 1;
      if (proximoPasso >= passos.length) {
        setAtivo(false);
        marcarConcluido();
        return p;
      }
      return proximoPasso;
    });
  }

  function anterior() {
    setPassoAtual((p) => Math.max(p - 1, 0));
  }

  function pular() {
    setAtivo(false);
    marcarConcluido();
  }

  function reiniciar() {
    setPassoAtual(0);
    setAtivo(true);
  }

  return {
    ativo,
    passoAtual,
    passoTotal: passos.length,
    passo: passos[passoAtual],
    proximo,
    anterior,
    pular,
    reiniciar,
  };
}
