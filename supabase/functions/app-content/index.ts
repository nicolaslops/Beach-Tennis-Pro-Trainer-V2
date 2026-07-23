import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Json = Record<string, unknown>;
type Plan = "free" | "plus" | "pro";

const FREE_EXERCISE_IDS = new Set([
  "BT-V2-INI-001", "BT-V2-INI-003", "BT-V2-INI-006", "BT-V2-INI-008", "BT-V2-INI-010",
  "BT-V2-INI-014", "BT-V2-INI-018", "BT-V2-INI-022", "BT-V2-INI-024",
  "BT-V2-INT-002", "BT-V2-INT-004", "BT-V2-INT-006", "BT-V2-INT-010", "BT-V2-INT-012",
  "BT-V2-INT-016", "BT-V2-INT-022", "BT-V2-INT-028",
  "BT-V2-AVA-001", "BT-V2-AVA-006", "BT-V2-AVA-008", "BT-V2-AVA-012", "BT-V2-AVA-016",
  "BT-V2-AVA-020", "BT-V2-AVA-026", "BT-V2-AVA-036"
]);

const CONTENT = JSON.parse(
  await Deno.readTextFile(new URL("./content.json", import.meta.url))
) as {
  exercicios: Json[];
  planos_aula: Json[];
  planos_evolucao: Json[];
};

function requiredEnv(name: string) {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`missing_env_${name}`);
  return value;
}

function allowedOrigins() {
  return (Deno.env.get("APP_ALLOWED_ORIGINS") || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function corsHeaders(request: Request) {
  const origin = request.headers.get("origin") || "";
  const allowed = allowedOrigins();
  if (allowed.length > 0 && origin && !allowed.includes(origin)) return null;
  return {
    "access-control-allow-origin": allowed.length === 0 ? "*" : origin,
    "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
    "access-control-allow-methods": "POST, OPTIONS",
    "vary": "Origin"
  };
}

function response(request: Request, status: number, body: Json) {
  const cors = corsHeaders(request);
  if (!cors) {
    return new Response(JSON.stringify({ ok: false, error: "origin_not_allowed" }), {
      status: 403,
      headers: { "content-type": "application/json; charset=utf-8" }
    });
  }
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...cors,
      "content-type": "application/json; charset=utf-8",
      "cache-control": "private, no-store, max-age=0"
    }
  });
}

function normalizePlan(value: unknown): Plan {
  const plan = String(value || "free").toLowerCase();
  return plan === "plus" || plan === "pro" ? plan : "free";
}

function authorizedContent(plan: Plan) {
  if (plan === "pro") return CONTENT;
  if (plan === "plus") {
    return {
      exercicios: CONTENT.exercicios,
      planos_aula: [],
      planos_evolucao: CONTENT.planos_evolucao
    };
  }
  return {
    exercicios: CONTENT.exercicios.filter((exercise) => FREE_EXERCISE_IDS.has(String(exercise.id || ""))),
    planos_aula: [],
    planos_evolucao: []
  };
}

serve(async (request) => {
  const cors = corsHeaders(request);
  if (!cors) return response(request, 403, { ok: false, error: "origin_not_allowed" });
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (request.method !== "POST") return response(request, 405, { ok: false, error: "method_not_allowed" });

  try {
    const authorization = request.headers.get("authorization") || "";
    const token = authorization.replace(/^Bearer\s+/i, "").trim();
    if (!token) return response(request, 401, { ok: false, error: "authentication_required" });

    const supabaseUrl = requiredEnv("SUPABASE_URL");
    const publicKey = requiredEnv("SUPABASE_ANON_KEY");
    const serviceKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
    const authClient = createClient(supabaseUrl, publicKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` } }
    });
    const { data: authData, error: authError } = await authClient.auth.getUser(token);
    if (authError || !authData.user) {
      return response(request, 401, { ok: false, error: "invalid_session" });
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    const { error: expirationError } = await admin.rpc("expire_due_subscriptions");
    if (expirationError) throw expirationError;
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("plan,access_active,access_type,permanent_plan,lifetime_access,legacy_plan,legacy_review_required")
      .eq("id", authData.user.id)
      .maybeSingle();

    if (profileError) throw profileError;
    if (!profile) return response(request, 403, { ok: false, error: "profile_not_found" });
    if (profile.access_active === false) {
      return response(request, 403, { ok: false, error: "account_inactive" });
    }

    const plan = profile.access_type === "one_time"
      ? normalizePlan(profile.permanent_plan || profile.plan)
      : profile.lifetime_access === true
        ? normalizePlan(profile.legacy_plan || profile.permanent_plan || profile.plan || "pro")
        : profile.legacy_review_required === true
          ? "pro"
          : normalizePlan(profile.plan);
    const content = authorizedContent(plan);

    return response(request, 200, {
      ok: true,
    version: "120",
      plan,
      content,
      counts: {
        exercicios: content.exercicios.length,
        planos_aula: content.planos_aula.length,
        planos_evolucao: content.planos_evolucao.length
      }
    });
  } catch (_error) {
    console.error("App content request failed without sensitive details.");
    return response(request, 500, { ok: false, error: "content_unavailable" });
  }
});
