import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { assertAdmin } from "../../_lib/auth";

function supa() {
  const url = process.env.SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !key) throw new Error("SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY não configurado.");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const a = assertAdmin(req);
  if (!a.ok) return NextResponse.json({ ok: false, error: a.error }, { status: 401 });

  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));

  const patch: any = {};
  if (typeof body.ativo === "boolean") patch.ativo = body.ativo;
  if (typeof body.cpf_cnpj === "string") patch.cpf_cnpj = body.cpf_cnpj.trim();
  if (typeof body.chave === "string") patch.chave = body.chave.trim();

  // Ação “reset vínculo” (pra liberar uso em outro PC)
  if (body.reset_vinculo === true) {
    patch.bound_fingerprint = null;
    patch.activated_at = null;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: false, error: "Nada para atualizar." }, { status: 400 });
  }

  const sb = supa();
  const { data, error } = await sb
    .from("licencas")
    .update(patch)
    .eq("id", id)
    .select("id,chave,cpf_cnpj,ativo,bound_fingerprint,activated_at,last_seen_at,created_at")
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, row: data });
}
