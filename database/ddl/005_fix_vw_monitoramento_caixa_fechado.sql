--------------------------------------------------------------------------------
-- 005_fix_vw_monitoramento_caixa_fechado.sql
--
-- Problema: a VW_MONITORAMENTO atual só considera documentos com
-- dtamovimento = trunc(sysdate). Um checkout fechado (especie FC) num dia
-- anterior, que ainda não teve nenhum documento hoje, não tem nenhuma linha
-- que passe nesse filtro — o row_number() não gera "linha 1" pra ele e o
-- caixa some do painel (exemplos observados em 31/08/2026: empresa 56 caixa 1
-- e empresa 72 caixa 1, ambos com último documento em 30/08/2026, especie FC).
--
-- Correção: trocar o filtro de data por uma janela de 3 dias
-- (dtamovimento >= trunc(sysdate) - 3), mantendo o row_number() ordenado por
-- dtamovimento desc, seqdocto desc — quem tiver documento hoje sempre vence
-- (dtamovimento máximo dentro da janela), então isso não muda nada pra quem
-- já está correto hoje. Só resolve o caso de caixa fechado há 1-3 dias sem
-- nenhum movimento ainda hoje.
--
-- Limitação que continua existindo (mesma da view antiga, só que menor):
-- um checkout sem NENHUM documento nos últimos 3 dias continua invisível no
-- painel. Se isso for um caso real (loja fechada por mais tempo, checkout
-- desativado etc.), avisar pra ajustar a janela.
--------------------------------------------------------------------------------

CREATE OR REPLACE VIEW painelpdvc5ia.vw_monitoramento AS
with tbdoctocheckout as
 (select b.nomereduzido, a.nroempresa, a.nrocheckout, a.seqdocto, a.especie,
         row_number() over(partition by a.nroempresa, a.nrocheckout order by a.dtamovimento desc, a.seqdocto desc) linha
    from consincomonitor.tb_docto@alianca a, consincomonitor.tb_empresa@alianca b
   where a.nroempresa = b.nroempresa
     and a.dtamovimento >= trunc(sysdate) - 3
     and a.especie in ('AC', 'FC', 'CF', 'NF', 'ST', 'DV', 'DE', 'DS'))
select a.nomereduzido,
       a.nroempresa,
       a.nrocheckout,
       decode(a.especie,
              'CF', 'Cupom Fiscal',
              'ST', 'Saída Temporária',
              'AC', 'Abertura de Caixa',
              'FC', 'Fechamento de Caixa') especie,
       case
          when a.especie = 'AC' then
           'Caixa aberto'
          when a.especie = 'FC' then
           'Caixa fechado'
          when a.especie = 'ST' then
           'Caixa com saída temporária'
          when a.especie = 'DV' then
           'Devolução de Venda'
          else
           'Caixa em venda'
        end status
  from tbdoctocheckout a
 where a.linha = 1;
