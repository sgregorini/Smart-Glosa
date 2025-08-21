// index.ts (o arquivo da sua Edge Function no Supabase)

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

function j(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

const ENV_URL = "FUNC_SUPABASE_URL";
const ENV_SRK = "FUNC_SERVICE_ROLE_KEY";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return j({ error: "METHOD_NOT_ALLOWED" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const { email, password, nome, role, id_setor } = body ?? {};
    
    if (!email || !nome) {
      console.error("[create-user] Erro de validação: Email ou nome não fornecidos.");
      return j({ error: "BAD_REQUEST", message: "Email e nome são obrigatórios." }, 400);
    }

    const SUPABASE_URL = Deno.env.get(ENV_URL);
    const SERVICE_ROLE_KEY = Deno.env.get(ENV_SRK);

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      console.error("[create-user] Erro de inicialização: Variáveis de ambiente faltando.");
      return j(
        {
          error: "MISSING_ENV",
          message: `Variáveis ${ENV_URL} ou ${ENV_SRK} não definidas nas secrets do projeto.`,
          has: { [ENV_URL]: !!SUPABASE_URL, [ENV_SRK]: !!SERVICE_ROLE_KEY },
        },
        500
      );
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { "X-Client-Info": "create-user-fn" } },
    });

    // 1) Criação do usuário no Auth (GoTrue Admin)
    const { data: created, error: authErr } = await admin.auth.admin.createUser({
      email,
      password: password || undefined,
      email_confirm: true,
      user_metadata: { nome, role, id_setor },
    });

    if (authErr) {
      console.error("[create-user] Falha na criação do usuário no Auth:", authErr.message);
      const msg = authErr.message || "";
      let code = "AUTH_CREATE_FAILED";
      if (/already registered|User already exists/i.test(msg)) code = "USER_ALREADY_EXISTS";
      if (/password/i.test(msg)) code = "PASSWORD_POLICY_FAILED";

      return j(
        {
          error: code,
          message: msg || "Falha ao criar usuário no Auth",
          raw: authErr,
        },
        400
      );
    }

    const userId = created.user?.id;
    if (!userId) {
      console.error("[create-user] Falha crítica: ID de usuário não retornado após a criação.");
      return j({ error: "AUTH_CREATE_FAILED", message: "ID não retornado" }, 500);
    }

    // Ação duplicada removida. O gatilho do banco de dados já cuida disso.
    // 
    // console.log("[create-user] Tentando inserir perfil na tabela 'usuarios'...");
    // const { error: insErr } = await admin.from("usuarios").insert({
    //   id: userId,
    //   nome,
    //   role: role ?? "user",
    //   id_setor: id_setor || null,
    // });
    // if (insErr) {
    //   console.error("[create-user] Falha ao inserir no banco de dados:", insErr);
    //   console.log(`[create-user] Iniciando rollback: Deletando usuário ${userId} do Auth.`);
    //   await admin.auth.admin.deleteUser(userId).catch(e => {
    //     console.error(`[create-user] Erro no rollback: Falha ao deletar usuário ${userId}.`, e);
    //   });
    //   return j({ error: "DB_INSERT_FAILED", message: insErr.message, raw: insErr }, 500);
    // }
    // console.log("[create-user] Perfil inserido no banco com sucesso.");

    console.log("[create-user] Usuário criado no Auth com sucesso.");
    return j({ ok: true, id: userId }, 200);

  } catch (e) {
    console.error("[create-user] Erro inesperado:", e?.message || String(e));
    return j({ error: "UNEXPECTED", message: e?.message ?? String(e) }, 500);
  }
});
