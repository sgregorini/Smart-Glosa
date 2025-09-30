// ======================
// Usuários
// ======================
export interface Usuario {
  id: string
  nome?: string
  id_setor?: string | null
  role?: string
  created_at?: string
  foto_url?: string | null
}

// ======================
// Estrutura Organizacional
// ======================
export interface Role {
  id: string
  nome: string
  descricao?: string | null
}

export interface Setor {
  id: string
  nome: string
  created_at: string
  updated_at: string
}

export interface Responsavel {
  id: string
  nome: string
  email: string
  created_at: string
  updated_at: string
  id_setor?: string | null
}

export interface Operadora {
  id: string
  nome: string
  created_at: string
  updated_at: string
}

// ======================
// Glosas
// ======================
export interface Glosa {
  id: string
  codigo: string
  descricao?: string | null
  tipo?: string | null
  vl_impacto?: number | null
  mes_referencia?: string | null
  cd_pro_fat?: string | null
  ds_gru_fat?: string | null
  cd_setor?: string | null
  ds_pro_fat?: string | null
  created_at: string
  updated_at: string
}

// ======================
// Status
// ======================
export interface StatusAcaoTipo {
  id: string
  nome: string
  descricao?: string | null
  created_at: string
  updated_at: string
}

export interface StatusEtapaTipo {
  id: string
  nome: string
  descricao?: string | null
  created_at: string
  updated_at: string
}

// ======================
// Ações (tabela base)
// ======================
export interface Acao {
  id: string
  pda_id_original?: string | null
  nm_filial?: string | null
  categoria_acao?: string | null
  acao_descricao: string
  causa_raiz?: string | null
  vl_impacto?: number | null
  mes_referencia?: string | null
  id_setor_responsavel?: string | null
  id_responsavel?: string | null
  chamado?: string | null

  /** @deprecated N:N agora (use operadoras_json/glosas_json nas views) */
  id_glosa?: string | null
  /** @deprecated N:N agora (use operadoras_json/glosas_json nas views) */
  id_operadora?: string | null

  sn_glosa_guia?: boolean | null
  cd_pro_fat?: string | null
  ds_gru_fat?: string | null
  cd_setor_origem?: string | null
  ds_pro_fat?: string | null

  dt_inicio_acao?: string | null
  dt_termino_acao?: string | null
  porcentagem_conclusao?: number | null
  id_status_acao?: string | null
  observacoes?: string | null

  created_at: string
  updated_at: string
}

// ======================
// Ações (view consolidada: vw_acoes_detalhe)
// ======================

export interface AcaoView // para dados lidos de vw_acoes_detalhe
{
  id: string
  acao_descricao: string
  causa_raiz: string | null
  vl_impacto: number | null
  dt_inicio_acao: string | null
  dt_termino_acao: string | null
  observacoes: string | null

  id_status_acao: string | null
  id_responsavel: string | null
  id_setor_responsavel: string | null

  created_at: string
  updated_at: string

  // nomes resolvidos
  nm_status_acao: string | null
  nm_responsavel: string | null
  nm_setor: string | null

  // agregados de etapas
  total_etapas: number
  etapas_concluidas: number
  progresso_percentual: number

  // relacionamentos N:N resolvidos
  operadoras_json: { id: string; nome: string }[]
  glosas_json: { id: string; codigo: string; descricao: string | null; ds_gru_fat?: string | null }[]
}

/** Compat para telas/detalhes que antes usavam AcaoDetalhe */
export type AcaoDetalhe = AcaoView

// ======================
// Etapas (tabela + view)
// ======================
export interface Etapa {
  id: string
  id_acao: string
  pda_etapa_id_original?: string | null
  etapa_ordem: number
  etapa_descricao: string
  id_responsavel?: string | null
  dt_inicio_etapa?: string | null
  dt_termino_etapa?: string | null
  porcentagem_conclusao_etapa?: number | null
  id_status_etapa: string
  created_at: string
  updated_at: string
  dt_inicio_real?: string | null
  dt_fim_real?: string | null
}

// View vw_etapas_detalhadas costuma expor nome do status e do responsável
export interface EtapaDetalhe extends Etapa {
  nm_responsavel?: string | null
  nm_status_etapa?: string | null
}

// ======================
// Histórico de mudanças de status da etapa
// ======================
export interface EtapaHistorico {
  id: string
  etapa_id: string
  status_anterior?: string | null  // UUID do status anterior
  status_novo?: string | null      // UUID do status novo
  criado_em?: string | null
  criado_por?: string | null       // pode ser texto/email/uuid conforme seu schema
}

// (Opcional) Se você tiver uma view com nomes já resolvidos:
export interface EtapaHistoricoView extends EtapaHistorico {
  nm_etapa?: string | null
  status_anterior_nome?: string | null
  status_novo_nome?: string | null
  criado_por_nome?: string | null
  tempo_em_status?: string | null
}
