export interface Usuario {
  id: string
  nome?: string
  id_setor?: string
  role?: string
  created_at?: string
  foto_url?: string
}

export interface UsuarioPerfil {
  id: string
  nome: string
  cargo?: string
  criado_em?: string
  role_id?: string
  user_id?: string
}

export interface Perfil {
  id: string
  nome?: string
  email?: string
  cargo?: string
  criado_em?: string
  foto_url?: string
  role?: string
  id_setor?: string
}

// ======================
// Estrutura Organizacional
// ======================
export interface Role {
  id: string
  nome: string
  descricao?: string
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
  id_setor?: string
}

export interface Operadora {
  id: string
  nome: string
  created_at: string
  updated_at: string
}

// ======================
// Ações e Etapas
// ======================
export interface Acao {
  id: string
  pda_id_original?: string
  nm_filial?: string
  categoria_acao?: string
  acao_descricao: string
  causa_raiz?: string
  vl_impacto?: number
  mes_referencia?: string
  id_setor_responsavel?: string
  id_responsavel?: string
  chamado?: string
  id_glosa?: string
  sn_glosa_guia?: boolean
  id_operadora?: string
  cd_pro_fat?: string
  ds_gru_fat?: string
  cd_setor_origem?: string
  ds_pro_fat?: string
  dt_inicio_acao?: string
  dt_termino_acao?: string
  porcentagem_conclusao?: number
  id_status_acao?: string
  observacoes?: string
  created_at: string
  updated_at: string
}

export interface Etapa {
  id: string
  id_acao: string
  pda_etapa_id_original?: string
  etapa_ordem: number
  etapa_descricao: string
  id_responsavel?: string
  dt_inicio_etapa?: string
  dt_termino_etapa?: string
  porcentagem_conclusao_etapa?: number
  id_status_etapa: string
  created_at: string
  updated_at: string
  dt_inicio_real?: string
  dt_fim_real?: string
}

// Histórico de mudanças de status
export interface EtapaHistorico {
  id: string
  etapa_id: string
  status_anterior?: string
  status_novo?: string
  criado_em?: string
  criado_por?: string
}

// ======================
// Comentários e Anexos
// ======================
export interface ComentarioEtapa {
  id: string
  etapa_id: string
  mensagem: string
  criado_em?: string
  criado_por?: string
}

export interface AnexoEtapa {
  id: string
  etapa_id?: string
  nome_arquivo?: string
  caminho?: string
  criado_em?: string
  criado_por?: string
}

// ======================
// Status
// ======================
export interface StatusAcaoTipo {
  id: string
  nome: string
  descricao?: string
  created_at: string
  updated_at: string
}

export interface StatusEtapaTipo {
  id: string
  nome: string
  descricao?: string
  created_at: string
  updated_at: string
}

// ======================
// Glosas
// ======================
export interface Glosa {
  id: string
  codigo: string
  descricao?: string
  tipo?: string
  vl_impacto?: number
  mes_referencia?: string
  cd_pro_fat?: string
  ds_gru_fat?: string
  cd_setor?: string
  ds_pro_fat?: string
  created_at: string
  updated_at: string
}
