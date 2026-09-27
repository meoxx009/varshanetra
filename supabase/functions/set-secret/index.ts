// Supabase Edge Function: set-secret
// Securely stores or updates encrypted secrets in Supabase Vault (vault.secrets)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface SetSecretRequest {
  name: string;
  secret: string;
  description?: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase backend credentials in Edge Function environment.");
    }

    // Create Supabase Admin client with Service Role Key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user authorization from header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization bearer token." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid user session or token expired." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Role check: Only SUPER_ADMIN or DM can set secrets
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || !["SUPER_ADMIN", "DM"].includes(profile.role)) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Super Admin or District Magistrate role required." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: SetSecretRequest = await req.json();
    const { name, secret, description = "" } = body;

    if (!name || typeof secret !== "string") {
      return new Response(
        JSON.stringify({ error: "Fields 'name' and 'secret' are required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call stored procedure public.set_vault_secret
    const { data, error: rpcError } = await supabase.rpc("set_vault_secret", {
      p_name: name,
      p_secret: secret.trim(),
      p_description: description,
    });

    if (rpcError) {
      console.error("[set-secret] RPC Error:", rpcError);
      return new Response(
        JSON.stringify({ error: `Vault error: ${rpcError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Secret '${name}' successfully committed to Supabase Vault.`,
        data,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Unexpected internal error";
    console.error("[set-secret] Exception:", errorMsg);
    return new Response(
      JSON.stringify({ error: errorMsg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
