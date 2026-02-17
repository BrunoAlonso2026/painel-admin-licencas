import { NextResponse } from "next/server";
import { signToken } from "../_lib/auth";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const password = String(body?.password || "");

  const secret = process.env.ADMIN_PASSWORD || "";
  if (!secret) {
    return NextResponse.json({ ok: false, error: "ADMIN_PASSWORD não configurado no servidor." }, { status: 500 });
  }

  if (password !== secret) {
    return NextResponse.json({ ok: false, error: "Senha inválida." }, { status: 401 });
  }

  const token = signToken(secret);
  return NextResponse.json({ ok: true, token });
}
