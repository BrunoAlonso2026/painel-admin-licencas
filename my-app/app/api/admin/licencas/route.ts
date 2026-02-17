import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { assertAdmin } from "../_lib/auth";

function supa() {
  const url = process.env.SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !key) throw new Error("SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY não configurado.");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET(req: Request) {
  const a = assertAdmin(req);
  if (!a.ok) return NextResponse.json({ ok: false, error: a.error }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = (searchParams.get("search") || "").trim();

  const sb = supa();
  let q = sb
    .from("licencas")
    .select("id,chave,cpf_cnpj,ativo,bound_fingerprint,activated_at,last_seen_at,created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (search) {
    // busca por chave OU cpf_cnpj (ilike)
    q = q.or(`chave.ilike.%${search}%,cpf_cnpj.ilike.%${search}%`);
  }

  const { data, error } = await q;
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, rows: data || [] });
}

export async function POST(req: Request) {
  const a = assertAdmin(req);
  if (!a.ok) return NextResponse.json({ ok: false, error: a.error }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const cpf_cnpj = String(body?.cpf_cnpj || "").trim();
  const chave = String(body?.chave || "").trim();
  const ativo = body?.ativo === false ? false : true;

  if (!cpf_cnpj || !chave) {
    return NextResponse.json({ ok: false, error: "Informe cpf_cnpj e chave." }, { status: 400 });
  }

  const sb = supa();
  const { data, error } = await sb
    .from("licencas")
    .insert([{ cpf_cnpj, chave, ativo }])
    .select("id,chave,cpf_cnpj,ativo,bound_fingerprint,activated_at,last_seen_at,created_at")
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, row: data });
}
