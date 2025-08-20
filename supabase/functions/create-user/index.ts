// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { email, password, nome, role, id_setor } = await req.json();
    if (!email) return new Response(JSON.stringify({ error: "email é obrigatório" }), { status: 400 });

    if (password) {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { nome: nome || null, role: role || "user", id_setor: id_setor || null },
      });
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true, user: data.user }), { status: 200 });
    }

    const { data, error } = await admin.auth.admin.inviteUserByEmail(
      email,
      { data: { nome: nome || null, role: role || "user", id_setor: id_setor || null } }
    );
    if (error) throw error;

    return new Response(JSON.stringify({ ok: true, user: data.user }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
});
