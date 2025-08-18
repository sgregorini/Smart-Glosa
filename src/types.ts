// types.ts
export interface Acao {
  id: string;
  pda_id_original: string;
  nm_filial: string;
  acao_descricao: string;
  causa_raiz: string;
  vl_impacto: number;
  mes_referencia: string;
  dt_inicio_acao: string;
  dt_termino_acao: string;
  observacoes: string;
  created_at: string;
  updated_at: string;
  id_status_acao: string;
  id_setor_responsavel: string;
  id_responsavel: string;
  id_operadora: string;
  id_glosa: string;

  nm_responsavel: string;
  nm_setor_responsavel: string;
  cd_glosa: string;
  ds_gru_fat_glosa: string;
  nm_status_acao: string;
  nm_operadora: string;
  total_etapas: number;
  etapas_concluidas: number;
  progresso_percentual: number;
}



export interface Etapa {
  id: string;
  etapa_descricao: string;
  nm_responsavel: string;
  dt_inicio_etapa: string;
  dt_termino_etapa: string;
  porcentagem_conclusao_etapa: number;
  id_status_etapa: string;
  nm_status_etapa: string;
}

export type Responsavel = {
  id: string;
  nome: string;
  email: string;
  id_setor: string;
}
