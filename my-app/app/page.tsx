"use client";

import { useEffect, useMemo, useState } from "react";

type Licenca = {
  id: string;
  chave: string;
  cpf_cnpj: string;
  ativo: boolean;
  bound_fingerprint: string | null;
  activated_at: string | null;
  last_seen_at: string | null;
  created_at: string;
};

function getToken() {
  try { return localStorage.getItem("admin_token") || ""; } catch { return ""; }
}
function setToken(t: string) {
  try { localStorage.setItem("admin_token", t); } catch {}
}
function clearToken() {
  try { localStorage.removeItem("admin_token"); } catch {}
}

async function api(path: string, opts: RequestInit = {}) {
  const token = getToken();
  const headers: any = { ...(opts.headers || {}) };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (!headers["Content-Type"] && opts.method && opts.method !== "GET") headers["Content-Type"] = "application/json";
  const r = await fetch(path, { ...opts, headers, cache: "no-store" });
  const j = await r.json().catch(() => ({}));
  return { status: r.status, json: j };
}

export default function Home() {
  const [password, setPassword] = useState("");
  const [logged, setLogged] = useState(false);

  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<Licenca[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const [novoDoc, setNovoDoc] = useState("");
  const [novoKey, setNovoKey] = useState("");

  const tokenExists = useMemo(() => !!getToken(), []);

  useEffect(() => {
    if (tokenExists) setLogged(true);
  }, [tokenExists]);

  async function login() {
    setMsg("");
    const r = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify({ password })
    });
    const j = await r.json().catch(() => ({}));
    if (!j.ok) {
      setMsg(j.error || "Erro no login");
      return;
    }
    setToken(j.token);
    setLogged(true);
    setPassword("");
    await carregar();
  }

  async function carregar() {
    setLoading(true);
    setMsg("");
    const q = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
    const { status, json } = await api(`/api/admin/licencas${q}`);
    setLoading(false);
    if (status === 401) {
      setMsg(json.error || "Sessão expirada. Faça login novamente.");
      clearToken();
      setLogged(false);
      return;
    }
    if (!json.ok) {
      setMsg(json.error || "Erro ao carregar");
      return;
    }
    setRows(json.rows || []);
  }

  async function criar() {
    setMsg("");
    if (!novoDoc.trim() || !novoKey.trim()) {
      setMsg("Informe CPF/CNPJ e CHAVE.");
      return;
    }
    const { status, json } = await api("/api/admin/licencas", {
      method: "POST",
      body: JSON.stringify({ cpf_cnpj: novoDoc.trim(), chave: novoKey.trim(), ativo: true })
    });
    if (status === 401) {
      setMsg(json.error || "Sessão expirada.");
      clearToken();
      setLogged(false);
      return;
    }
    if (!json.ok) {
      setMsg(json.error || "Erro ao criar");
      return;
    }
    setNovoDoc("");
    setNovoKey("");
    await carregar();
  }

  async function toggleAtivo(row: Licenca) {
    const { status, json } = await api(`/api/admin/licencas/${row.id}`, {
      method: "PATCH",
      body: JSON.stringify({ ativo: !row.ativo })
    });
    if (status === 401) { clearToken(); setLogged(false); return; }
    if (!json.ok) { setMsg(json.error || "Erro ao atualizar"); return; }
    await carregar();
  }

  async function resetVinculo(row: Licenca) {
    const ok = confirm("Resetar vínculo do computador? (vai permitir ativar em outro PC)");
    if (!ok) return;

    const { status, json } = await api(`/api/admin/licencas/${row.id}`, {
      method: "PATCH",
      body: JSON.stringify({ reset_vinculo: true })
    });
    if (status === 401) { clearToken(); setLogged(false); return; }
    if (!json.ok) { setMsg(json.error || "Erro ao resetar"); return; }
    await carregar();
  }

  function sair() {
    clearToken();
    setLogged(false);
    setRows([]);
    setMsg("");
  }

  return (
    <div style={{ minHeight:"100vh", padding:16, fontFamily:"system-ui, -apple-system, Segoe UI, Roboto, Arial" }}>
      <div style={{ maxWidth: 980, margin:"0 auto" }}>
        <h1 style={{ margin: "10px 0 6px 0" }}>Painel Admin — Licenças</h1>
        <div style={{ opacity:.7, marginBottom: 14 }}>Acesse pelo celular e gerencie chaves do Supabase.</div>

        {!logged ? (
          <div style={{ border:"1px solid rgba(255,255,255,.12)", borderRadius:12, padding:14, background:"rgba(0,0,0,.25)" }}>
            <div style={{ fontWeight:800, marginBottom:10 }}>Login</div>
            <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
              <input
                type="password"
                placeholder="Senha do painel"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{ padding:10, borderRadius:10, border:"1px solid rgba(255,255,255,.18)", width:260, background:"rgba(255,255,255,.06)", color:"#fff" }}
              />
              <button onClick={login} style={{ padding:"10px 14px", borderRadius:10, border:"1px solid rgba(255,255,255,.18)", background:"rgba(255,255,255,.10)", color:"#fff", fontWeight:800 }}>
                Entrar
              </button>
            </div>
            {msg ? <div style={{ marginTop:10, color:"#ffb4b4", fontWeight:700 }}>{msg}</div> : null}
          </div>
        ) : (
          <>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:10, flexWrap:"wrap", marginBottom: 10 }}>
              <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                <input
                  placeholder="Buscar por CPF/CNPJ ou CHAVE"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ padding:10, borderRadius:10, border:"1px solid rgba(255,255,255,.18)", width:320, background:"rgba(255,255,255,.06)", color:"#fff" }}
                />
                <button onClick={carregar} style={{ padding:"10px 14px", borderRadius:10, border:"1px solid rgba(255,255,255,.18)", background:"rgba(255,255,255,.10)", color:"#fff", fontWeight:800 }}>
                  {loading ? "Carregando..." : "Atualizar"}
                </button>
              </div>

              <button onClick={sair} style={{ padding:"10px 14px", borderRadius:10, border:"1px solid rgba(255,255,255,.18)", background:"rgba(255,80,80,.12)", color:"#fff", fontWeight:900 }}>
                Sair
              </button>
            </div>

            <div style={{ border:"1px solid rgba(255,255,255,.12)", borderRadius:12, padding:14, background:"rgba(0,0,0,.25)", marginBottom: 14 }}>
              <div style={{ fontWeight:900, marginBottom:10 }}>Criar licença</div>
              <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                <input
                  placeholder="CPF/CNPJ"
                  value={novoDoc}
                  onChange={e => setNovoDoc(e.target.value)}
                  style={{ padding:10, borderRadius:10, border:"1px solid rgba(255,255,255,.18)", width:220, background:"rgba(255,255,255,.06)", color:"#fff" }}
                />
                <input
                  placeholder="CHAVE (ex: ABC123-0001)"
                  value={novoKey}
                  onChange={e => setNovoKey(e.target.value)}
                  style={{ padding:10, borderRadius:10, border:"1px solid rgba(255,255,255,.18)", width:260, background:"rgba(255,255,255,.06)", color:"#fff" }}
                />
                <button onClick={criar} style={{ padding:"10px 14px", borderRadius:10, border:"1px solid rgba(255,255,255,.18)", background:"rgba(120,255,180,.10)", color:"#fff", fontWeight:900 }}>
                  Criar
                </button>
              </div>
              {msg ? <div style={{ marginTop:10, color:"#ffd9a6", fontWeight:800 }}>{msg}</div> : null}
            </div>

            <div style={{ border:"1px solid rgba(255,255,255,.12)", borderRadius:12, overflow:"hidden" }}>
              <div style={{ padding:12, background:"rgba(255,255,255,.04)", fontWeight:900 }}>
                Licenças ({rows.length})
              </div>

              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse" }}>
                  <thead>
                    <tr style={{ textAlign:"left", background:"rgba(255,255,255,.03)" }}>
                      <th style={{ padding:10, borderBottom:"1px solid rgba(255,255,255,.08)" }}>CPF/CNPJ</th>
                      <th style={{ padding:10, borderBottom:"1px solid rgba(255,255,255,.08)" }}>Chave</th>
                      <th style={{ padding:10, borderBottom:"1px solid rgba(255,255,255,.08)" }}>Ativo</th>
                      <th style={{ padding:10, borderBottom:"1px solid rgba(255,255,255,.08)" }}>Vinculado</th>
                      <th style={{ padding:10, borderBottom:"1px solid rgba(255,255,255,.08)" }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id}>
                        <td style={{ padding:10, borderBottom:"1px solid rgba(255,255,255,.06)" }}>{r.cpf_cnpj}</td>
                        <td style={{ padding:10, borderBottom:"1px solid rgba(255,255,255,.06)", fontWeight:800 }}>{r.chave}</td>
                        <td style={{ padding:10, borderBottom:"1px solid rgba(255,255,255,.06)" }}>
                          <span style={{
                            padding:"4px 10px",
                            borderRadius:999,
                            border:"1px solid rgba(255,255,255,.12)",
                            background: r.ativo ? "rgba(80,255,140,.10)" : "rgba(255,80,80,.10)",
                            fontWeight:900
                          }}>
                            {r.ativo ? "SIM" : "NÃO"}
                          </span>
                        </td>
                        <td style={{ padding:10, borderBottom:"1px solid rgba(255,255,255,.06)" }}>
                          {r.bound_fingerprint ? "SIM" : "NÃO"}
                        </td>
                        <td style={{ padding:10, borderBottom:"1px solid rgba(255,255,255,.06)" }}>
                          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                            <button
                              onClick={() => toggleAtivo(r)}
                              style={{ padding:"8px 10px", borderRadius:10, border:"1px solid rgba(255,255,255,.18)", background:"rgba(255,255,255,.07)", color:"#fff", fontWeight:900 }}
                            >
                              {r.ativo ? "Bloquear" : "Ativar"}
                            </button>

                            <button
                              onClick={() => resetVinculo(r)}
                              style={{ padding:"8px 10px", borderRadius:10, border:"1px solid rgba(255,255,255,.18)", background:"rgba(255,200,80,.10)", color:"#fff", fontWeight:900 }}
                            >
                              Reset vínculo
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {rows.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding:14, opacity:.75 }}>Nenhum resultado.</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      <style jsx global>{`
        body {
          margin: 0;
          color: rgba(255,255,255,.92);
          background: radial-gradient(1200px 600px at 20% 10%, rgba(100,60,255,.18), transparent 60%),
                      radial-gradient(900px 500px at 90% 20%, rgba(0,255,180,.10), transparent 55%),
                      #0b0f16;
        }
        * { box-sizing: border-box; }
        input { outline: none; }
      `}</style>
    </div>
  );
}
