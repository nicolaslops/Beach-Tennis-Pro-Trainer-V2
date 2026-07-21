import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient, type SupabaseClient, type User } from "https://esm.sh/@supabase/supabase-js@2";

type Json = Record<string, unknown>;

const ACTIVE_STATUS = "approved";
const APPROVED_EVENTS = new Set(["PURCHASE_APPROVED"]);
const INACTIVE_EVENTS = new Set([
  "PURCHASE_CANCELED",
  "PURCHASE_CANCELLED",
  "PURCHASE_REFUNDED",
  "PURCHASE_REFUND",
  "PURCHASE_CHARGEBACK",
  "PURCHASE_PROTEST",
  "PURCHASE_EXPIRED"
]);

function jsonResponse(status: number, body: Json) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8"
    }
  });
}

function env(name: string) {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`missing_env_${name}`);
  return value;
}

function asObject(value: unknown): Json {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Json : {};
}

function getPath(source: unknown, path: string[]) {
  return path.reduce<unknown>((current, key) => asObject(current)[key], source);
}

function asString(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function normalizeEmail(value: unknown) {
  return asString(value).toLowerCase();
}

function normalizeId(value: unknown) {
  return asString(value).replace(/\.0$/, "");
}

function parseDate(value: unknown) {
  const raw = asString(value);
  if (!raw) return new Date().toISOString();
  if (/^\d+$/.test(raw)) {
    const number = Number(raw);
    const date = new Date(number > 10_000_000_000 ? number : number * 1000);
    return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
  }
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

async function sha256(value: string) {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function payloadInfo(payload: Json) {
  const data = asObject(payload.data);
  const eventType = asString(payload.event ?? payload.event_type ?? payload.type).toUpperCase();
  const transactionId = normalizeId(
    getPath(data, ["purchase", "transaction"]) ??
    getPath(data, ["purchase", "transaction_id"]) ??
    payload.transaction_id
  );
  const productId = normalizeId(
    getPath(data, ["product", "id"]) ??
    getPath(data, ["product", "ucode"]) ??
    payload.product_id
  );
  const productName = asString(getPath(data, ["product", "name"]) ?? payload.product_name);
  const email = normalizeEmail(
    getPath(data, ["buyer", "email"]) ??
    getPath(data, ["subscriber", "email"]) ??
    payload.email
  );
  const buyerName = asString(
    getPath(data, ["buyer", "name"]) ??
    getPath(data, ["buyer", "full_name"]) ??
    getPath(data, ["subscriber", "name"]) ??
    payload.buyer_name
  );
  const purchaseStatus = asString(getPath(data, ["purchase", "status"]) ?? payload.purchase_status).toLowerCase();
  const purchaseDate = parseDate(
    getPath(data, ["purchase", "approved_date"]) ??
    getPath(data, ["purchase", "order_date"]) ??
    payload.creation_date ??
    payload.purchase_date
  );
  const eventId = asString(payload.id ?? payload.event_id) || `${eventType}:${transactionId}:${asString(payload.creation_date) || purchaseDate}`;

  return {
    eventId,
    eventType,
    transactionId,
    productId,
    productName,
    email,
    buyerName,
    purchaseStatus,
    purchaseDate
  };
}

function purchaseStatusForEvent(eventType: string, hotmartStatus: string) {
  if (APPROVED_EVENTS.has(eventType)) return ACTIVE_STATUS;
  if (eventType.includes("REFUND")) return "refunded";
  if (eventType.includes("CHARGEBACK") || eventType.includes("PROTEST")) return "chargeback";
  if (eventType.includes("CANCEL")) return "canceled";
  if (eventType.includes("EXPIRED")) return "expired";
  return hotmartStatus || eventType.toLowerCase();
}

async function claimEvent(supabase: SupabaseClient, event: Json) {
  const { data, error } = await supabase.rpc("claim_hotmart_webhook_event", {
    p_event_id: asString(event.event_id),
    p_event_type: asString(event.event_type),
    p_transaction_id: asString(event.transaction_id),
    p_product_id: asString(event.product_id),
    p_email: asString(event.email),
    p_payload_hash: asString(event.payload_hash)
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error("claim_event_without_result");
  return {
    claimed: row.claimed === true,
    eventId: asString(row.event_id),
    status: asString(row.status)
  };
}

async function markEvent(supabase: SupabaseClient, eventId: string, status: "processed" | "failed", errorMessage?: string) {
  const { error } = await supabase.rpc("mark_hotmart_webhook_event", {
    p_event_id: eventId,
    p_status: status,
    p_error_message: errorMessage ? errorMessage.slice(0, 240) : null
  });
  if (error) throw error;
}

async function findPurchase(supabase: SupabaseClient, transactionId: string, email: string, productId: string) {
  if (transactionId) {
    const byTransaction = await supabase
      .from("hotmart_purchases")
      .select("id,user_id,email,must_change_password,transaction_id")
      .eq("transaction_id", transactionId)
      .maybeSingle();
    if (byTransaction.data) return byTransaction.data as Json;
  }

  if (email && productId) {
    const byEmail = await supabase
      .from("hotmart_purchases")
      .select("id,user_id,email,must_change_password,transaction_id")
      .eq("email", email)
      .eq("product_id", productId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (byEmail.data) return byEmail.data as Json;
  }

  return null;
}

async function findUserByEmail(supabase: SupabaseClient, email: string) {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const user = data.users.find((item) => item.email?.toLowerCase() === email);
    if (user) return user;
    if (data.users.length < 1000) break;
  }
  return null;
}

async function inviteBuyer(supabase: SupabaseClient, email: string, buyerName: string, transactionId: string, redirectTo: string) {
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: {
      name: buyerName,
      source: "hotmart",
      transaction_id: transactionId
    }
  });
  if (error) throw error;
  if (!data.user) throw new Error("invite_without_user");
  return data.user;
}

function shouldForcePasswordCreation(user: User | null, invitedNow: boolean, existingPurchase: Json | null, transactionId: string) {
  if (invitedNow) return true;
  if (existingPurchase && typeof existingPurchase.must_change_password === "boolean") {
    return existingPurchase.must_change_password;
  }
  const metadata = asObject(user?.user_metadata);
  return metadata.source === "hotmart" && metadata.transaction_id === transactionId;
}

async function upsertPurchase(supabase: SupabaseClient, values: Json) {
  const { error } = await supabase
    .from("hotmart_purchases")
    .upsert(values, { onConflict: "transaction_id" });
  if (error) throw error;
}

async function revokeActiveSession(supabase: SupabaseClient, userId: string) {
  if (!userId) return;
  const { error } = await supabase.rpc("revoke_active_user_sessions", {
    p_user_id: userId
  });
  if (error) {
    console.warn("Could not revoke active session after inactive purchase.");
  }
}

serve(async (request) => {
  if (request.method === "OPTIONS") {
    return jsonResponse(200, { ok: true });
  }
  if (request.method !== "POST") {
    return jsonResponse(405, { ok: false, error: "method_not_allowed" });
  }

  let claimedEventId = "";
  try {
    const expectedHottok = env("HOTMART_HOTTOK");
    const expectedProductId = normalizeId(env("HOTMART_PRODUCT_ID"));
    const inviteUrl = env("APP_INVITE_URL");
    const suppliedHottok = request.headers.get("x-hotmart-hottok")?.trim() || "";
    if (!suppliedHottok || suppliedHottok !== expectedHottok) {
      return jsonResponse(401, { ok: false, error: "invalid_hottok" });
    }

    const payload = await request.json() as Json;
    const payloadText = JSON.stringify(payload);
    const info = payloadInfo(payload);
    if (!info.eventType || !info.transactionId || !info.email || !info.productId) {
      return jsonResponse(400, { ok: false, error: "invalid_payload" });
    }
    if (normalizeId(info.productId) !== expectedProductId) {
      return jsonResponse(403, { ok: false, error: "invalid_product" });
    }
    if (!APPROVED_EVENTS.has(info.eventType) && !INACTIVE_EVENTS.has(info.eventType)) {
      return jsonResponse(202, { ok: true, ignored: true, reason: "event_not_handled" });
    }

    const supabase = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const claim = await claimEvent(supabase, {
      event_id: info.eventId,
      event_type: info.eventType,
      transaction_id: info.transactionId,
      product_id: info.productId,
      email: info.email,
      payload_hash: await sha256(payloadText),
      status: "processing",
      received_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    claimedEventId = claim.eventId;
    if (!claim.claimed) {
      return jsonResponse(200, { ok: true, duplicate: true, status: claim.status });
    }

    const existingPurchase = await findPurchase(supabase, info.transactionId, info.email, info.productId);
    let user: User | null = null;
    if (existingPurchase?.user_id) {
      const { data, error } = await supabase.auth.admin.getUserById(asString(existingPurchase.user_id));
      if (error) throw error;
      user = data.user;
    }
    if (!user) {
      user = await findUserByEmail(supabase, info.email);
    }

    const mappedStatus = purchaseStatusForEvent(info.eventType, info.purchaseStatus);
    if (APPROVED_EVENTS.has(info.eventType)) {
      let invitedNow = false;
      if (!user) {
        user = await inviteBuyer(supabase, info.email, info.buyerName, info.transactionId, inviteUrl);
        invitedNow = true;
      }

      await upsertPurchase(supabase, {
        user_id: user.id,
        email: info.email,
        buyer_name: info.buyerName || null,
        transaction_id: info.transactionId,
        hotmart_transaction_id: info.transactionId,
        product_id: info.productId,
        product_name: info.productName || null,
        purchase_status: ACTIVE_STATUS,
        access_active: true,
        must_change_password: shouldForcePasswordCreation(user, invitedNow, existingPurchase, info.transactionId),
        purchase_date: info.purchaseDate,
        updated_at: new Date().toISOString()
      });
    } else {
      const userId = asString(existingPurchase?.user_id || user?.id);
      await upsertPurchase(supabase, {
        user_id: userId || null,
        email: info.email,
        buyer_name: info.buyerName || null,
        transaction_id: info.transactionId,
        hotmart_transaction_id: info.transactionId,
        product_id: info.productId,
        product_name: info.productName || null,
        purchase_status: mappedStatus,
        access_active: false,
        must_change_password: false,
        purchase_date: info.purchaseDate,
        updated_at: new Date().toISOString()
      });
      await revokeActiveSession(supabase, userId);
    }

    await markEvent(supabase, claimedEventId, "processed");
    return jsonResponse(200, { ok: true });
  } catch (error) {
    console.error("Hotmart webhook failed without sensitive details.");
    if (claimedEventId) {
      try {
        const supabase = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
          auth: { autoRefreshToken: false, persistSession: false }
        });
        await markEvent(supabase, claimedEventId, "failed", error instanceof Error ? error.message : "unknown_error");
      } catch {
        console.error("Could not mark failed Hotmart event.");
      }
    }
    return jsonResponse(500, { ok: false, error: "webhook_processing_failed" });
  }
});
