// supabase/functions/delete-user/index.ts

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
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
    const { id } = body ?? {};
    
    if (!id) {
      return j({ error: "BAD_REQUEST", message: "User ID is required." }, 400);
    }

    const SUPABASE_URL = Deno.env.get(ENV_URL);
    const SERVICE_ROLE_KEY = Deno.env.get(ENV_SRK);

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return j(
        {
          error: "MISSING_ENV",
          message: `Missing environment variables ${ENV_URL} or ${ENV_SRK}.`,
        },
        500
      );
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { "X-Client-Info": "delete-user-fn" } },
    });

    // Use the admin client with the service role key to securely delete the user.
    const { error: authErr } = await admin.auth.admin.deleteUser(id);

    if (authErr) {
      console.error("[delete-user] Failed to delete user:", authErr.message);
      return j({ error: "AUTH_DELETE_FAILED", message: authErr.message }, 400);
    }

    console.log(`[delete-user] User ${id} deleted successfully.`);
    return j({ ok: true }, 200);

  } catch (e) {
    console.error("[delete-user] Unexpected error:", e?.message || String(e));
    return j({ error: "UNEXPECTED", message: e?.message ?? String(e) }, 500);
  }
});