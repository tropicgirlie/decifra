// /api/extract - lab report extraction via Claude Haiku
// Env vars required: ANTHROPIC_API_KEY, JWT_SECRET (optional)

const crypto = require("crypto");
const https  = require("https");

/** Hard cap — very large pastes slow the model and risk timeouts. */
const MAX_INPUT_CHARS = 180_000;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 25;
const REQUEST_BUCKETS = new Map();

/** Image input bounds. */
const MAX_IMAGES_PER_REQUEST = 5;
const MAX_IMAGE_BYTES_BASE64 = 7 * 1024 * 1024; // ~5 MB raw with base64 overhead
const ALLOWED_IMAGE_MEDIA_TYPES = new Set(["image/jpeg", "image/png"]);

function jsonHeaders(res, status) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.statusCode = status;
}

function getOrigin(req) {
  return String(req.headers.origin || "").trim();
}

function isAllowedOrigin(origin) {
  if (!origin) return true; // non-browser/server calls
  if (origin === "https://decifra.com.br") return true;
  if (origin === "https://www.decifra.com.br") return true;
  if (/^https:\/\/.*\.vercel\.app$/i.test(origin)) return true;
  if (/^http:\/\/(127\.0\.0\.1|localhost):\d+$/i.test(origin)) return true;
  return false;
}

function getClientIp(req) {
  const xff = String(req.headers["x-forwarded-for"] || "");
  if (xff) return xff.split(",")[0].trim();
  return req.socket?.remoteAddress || "unknown";
}

function isRateLimited(ip) {
  const now = Date.now();
  const bucket = REQUEST_BUCKETS.get(ip);
  if (!bucket || now - bucket.start >= RATE_LIMIT_WINDOW_MS) {
    REQUEST_BUCKETS.set(ip, { count: 1, start: now });
    return false;
  }
  bucket.count += 1;
  return bucket.count > RATE_LIMIT_MAX;
}

function verifyJWT(token, secret) {
  if (!token || !secret) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;
  const expected = crypto.createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
  if (sig !== expected) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString());
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch { return null; }
}

// Use https.request instead of fetch to avoid Node.js ByteString encoding issues
function httpsPost(url, headers, bodyObj) {
  return new Promise((resolve, reject) => {
    const bodyBuf = Buffer.from(JSON.stringify(bodyObj), "utf8");
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname,
      path:     u.pathname,
      method:   "POST",
      headers:  {
        ...headers,
        "content-length": bodyBuf.length,
      },
    }, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        const text = Buffer.concat(chunks).toString("utf8");
        resolve({ status: res.statusCode, text });
      });
    });
    req.on("error", reject);
    req.write(bodyBuf);
    req.end();
  });
}

const SYSTEM_PROMPT = [
  "Você é um motor rigoroso de extração de dados clínicos para laudos laboratoriais brasileiros (incluindo saúde da mulher, endocrinologia reprodutiva, painéis obstétricos, metabólicos, hemograma, bioquímica, lipídios, coagulação, função renal, hepática e marcadores tumorais quando impressos). Espere encontrar laudos de Fleury, DASA, Hermes Pardini, Sabin, Alta, Lavoisier e laboratórios locais. O texto pode estar em português, inglês ou misto.",
  "",
  "REGRAS CRÍTICAS — nunca viole nenhuma:",
  "1. Extraia TODO analito/biomarcador explicitamente nomeado com um resultado numérico no texto fonte. Não só hormônios. Inclua componentes do hemograma, perfil de ferro, perfil lipídico, função hepática (TGO/TGP/GGT/FA/bilirrubinas), função renal (ureia/creatinina/TFG), glicose/HbA1c, coagulação, vitaminas, minerais, e qualquer outro exame impresso com valor.",
  "2. Use o nome do exame EXATAMENTE como impresso (preserve grafia, acentuação, abreviações e sinônimos entre parênteses). Não normalize. Se o laudo escreve 'Glicose de jejum', mantenha; não converta para 'Fasting glucose'.",
  "3. NÃO adicione marcadores de memória ou expectativa clínica. Se não está escrito no texto fonte, omita.",
  "4. Extraia os valores exatamente como impressos. Preserve o uso de vírgula como separador decimal (ex.: '1,2' não '1.2'). Nunca arredonde nem converta unidades.",
  "5. Mantenha as faixas de referência exatamente como escritas (ou string vazia se ausente). Use 'a' ou '-' conforme o laudo (ex.: '15 a 150' ou '15 - 150').",
  "6. source_snippet: copie uma linha completa do laudo (ou fragmento claro, ≤120 caracteres) exatamente como impressa. DEVE conter o nome do marcador e o valor, autocomprovando a linha.",
  "7. confidence: high = marcador, valor, unidade e faixa todos claramente presentes na mesma linha local; medium = valor claro mas unidade ou faixa com formatação confusa; low = parcialmente legível.",
  "8. status: um de normal, low, high, critical_low, critical_high — determinado apenas pela faixa de referência impressa vs valor; use normal se a faixa estiver ausente.",
  "9. female_context: 1–2 frases concisas, baseadas em evidência, em português do Brasil, sobre por que este exame importa para a fisiologia feminina, fertilidade, gestação, SOP, climatério/menopausa, saúde óssea/metabólica ou ginecologia, conforme aplicável. Nunca invente valores nem diagnósticos.",
  "10. panel: melhor encaixe entre: fertile, pcos, endo, fertility, peri, meno, obstetric, thyroid, metabolic, cbc, lipids, liver, kidney, coagulation, other",
  "11. Se o mesmo marcador aparecer múltiplas vezes (ex.: coletas repetidas), retorne cada linha distinta como objeto separado.",
  "12. Retorne APENAS JSON válido, sem markdown, sem explicação.",
  "13. Se a entrada for uma ou mais imagens (fotos do laudo), primeiro transcreva LITERALMENTE todo o texto visível no campo `ocr_text` da resposta, exatamente como aparece nas imagens (preservando cabeçalhos, quebras de linha, valores, unidades, faixas, acentuação e separador decimal). Em seguida extraia os marcadores conforme as regras acima. Cada `source_snippet` deve ser substring literal de `ocr_text`. Se as imagens não forem legíveis como laudo laboratorial, retorne markers: [] e use ocr_text para a transcrição do que conseguiu ler.",
  "",
  'Formato de resposta: {"report_name":"string or null","collection_date":"ISO date or null","ocr_text":"string or null (obrigatório quando a entrada for imagem)","markers":[{"marker":"...","value":"...","unit":"...","reference_range":"...","status":"...","confidence":"high|medium|low","source_snippet":"trecho literal","female_context":"...","panel":"..."}]}',
].join("\n");

function collapseWs(s) {
  return String(s || "").normalize("NFKC").replace(/\s+/g, " ").trim();
}

/** Verbatim (case/whitespace-tolerant) substring: model must quote real source text. */
function snippetIsLiteralSubstring(snippet, fullText) {
  const a = collapseWs(snippet).toLowerCase();
  const b = collapseWs(fullText).toLowerCase();
  return a.length >= 7 && b.includes(a);
}

/** Marker name (or acronym) must appear inside the snippet, not only elsewhere in the PDF. */
function markerReferencedInSnippet(marker, snippet) {
  const sn = collapseWs(snippet).toLowerCase();
  if (!sn) return false;
  let core = collapseWs(String(marker || ""))
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!core) return false;
  // Acronyms / very short names: word-boundary match inside snippet only
  if (core.length <= 4 && !/\s/.test(core)) {
    try {
      return new RegExp(`\\b${core.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(snippet);
    } catch {
      return false;
    }
  }
  if (sn.includes(core)) return true;
  // Shuffled word order / extra qualifiers: every meaningful token must appear in the
  // SNIPPET only (never whole-document token matching — that caused Vitamin D false positives).
  const tok = core.split(" ").filter((t) => t.length >= 3);
  if (
    tok.length >= 2 &&
    tok.every((t) => sn.includes(t)) &&
    tok.some((t) => t.length >= 4)
  ) {
    return true;
  }
  return false;
}

/** Reported numeric value must appear in the snippet so rows cannot be cross-wired. */
function valueAppearsInSnippet(value, snippet) {
  const v = String(value ?? "").trim();
  if (!v || !/\d/.test(v)) return true;
  const compact = (s) => collapseWs(s).replace(/\s/g, "").toLowerCase();
  const vs = compact(v).replace(",", ".");
  const pool = [compact(v), vs, compact(v).replace(".", ",")];
  const sn = compact(snippet);
  return pool.some((p) => p && sn.includes(p));
}

function isMarkerGroundedInSource(m, fullText) {
  const snippet = m.source_snippet;
  if (!snippet || !snippetIsLiteralSubstring(snippet, fullText)) return false;
  if (!markerReferencedInSnippet(m.marker, snippet)) return false;
  if (!valueAppearsInSnippet(m.value, snippet)) return false;
  return true;
}

module.exports = async function handler(req, res) {
  const origin = getOrigin(req);
  const allowOrigin = isAllowedOrigin(origin) ? origin : "https://decifra.com.br";
  res.setHeader("Access-Control-Allow-Origin", allowOrigin);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).end();
  }
  if (req.method !== "POST") {
    jsonHeaders(res, 405);
    return res.end(JSON.stringify({ error: "Método não permitido" }));
  }
  if (origin && !isAllowedOrigin(origin)) {
    jsonHeaders(res, 403);
    return res.end(JSON.stringify({ error: "Origem não permitida" }));
  }
  const clientIp = getClientIp(req);
  if (isRateLimited(clientIp)) {
    jsonHeaders(res, 429);
    return res.end(JSON.stringify({
      error: "Limite de requisições excedido",
      window_seconds: RATE_LIMIT_WINDOW_MS / 1000,
      max_requests: RATE_LIMIT_MAX,
    }));
  }

  const apiKey = (process.env.ANTHROPIC_API_KEY || "").replace(/[^\x20-\x7E]/g, "").trim();
  if (!apiKey) {
    jsonHeaders(res, 500);
    return res.end(JSON.stringify({ error: "ANTHROPIC_API_KEY não configurada no servidor" }));
  }

  const { text, images } = req.body || {};
  const hasText   = typeof text === "string" && text.length > 0;
  const imagesArr = Array.isArray(images) ? images : [];
  const hasImages = imagesArr.length > 0;

  if (!hasText && !hasImages) {
    jsonHeaders(res, 400);
    return res.end(JSON.stringify({ error: "Envie text ou images no corpo da requisição" }));
  }
  if (hasText && text.length > MAX_INPUT_CHARS) {
    jsonHeaders(res, 413);
    return res.end(
      JSON.stringify({
        error: "Texto do exame muito longo",
        max_chars: MAX_INPUT_CHARS,
        received_chars: text.length,
      })
    );
  }
  if (hasImages) {
    if (imagesArr.length > MAX_IMAGES_PER_REQUEST) {
      jsonHeaders(res, 413);
      return res.end(JSON.stringify({
        error: "Máximo de imagens por requisição excedido",
        max_images: MAX_IMAGES_PER_REQUEST,
        received_images: imagesArr.length,
      }));
    }
    for (let i = 0; i < imagesArr.length; i += 1) {
      const img = imagesArr[i];
      if (!img || typeof img.data !== "string" || typeof img.media_type !== "string") {
        jsonHeaders(res, 400);
        return res.end(JSON.stringify({ error: `Imagem ${i + 1} mal formada (precisa de campos data e media_type)` }));
      }
      if (!ALLOWED_IMAGE_MEDIA_TYPES.has(img.media_type)) {
        jsonHeaders(res, 415);
        return res.end(JSON.stringify({ error: `Imagem ${i + 1}: tipo ${img.media_type} não suportado. Use JPG ou PNG.` }));
      }
      if (img.data.length > MAX_IMAGE_BYTES_BASE64) {
        jsonHeaders(res, 413);
        return res.end(JSON.stringify({
          error: `Imagem ${i + 1} muito grande. Reduza para no máximo ~5 MB.`,
          max_bytes_base64: MAX_IMAGE_BYTES_BASE64,
          received_bytes_base64: img.data.length,
        }));
      }
    }
  }

  const authHeader = req.headers["authorization"] || "";
  const token      = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const jwtPayload = verifyJWT(token, process.env.JWT_SECRET);
  const tier       = jwtPayload?.tier === "pro" ? "pro" : "free";

  console.log(`[Decifra extract] tier=${tier} textLen=${hasText ? text.length : 0} images=${imagesArr.length}`);

  // Build the user message: text-only path, image-only path, or image+text overlay.
  const userContent = hasImages
    ? [
        ...imagesArr.map((img) => ({
          type:   "image",
          source: { type: "base64", media_type: img.media_type, data: img.data },
        })),
        {
          type: "text",
          text: hasText
            ? "Extraia todos os biomarcadores destas imagens do laudo laboratorial brasileiro. Lembre da regra 13: comece pela transcrição literal em `ocr_text`, depois extraia os marcadores. Texto adicional fornecido pela usuária:\n\n<<<\n" + text + "\n>>>"
            : "Extraia todos os biomarcadores destas imagens do laudo laboratorial brasileiro. Lembre da regra 13: comece pela transcrição literal em `ocr_text`, depois extraia os marcadores.",
        },
      ]
    : "Extraia todos os biomarcadores deste laudo laboratorial brasileiro:\n\n<<<\n" + text + "\n>>>";

  try {
    const { status, text: body } = await httpsPost(
      "https://api.anthropic.com/v1/messages",
      {
        "x-api-key":         apiKey.trim(),
        "anthropic-version": "2023-06-01",
        "content-type":      "application/json",
      },
      {
        model:      "claude-haiku-4-5-20251001",
        max_tokens: 8192,
        system:     SYSTEM_PROMPT,
        messages:   [{ role: "user", content: userContent }],
      }
    );

    if (status !== 200) {
      console.error("[Decifra extract] Anthropic error:", status, body.slice(0, 300));
      jsonHeaders(res, 502);
      return res.end(JSON.stringify({ error: "Anthropic " + status + ": " + body.slice(0, 500) }));
    }

    const data    = JSON.parse(body);
    let content   = data.content?.[0]?.text ?? "{}";

    // Strip markdown fences if model wraps response despite instructions
    content = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      console.error("[Decifra extract] JSON parse failed:", content.slice(0, 300));
      jsonHeaders(res, 502);
      return res.end(JSON.stringify({ error: "Modelo retornou JSON inválido", raw: content.slice(0, 300) }));
    }

    // Grounding source: text from request for paste/PDF flow; model's own ocr_text for image flow.
    // Image flow trusts the model to transcribe literally; grounding then guards against
    // markers fabricated outside what the OCR captured.
    const sourceForGrounding = hasImages
      ? (typeof parsed.ocr_text === "string" ? parsed.ocr_text : "")
      : text;

    if (hasImages && !sourceForGrounding) {
      console.warn("[Decifra extract] Image flow returned no ocr_text; markers cannot be grounded.");
    }

    // ── Validação rígida: descarta alucinações (modelo + trecho + valor precisam concordar) ──
    const markersBefore = (parsed.markers || []).length;
    parsed.markers = (parsed.markers || []).filter((m) => {
      if (isMarkerGroundedInSource(m, sourceForGrounding)) return true;
      console.log(`[Decifra extract] Removed ungrounded marker: "${m.marker}"`);
      return false;
    });
    const markersRemoved = markersBefore - parsed.markers.length;
    if (markersRemoved > 0) {
      console.log(`[Decifra extract] Removed ${markersRemoved} hallucinated marker(s)`);
    }

    // ocr_text is server-internal: useful for grounding, not exposed to the client to keep
    // the response shape stable for the existing extract → review → interpret pipeline.
    if ("ocr_text" in parsed) delete parsed.ocr_text;

    jsonHeaders(res, 200);
    return res.end(JSON.stringify({ ...parsed, _tier: tier }));

  } catch (err) {
    console.error("[Decifra extract] error:", err.message);
    jsonHeaders(res, 500);
    return res.end(JSON.stringify({ error: err.message }));
  }
};
