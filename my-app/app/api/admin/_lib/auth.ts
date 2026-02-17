import crypto from "crypto";

function b64url(input: Buffer | string) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function b64urlDecode(str: string) {
  const pad = str.length % 4 === 0 ? "" : "=".repeat(4 - (str.length % 4));
  const s = str.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return Buffer.from(s, "base64").toString("utf8");
}

export function signToken(secret: string, ttlSeconds = 60 * 60 * 24 * 7) {
  const now = Math.floor(Date.now() / 1000);
  const payload = { iat: now, exp: now + ttlSeconds };
  const payloadB64 = b64url(JSON.stringify(payload));
  const sig = crypto.createHmac("sha256", secret).update(payloadB64).digest();
  return `${payloadB64}.${b64url(sig)}`;
}

export function verifyToken(token: string, secret: string) {
  try {
    const [payloadB64, sigB64] = token.split(".");
    if (!payloadB64 || !sigB64) return { ok: false as const };

    const expectedSig = crypto.createHmac("sha256", secret).update(payloadB64).digest();
    const expectedB64 = b64url(expectedSig);
    if (expectedB64 !== sigB64) return { ok: false as const };

    const payload = JSON.parse(b64urlDecode(payloadB64));
    const now = Math.floor(Date.now() / 1000);
    if (!payload?.exp || now > payload.exp) return { ok: false as const };

    return { ok: true as const, payload };
  } catch {
    return { ok: false as const };
  }
}

export function getBearerToken(req: Request) {
  const h = req.headers.get("authorization") || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : "";
}

export function assertAdmin(req: Request) {
  const secret = process.env.ADMIN_PASSWORD || "";
  if (!secret) return { ok: false as const, error: "ADMIN_PASSWORD não configurado." };

  const token = getBearerToken(req);
  if (!token) return { ok: false as const, error: "Sem login." };

  const v = verifyToken(token, secret);
  if (!v.ok) return { ok: false as const, error: "Sessão inválida/expirada." };

  return { ok: true as const };
}
