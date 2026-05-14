// /api/summary — resumo conciso voltado à paciente, a partir dos exames extraídos
//
// Pipeline em dois passos (ver docs/adr/0001-summary-model-pipeline.md):
//   1) Claude Sonnet 4.5 (Anthropic): raciocínio clínico, escrito em inglês.
//   2) Sabiá-3 (Maritaca): tradução para português brasileiro nativo, com voz clínica brasileira.
//
// Fallback: se Sabiá-3 falhar, Claude Sonnet faz a tradução em uma segunda chamada.
// Se tudo falhar, devolvemos o inglês com flag _translation_status: "failed_en".
//
// Variáveis de ambiente:
//   ANTHROPIC_API_KEY  obrigatória (raciocínio em inglês + fallback de tradução)
//   MARITACA_API_KEY   opcional (tradução primária; ausente => fallback Claude-pt-BR)

const https = require("https");

const MARITACA_URL = "https://chat.maritaca.ai/api/chat/inference";
const MARITACA_MODEL = "sabia-3";
const CLAUDE_URL = "https://api.anthropic.com/v1/messages";
const CLAUDE_MODEL = "claude-sonnet-4-5-20250929";

function post(url, headers, bodyObj) {
  return new Promise((resolve, reject) => {
    const bodyBuf = Buffer.from(JSON.stringify(bodyObj), "utf8");
    const u = new URL(url);
    const req = https.request(
      {
        hostname: u.hostname,
        path: u.pathname,
        method: "POST",
        headers: { ...headers, "content-length": bodyBuf.length },
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve({ status: res.statusCode, text: Buffer.concat(chunks).toString("utf8") }));
      }
    );
    req.on("error", reject);
    req.write(bodyBuf);
    req.end();
  });
}

function stripJsonFences(raw) {
  return String(raw || "")
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();
}

// ── Claude Sonnet 4.5: clinical reasoning in English ────────────────────────
async function reasonWithClaude({ system, userContent }) {
  const key = (process.env.ANTHROPIC_API_KEY || "").trim();
  if (!key) return { ok: false, reason: "no_anthropic_key" };
  try {
    const { status, text } = await post(
      CLAUDE_URL,
      {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      {
        model: CLAUDE_MODEL,
        max_tokens: 1100,
        system,
        messages: [{ role: "user", content: userContent }],
      }
    );
    if (status !== 200) {
      console.warn(`[Decifra summary] Claude reasoning ${status}:`, text.slice(0, 200));
      return { ok: false, reason: `http_${status}`, body: text };
    }
    const parsed = JSON.parse(text);
    const answer = parsed.content?.[0]?.text || "";
    if (!answer) return { ok: false, reason: "empty_answer" };
    return { ok: true, text: answer };
  } catch (err) {
    console.warn("[Decifra summary] Claude reasoning error:", err.message);
    return { ok: false, reason: "exception", error: err.message };
  }
}

// ── Sabiá-3: translate the English JSON to pt-BR, keep the JSON shape ───────
async function translateWithSabia({ englishJson, contextLineForTranslator }) {
  const key = (process.env.MARITACA_API_KEY || "").trim();
  if (!key) return { ok: false, reason: "no_maritaca_key" };

  const system = [
    "Você é tradutora médica especializada em saúde da mulher. Sua função é localizar interpretações clínicas do inglês para o português brasileiro nativo.",
    "",
    "REGRAS:",
    "1. Receba um objeto JSON em inglês. Devolva o MESMO objeto JSON, com a MESMA estrutura e as MESMAS chaves, mas com TODOS os valores de texto reescritos em português brasileiro.",
    "2. Não traduza chaves. Não adicione campos. Não remova campos. Não mude o aninhamento.",
    "3. Não é tradução literal. Reescreva como uma boa GP/clínica geral brasileira escreveria, com vocabulário e fluidez nativos.",
    "4. Use convenções brasileiras: 'mUI/L' em vez de 'mIU/L', vírgula como separador decimal (1,2 em vez de 1.2), 'ng/mL' e 'mg/dL' conforme padrão dos laboratórios brasileiros (Fleury, DASA, Hermes Pardini, Sabin).",
    "5. Use linguagem brasileira para encaminhamentos: 'converse com sua ginecologista', 'leve ao médico do convênio ou SUS', 'considere um endocrinologista', 'agende uma consulta'. NÃO use 'discuss with your GP', 'consult your physician', etc.",
    "6. Use 'climatério' em vez de 'perimenopausa'. Use 'SOP' (Síndrome dos Ovários Policísticos) em vez de 'PCOS' ou 'polycystic ovary syndrome'.",
    "7. Tom: clara, cientificamente cuidadosa, orientada à ação, calorosa mas não infantilizante.",
    "8. Sem travessões (—). Use ponto ou vírgula.",
    "9. Devolva APENAS o JSON traduzido. Sem markdown, sem prefácio, sem explicação.",
  ].join("\n");

  const userContent = [
    contextLineForTranslator ? `Contexto da paciente (para informar o tom da tradução, NÃO incluir no JSON): ${contextLineForTranslator}` : "",
    "",
    "Traduza este objeto JSON para português brasileiro, preservando a estrutura:",
    englishJson,
  ].filter(Boolean).join("\n");

  try {
    const { status, text } = await post(
      MARITACA_URL,
      {
        Authorization: `Key ${key}`,
        "Content-Type": "application/json",
      },
      {
        model: MARITACA_MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: userContent },
        ],
        do_sample: true,
        max_tokens: 1400,
        temperature: 0.2,
        top_p: 0.95,
      }
    );
    if (status !== 200) {
      console.warn(`[Decifra summary] Sabiá-3 translate ${status}:`, text.slice(0, 200));
      return { ok: false, reason: `http_${status}` };
    }
    const data = JSON.parse(text);
    const answer = typeof data.answer === "string" ? data.answer : "";
    if (!answer) return { ok: false, reason: "empty_answer" };
    return { ok: true, text: answer };
  } catch (err) {
    console.warn("[Decifra summary] Sabiá-3 translate error:", err.message);
    return { ok: false, reason: "exception", error: err.message };
  }
}

// ── Fallback: ask Claude to translate its own English output to pt-BR ──────
async function translateWithClaude({ englishJson, contextLineForTranslator }) {
  const key = (process.env.ANTHROPIC_API_KEY || "").trim();
  if (!key) return { ok: false, reason: "no_anthropic_key" };

  const system = [
    "You are a Brazilian-Portuguese medical translator localising English clinical interpretations.",
    "Return the SAME JSON object with the SAME structure and keys, but rewrite every text value in natural Brazilian Portuguese as a Brazilian GP would write, not as literal translation.",
    "Use Brazilian conventions: 'mUI/L' (not 'mIU/L'), comma as decimal separator (1,2 not 1.2), Brazilian referral language ('converse com sua ginecologista', 'convênio ou SUS').",
    "Use 'climatério' (not 'perimenopausa'). Use 'SOP' (not 'PCOS').",
    "No em dashes. Period or comma instead.",
    "Return ONLY the translated JSON, no markdown, no prose.",
  ].join("\n");

  const userContent = [
    contextLineForTranslator ? `Patient context (informs translator tone, do NOT include in JSON): ${contextLineForTranslator}` : "",
    "",
    "Translate this JSON to Brazilian Portuguese, preserving structure:",
    englishJson,
  ].filter(Boolean).join("\n");

  try {
    const { status, text } = await post(
      CLAUDE_URL,
      {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      {
        model: CLAUDE_MODEL,
        max_tokens: 1400,
        system,
        messages: [{ role: "user", content: userContent }],
      }
    );
    if (status !== 200) {
      console.warn(`[Decifra summary] Claude translate ${status}:`, text.slice(0, 200));
      return { ok: false, reason: `http_${status}` };
    }
    const parsed = JSON.parse(text);
    const answer = parsed.content?.[0]?.text || "";
    if (!answer) return { ok: false, reason: "empty_answer" };
    return { ok: true, text: answer };
  } catch (err) {
    console.warn("[Decifra summary] Claude translate error:", err.message);
    return { ok: false, reason: "exception", error: err.message };
  }
}

// Validate that a translated JSON matches the English shape: same keys, same nesting.
function shapesMatch(en, pt) {
  if (typeof en !== typeof pt) return false;
  if (en === null || pt === null) return en === pt;
  if (Array.isArray(en)) {
    if (!Array.isArray(pt)) return false;
    return true; // length may legitimately differ (max-4 hints)
  }
  if (typeof en === "object") {
    if (typeof pt !== "object" || Array.isArray(pt)) return false;
    const enKeys = Object.keys(en).sort();
    const ptKeys = Object.keys(pt).sort();
    if (enKeys.join(",") !== ptKeys.join(",")) return false;
    return enKeys.every((k) => shapesMatch(en[k], pt[k]));
  }
  return true;
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "https://decifra.com.br");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: "Resumo temporariamente indisponível" });
  }

  const tests = Array.isArray(req.body?.markers) ? req.body.markers : [];
  if (!tests.length) return res.status(400).json({ error: "Marcadores ausentes" });

  const safeRows = tests.slice(0, 80).map((m) => ({
    marker: String(m.marker || "").slice(0, 80),
    value: String(m.value || "").slice(0, 32),
    unit: String(m.unit || "").slice(0, 24),
    reference_range: String(m.reference_range || "").slice(0, 40),
  }));

  // ── Patient context (sanitised) ──────────────────────────────────────────
  const ctx = req.body?.context || null;
  const safeCtx = ctx ? {
    age: Number.isFinite(ctx.age) ? Math.max(13, Math.min(100, ctx.age)) : null,
    lifeStage: typeof ctx.lifeStage === "string"
      ? ctx.lifeStage.replace(/[^a-z]/gi, "").slice(0, 20).toLowerCase() : null,
    cycleDay: Number.isFinite(ctx.cycleDay) ? Math.max(1, Math.min(45, ctx.cycleDay)) : null,
    postpartumWeeks: Number.isFinite(ctx.postpartumWeeks) ? Math.max(0, Math.min(156, ctx.postpartumWeeks)) : null,
    monthsSincePeriod: Number.isFinite(ctx.monthsSincePeriod) ? Math.max(0, Math.min(600, ctx.monthsSincePeriod)) : null,
    notes: typeof ctx.notes === "string" ? ctx.notes.slice(0, 600) : null,
  } : null;

  const contextLineEn = safeCtx ? (() => {
    const parts = [];
    if (safeCtx.age) parts.push(`${safeCtx.age} years old`);
    const stageLabel = ({
      cycle: "currently menstruating (premenopausal cycle)",
      pregnancy: "pregnant",
      postpartum: "postpartum",
      perimenopause: "perimenopausal (climatério)",
      menopause: "postmenopausal",
      other: "life stage unspecified",
    })[safeCtx.lifeStage] || null;
    if (stageLabel) parts.push(stageLabel);
    if (safeCtx.cycleDay) parts.push(`approximately day ${safeCtx.cycleDay} of cycle`);
    if (safeCtx.postpartumWeeks != null) parts.push(`${safeCtx.postpartumWeeks} weeks postpartum`);
    if (safeCtx.monthsSincePeriod != null) parts.push(`${safeCtx.monthsSincePeriod} months since last period`);
    let line = parts.length ? `Patient context: ${parts.join(", ")}.` : "";
    if (safeCtx.notes) line += ` Patient notes: ${safeCtx.notes}`;
    return line.trim();
  })() : "";

  // ── Step 1: clinical reasoning in English (Claude Sonnet 4.5) ────────────
  const reasoningSystem = [
    "You are a careful explainer of female lab reports for a Brazilian patient audience, in the voice of a thoughtful Brazilian GP.",
    "Use only the labs and values provided. Do not invent labs, markers, or diagnoses.",
    "When patient context is given (age, life stage, cycle phase, postpartum, perimenopause, notes), interpret EACH value in light of that context. The same number can mean very different things across states (e.g., low ferritin postpartum, elevated prolactin in pregnancy, FSH in perimenopause).",
    "When context is provided, reference it explicitly in headline and key_points (e.g., 'At 32 with 3 weeks postpartum, ferritin of 18 reflects expected recovery from blood loss, not chronic deficiency').",
    "When context is absent, give a general female-physiology interpretation and flag that context (cycle phase, life stage) would refine the reading.",
    "Return ONLY valid JSON, with keys: full_summary and women_focus_summary.",
    "Each summary object must contain keys: headline, key_points (max 4), discuss_with_gp (max 4), next_steps (max 4), reassurance.",
    "Write all values in English. A separate translator will localise to Brazilian Portuguese in a follow-up step.",
    "Reference Brazilian conventions where relevant (mUI/L for TSH not mIU/L, comma decimal separator in any cited values) so the translator preserves them naturally.",
    "Tone: clear patient-facing language, scientifically careful, action-oriented. Not alarmist.",
  ].join("\n");

  const reasoningUser = [
    contextLineEn ? contextLineEn : "Patient context: not provided.",
    "",
    "Summarise these lab results for the patient. Output English JSON only:",
    JSON.stringify(safeRows),
  ].join("\n");

  const reasoning = await reasonWithClaude({ system: reasoningSystem, userContent: reasoningUser });
  if (!reasoning.ok) {
    console.error(`[Decifra summary] Reasoning step failed: ${reasoning.reason}`);
    return res.status(502).json({ error: "Resumo indisponível" });
  }

  let englishParsed;
  try {
    englishParsed = JSON.parse(stripJsonFences(reasoning.text));
  } catch {
    console.error("[Decifra summary] Claude reasoning returned invalid JSON:", reasoning.text.slice(0, 200));
    return res.status(502).json({ error: "Resumo retornou formato inválido" });
  }

  const englishJsonString = JSON.stringify(englishParsed);
  const contextLineForTranslator = contextLineEn;

  // ── Step 2: translate to pt-BR (Sabiá-3 primary, Claude fallback) ────────
  let translated = null;
  let translationPath = null;

  const sabiaResult = await translateWithSabia({ englishJson: englishJsonString, contextLineForTranslator });
  if (sabiaResult.ok) {
    try {
      const candidate = JSON.parse(stripJsonFences(sabiaResult.text));
      if (shapesMatch(englishParsed, candidate)) {
        translated = candidate;
        translationPath = "sabia-3";
      } else {
        console.warn("[Decifra summary] Sabiá-3 returned mismatched shape, falling back to Claude.");
      }
    } catch (e) {
      console.warn("[Decifra summary] Sabiá-3 returned invalid JSON, falling back to Claude:", e.message);
    }
  }

  if (!translated) {
    const claudePtBr = await translateWithClaude({ englishJson: englishJsonString, contextLineForTranslator });
    if (claudePtBr.ok) {
      try {
        const candidate = JSON.parse(stripJsonFences(claudePtBr.text));
        if (shapesMatch(englishParsed, candidate)) {
          translated = candidate;
          translationPath = "claude-pt-br-fallback";
        } else {
          console.warn("[Decifra summary] Claude pt-BR translation returned mismatched shape.");
        }
      } catch (e) {
        console.warn("[Decifra summary] Claude pt-BR translation returned invalid JSON:", e.message);
      }
    }
  }

  // Last resort: return the English output with a flag the client can read.
  if (!translated) {
    console.error("[Decifra summary] Both translation paths failed; returning English.");
    return res.status(200).json({
      summary: englishParsed,
      _reasoning_model: CLAUDE_MODEL,
      _translation_model: null,
      _translation_status: "failed_en",
    });
  }

  console.log(`[Decifra summary] ok: reasoning=${CLAUDE_MODEL} translation=${translationPath}`);
  return res.status(200).json({
    summary: translated,
    _reasoning_model: CLAUDE_MODEL,
    _translation_model: translationPath === "sabia-3" ? MARITACA_MODEL : CLAUDE_MODEL,
    _translation_status: "ok",
    _translation_path: translationPath,
  });
};
