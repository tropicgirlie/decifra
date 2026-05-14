const { useState, useEffect, useMemo, useRef, useCallback, createContext, useContext } = React;

// ---------- Supabase client (shared FemHealth.Science project) ----------
const SUPABASE_URL      = "https://fzazuqhmnbqxeqxbdduu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6YXp1cWhtbmJxeGVxeGJkZHV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4MTU1NjQsImV4cCI6MjA3NDM5MTU2NH0.N7uA3C0qWDDfZyf_v2pdnOLKpWtodukMbggj_jh2vWs";
// window.supabase is the UMD global from the CDN script loaded in index.html
const sb = (typeof window !== "undefined" && window.supabase)
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

async function sbUpsertUser(email, fields = {}) {
  if (!sb) return;
  try {
    await sb.from("femdecode_users").upsert(
      { email, ...fields },
      { onConflict: "email", ignoreDuplicates: false }
    );
  } catch { /* non-blocking */ }
}

async function sbGetUser(email) {
  if (!sb || !email) return null;
  try {
    const { data } = await sb
      .from("femdecode_users")
      .select("tier, pro_expires_at, context")
      .eq("email", email)
      .maybeSingle();
    return data;
  } catch { return null; }
}

// Persist user-supplied life-stage context per email (cross-device).
// Requires a `context` JSONB column on femdecode_users (see migrations note).
async function sbSaveContext(email, context) {
  if (!sb || !email) return;
  try {
    await sb.from("femdecode_users").upsert(
      { email, context },
      { onConflict: "email", ignoreDuplicates: false }
    );
  } catch { /* non-blocking */ }
}

// ---------- Tweaks defaults ----------
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "primary": "#8B1A4A",
  "serif": "Playfair Display",
  "density": "comfortable"
}/*EDITMODE-END*/;

const PRIMARY_SWATCHES = [
  { v: "#8B1A4A", n: "Bordeaux" },
  { v: "#6B2E6B", n: "Plum" },
  { v: "#2E5D4F", n: "Forest" },
  { v: "#1F3A5F", n: "Ink" },
  { v: "#B0552B", n: "Amber" },
  { v: "#1E1E24", n: "Graphite" },
];
const SERIF_OPTIONS = [
  "Playfair Display",
  "Cormorant Garamond",
  "DM Serif Display",
  "Fraunces",
  "Libre Caslon Text",
];
const DENSITY_OPTIONS = [
  { v: "compact", label: "Compact" },
  { v: "comfortable", label: "Comfortable" },
  { v: "spacious", label: "Spacious" },
];

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map(c => c + c).join("") : h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function mix(hex, amt) {
  const { r, g, b } = hexToRgb(hex);
  const k = (c) => Math.max(0, Math.min(255, Math.round(c + (amt < 0 ? c : 255 - c) * amt)));
  return `#${[k(r), k(g), k(b)].map(v => v.toString(16).padStart(2, "0")).join("")}`;
}

function applyTweaks(t) {
  const root = document.documentElement;
  root.style.setProperty("--primary", t.primary);
  root.style.setProperty("--primary-dark", mix(t.primary, -0.25));
  const { r, g, b } = hexToRgb(t.primary);
  root.style.setProperty("--ok-bg", `rgba(${r}, ${g}, ${b}, 0.08)`);
  root.style.setProperty("--serif", `"${t.serif}", "Iowan Old Style", Georgia, serif`);
  const dens = t.density === "compact" ? 0.82 : t.density === "spacious" ? 1.18 : 1;
  root.style.setProperty("--s1", `${Math.round(8 * dens)}px`);
  root.style.setProperty("--s2", `${Math.round(16 * dens)}px`);
  root.style.setProperty("--s3", `${Math.round(24 * dens)}px`);
  root.style.setProperty("--s4", `${Math.round(32 * dens)}px`);
  root.style.setProperty("--s5", `${Math.round(48 * dens)}px`);
  root.style.setProperty("--s6", `${Math.round(64 * dens)}px`);
}

function ensureFont(family) {
  const id = `tweak-font-${family.replace(/\s+/g, "-")}`;
  if (document.getElementById(id)) return;
  const l = document.createElement("link");
  l.id = id; l.rel = "stylesheet";
  l.href = `https://fonts.googleapis.com/css2?family=${family.replace(/\s+/g, "+")}:ital,wght@0,400;0,500;0,600;1,400;1,500&display=swap`;
  document.head.appendChild(l);
}

function Tweaks({ tweaks, setTweaks }) {
  const [active, setActive] = useState(false);
  useEffect(() => {
    const onMsg = (e) => {
      if (e.data?.type === "__activate_edit_mode") setActive(true);
      if (e.data?.type === "__deactivate_edit_mode") setActive(false);
    };
    window.addEventListener("message", onMsg);
    window.parent.postMessage({ type: "__edit_mode_available" }, "*");
    return () => window.removeEventListener("message", onMsg);
  }, []);

  const update = (patch) => {
    const next = { ...tweaks, ...patch };
    setTweaks(next);
    window.parent.postMessage({ type: "__edit_mode_set_keys", edits: patch }, "*");
  };

  if (!active) return null;

  return (
    <div className="tweaks-panel">
      <div className="tweaks-head">
        <div className="tweaks-title">Tweaks</div>
        <div className="tweaks-hint">Live · auto-saved</div>
      </div>

      <div className="tweaks-section">
        <div className="tweaks-label">Primary accent</div>
        <div className="tweaks-swatches">
          {PRIMARY_SWATCHES.map(s => (
            <button
              key={s.v}
              className={`tweak-swatch ${tweaks.primary === s.v ? "is-on" : ""}`}
              style={{ background: s.v }}
              title={s.n}
              onClick={() => update({ primary: s.v })}
            />
          ))}
        </div>
      </div>

      <div className="tweaks-section">
        <div className="tweaks-label">Display serif</div>
        <div className="tweaks-chips">
          {SERIF_OPTIONS.map(f => (
            <button
              key={f}
              className={`tweak-chip ${tweaks.serif === f ? "is-on" : ""}`}
              style={{ fontFamily: `"${f}", serif` }}
              onClick={() => { ensureFont(f); update({ serif: f }); }}
            >{f}</button>
          ))}
        </div>
      </div>

      <div className="tweaks-section">
        <div className="tweaks-label">Density</div>
        <div className="tweaks-seg">
          {DENSITY_OPTIONS.map(d => (
            <button
              key={d.v}
              className={`tweak-seg-btn ${tweaks.density === d.v ? "is-on" : ""}`}
              onClick={() => update({ density: d.v })}
            >{d.label}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- Sample report ----------
const SAMPLE_REPORT = `Paciente: [ANONIMIZADO]   DN: 14/03/1991
Material coletado em: 08/04/2026     Liberado em: 11/04/2026
Médica solicitante: Dra. M. Alarcón    Atendimento: WH-248301

EXAME                                 RESULTADO  UNIDADE    VALOR DE REFERÊNCIA
------------------------------------------------------------------------------
TSH (Hormônio Tireoestimulante)       3,4        mUI/L      0,4 a 4,0
T4 Livre                              1,2        ng/dL      0,8 a 1,8
Ferritina                             21         ng/mL      15 a 150
Vitamina D (25-OH)                    27         ng/mL      30 a 100
Progesterona                          7,5        ng/mL      2 a 25
Estradiol (E2)                        110        pg/mL      30 a 400
FSH                                   9,8        mUI/mL     3 a 10
LH                                    6,1        mUI/mL     2 a 15
Vitamina B12                          410        pg/mL      200 a 900
Hemoglobina Glicada (HbA1c)           5,2        %          4,8 a 5,6
------------------------------------------------------------------------------
Hemograma completo:
Hemoglobina                           13,2       g/dL       12,0 a 16,0
Hematócrito                           39         %          36 a 46
Leucócitos                            6800       /mm³       4000 a 11000
Plaquetas                             280000     /mm³       150000 a 450000
------------------------------------------------------------------------------
Fim do laudo. Material analisado em laboratório acreditado.`;

// ---------- Strict extraction ----------
// Primary path: call Claude with the strict prompt.
// Fallback path: if the model call fails or we're offline, use a regex
// that ONLY reports markers it can see in the text. No invented markers, ever.

const KNOWN_PANEL = [
  "TSH", "Free T4", "Ferritin", "Vitamin D (25-OH)", "Progesterone", "Estradiol (E2)",
  "FSH", "LH", "Vitamin B12", "HbA1c", "AMH", "Prolactin", "Testosterone", "SHBG",
  "DHEA-S", "Cortisol", "Iron", "Folate",
];

const EXTRACTION_SYSTEM_PROMPT = `You are a medical lab result extraction engine.
Your task is to extract ONLY the markers that are explicitly present in the provided source text.
This is a strict extraction task, not interpretation.

RULES
1. Extract only results that are explicitly written in the source text.
2. Do not guess, infer, complete, estimate, normalise, or "help".
3. Do not add common markers that are missing from the source.
4. Do not merge values from other pages, previous uploads, examples, memory, templates, or prior runs.
5. Do not convert units unless the prompt explicitly asks for conversion.
6. Keep the original unit exactly as written in the source.
7. Keep the reference range exactly as written in the source.
8. If a marker is not explicitly present, do not include it.
9. If a value is unclear or ambiguous, exclude it rather than guessing.
10. If the same marker appears more than once, return each occurrence separately unless clearly duplicated in the same line.
11. Confidence must reflect extraction certainty only, not clinical certainty.
12. Source snippet must be a short verbatim snippet copied from the source text that proves the extraction.
13. Never generate example values.
14. Never use outside medical knowledge to fill gaps.
15. Output valid JSON only. No markdown. No commentary.

OUTPUT SCHEMA
{
 "results": [
   { "marker": "string", "value": "string", "unit": "string",
     "reference_range": "string", "confidence": "high | medium | low",
     "source_snippet": "string" }
 ],
 "not_found_markers": ["string"]
}

CONFIDENCE RULES
- high   = marker, value, unit, and range are all clearly present in the same local text
- medium = marker and value are clear, but unit or range formatting is slightly messy
- low    = text is partially broken but still directly readable from source`;

// Same triangulation as api/extract.js — strips rows whose snippet does not prove marker + value on one line.
function collapseWsGround(s) {
  return String(s || "").normalize("NFKC").replace(/\s+/g, " ").trim();
}
function snippetIsLiteralSubstringGround(snippet, fullText) {
  const a = collapseWsGround(snippet).toLowerCase();
  const b = collapseWsGround(fullText).toLowerCase();
  return a.length >= 7 && b.includes(a);
}
function markerReferencedInSnippetGround(marker, snippet) {
  const sn = collapseWsGround(snippet).toLowerCase();
  if (!sn) return false;
  let core = collapseWsGround(String(marker || ""))
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!core) return false;
  if (core.length <= 4 && !/\s/.test(core)) {
    try {
      return new RegExp(`\\b${core.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(snippet);
    } catch {
      return false;
    }
  }
  if (sn.includes(core)) return true;
  const tok = core.split(" ").filter((t) => t.length >= 3);
  if (tok.length >= 2 && tok.every((t) => sn.includes(t)) && tok.some((t) => t.length >= 4)) return true;
  return false;
}
function valueAppearsInSnippetGround(value, snippet) {
  const v = String(value ?? "").trim();
  if (!v || !/\d/.test(v)) return true;
  const compact = (s) => collapseWsGround(s).replace(/\s/g, "").toLowerCase();
  const vs = compact(v).replace(",", ".");
  const pool = [compact(v), vs, compact(v).replace(".", ",")];
  const sn = compact(snippet);
  return pool.some((p) => p && sn.includes(p));
}
function isMarkerGroundedInSourceRow(r, fullText) {
  const snippet = r.source_snippet;
  if (!snippet || !snippetIsLiteralSubstringGround(snippet, fullText)) return false;
  if (!markerReferencedInSnippetGround(r.marker, snippet)) return false;
  if (!valueAppearsInSnippetGround(r.value, snippet)) return false;
  return true;
}

/** Keep in sync with api/extract.js MAX_INPUT_CHARS */
const MAX_EXTRACT_CHARS = 180_000;
const BUILD_TAG = "build-20260507-1013";

// Gratuito durante a beta. Desativa a transição para o paywall para todos os usuários.
// Mude para false no lançamento para reativar a barreira de assinatura.
const BETA_FREE_MODE = true;

const FEEDBACK_EMAIL = "contato@decifra.com.br";
function feedbackMailto(context = "") {
  const subject = encodeURIComponent("Feedback da beta Decifra");
  const url = typeof window !== "undefined" ? window.location.href : "";
  const body = encodeURIComponent(
    `Página: ${url}\n` +
    (context ? `Contexto: ${context}\n` : "") +
    `\nO que aconteceu:\n\n\nO que você esperava:\n\n`
  );
  return `mailto:${FEEDBACK_EMAIL}?subject=${subject}&body=${body}`;
}

async function extractWithClaude(text, images = []) {
  if (text && text.length > MAX_EXTRACT_CHARS) {
    throw new Error(
      `O laudo está longo demais (${text.length.toLocaleString()} caracteres). O limite é ${MAX_EXTRACT_CHARS.toLocaleString()}. Tente dividir em um painel por vez, ou cole apenas a seção de resultados.`
    );
  }
  const hasImages = Array.isArray(images) && images.length > 0;
  // Always use server-side Claude proxy — API key never exposed to browser.
  // Falls back to regexExtract (in startDecode) if the server is unreachable.
  const res = await fetch(`${window.location.origin}/api/extract`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(hasImages ? { text: text || "", images } : { text }),
    credentials: "same-origin",
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Server extraction error ${res.status}: ${err}`);
  }
  const parsed = await res.json();
  // Claude returns { markers: [...] } — normalise to internal { results: [...] }
  if (parsed && Array.isArray(parsed.markers)) {
    const results = parsed.markers.map((m) => ({
      marker:          String(m.marker || "").trim(),
      value:           String(m.value  ?? "").trim(),
      unit:            String(m.unit   || "").trim(),
      reference_range: String(m.reference_range || "").trim(),
      confidence:      m.confidence || (m.status === "critical_low" || m.status === "critical_high" ? "low"
                     : m.status === "normal" ? "high" : "medium"),
      source_snippet:  m.source_snippet || "",
      female_context:  m.female_context || "",
      panel:           m.panel || "",
      status:          m.status || "",
    }))
      .filter((r) => r.marker && r.value)
      .filter((r) => isMarkerGroundedInSourceRow(r, text));
    const foundNames = new Set(results.map((r) => r.marker.toUpperCase()));
    const not_found_markers = KNOWN_PANEL.filter((n) => {
      const norm = n.toUpperCase().replace(/\s*\(.*?\)\s*/g, "").trim();
      return ![...foundNames].some((f) => f.includes(norm) || norm.includes(f));
    });
    return { results, not_found_markers };
  }
  if (!parsed || !Array.isArray(parsed.results)) throw new Error("Bad shape from server");
  return parsed;
}

// Regex fallback: same-line value + optional unit + optional ref range; or "Marker … : … value …" tail.
// Aliases align with KNOWN_PANEL + common CBC/metabolic/thyroid/obstetric lines (women's health panels).
const LAB_VALUE_CORE =
  /(-?\d+(?:[.,]\d+)?)\s*([A-Za-z%/µμ]+(?:\/[A-Za-z0-9%µμ]+)?)?\s*(?:\(?\s*(-?\d+(?:[.,]\d+)?)\s*[–\-—to.]+\s*(-?\d+(?:[.,]\d+)?)\s*\)?)?/;
function parseLabLineForAlias(trimmed, aliasRe) {
  const hit = trimmed.match(aliasRe);
  if (!hit || hit.index === undefined) return null;
  const tail = trimmed.slice(hit.index + hit[0].length).trim().replace(/^[:.\s–-]+/, "");
  const tm = tail.match(/^([<>≤≥]?\s*)?(-?\d+(?:[.,]\d+)?)\s*([A-Za-z%/µμ]+(?:\/[A-Za-z0-9%µμ]+)?)?/i);
  if (tm && tm[2]) {
    const unit = (tm[3] || "").trim();
    let ref = "";
    const parenR = trimmed.match(/\(\s*(-?\d+(?:[.,]\d+)?)\s*[–\-—.]+\s*(-?\d+(?:[.,]\d+)?)\s*\)/);
    if (parenR) ref = `${parenR[1]}-${parenR[2]}`;
    else {
      const endR = trimmed.match(/(-?\d+(?:[.,]\d+)?)\s*[–\-—.]+\s*(-?\d+(?:[.,]\d+)?)\s*$/);
      if (endR) ref = `${endR[1]}-${endR[2]}`;
    }
    return { value: tm[2], unit, reference_range: ref, confidence: unit ? "high" : "medium" };
  }
  const m = trimmed.match(LAB_VALUE_CORE);
  if (!m || !m[1]) return null;
  const ref = m[3] && m[4] ? `${m[3]}-${m[4]}` : "";
  return { value: m[1], unit: (m[2] || "").trim(), reference_range: ref, confidence: m[2] ? "high" : "medium" };
}

function regexExtract(text) {
  const aliases = [
    ["TSH", /\bTSH\b|\bThyroid\s+Stimulating\s+Hormone\b/i],
    ["FREE T4", /\bFree\s*T4\b|\bFT4\b/i],
    ["FREE T3", /\bFree\s*T3\b|\bFT3\b/i],
    ["FERRITIN", /\bFerritin\b/i],
    ["IRON", /\bSerum\s+Iron\b|\bS-?Iron\b/i],
    ["VITAMIN D", /\b25-?\s*OH\s+Vitamin\s*D\b|\bVitamin\s*D\b(?!\s*B)|\bVit\.?\s*D\b(?!\s*B)/i],
    ["PROGESTERONE", /\bProgesterone\b/i],
    ["ESTRADIOL", /\bEstradiol\b|\bE2\b|\bOestradiol\b/i],
    ["FSH", /\bFSH\b/i],
    ["LH", /\bLH\b/i],
    ["AMH", /\bAMH\b|\bAnti[- ]?M[uü]llerian\b/i],
    ["PROLACTIN", /\bProlactin\b/i],
    ["TESTOSTERONE", /\bTestosterone\b|\bTotal\s+Testosterone\b/i],
    ["SHBG", /\bSHBG\b|\bSex\s+Hormone\s+Binding\s+Globulin\b/i],
    ["DHEA-S", /\bDHEA[- ]?S?\b|\bDHEAS\b/i],
    ["CORTISOL", /\bCortisol\b/i],
    ["FOLATE", /\bFolate\b|\bFolic\s+Acid\b|\bVitamin\s*B9\b/i],
    ["VITAMIN B12", /\bVitamin\s*B12\b|\bB12\b|\bCobalamin\b/i],
    ["HBA1C", /\bHbA1c\b|\bHBA1C\b|\bHemoglobin\s*A1c\b|\bA1C\b/i],
    ["GLUCOSE", /\bGlucose\b|\bBlood\s+Glucose\b|\bFBG\b|\bFPG\b/i],
    ["HEMOGLOBIN", /\bHemoglobin\b|\bHaemoglobin\b|\bHGB\b|\bHb\b/i],
    ["HAEMATOCRIT", /\bHematocrit\b|\bHaematocrit\b|\bHct\b|\bHCT\b/i],
    ["WBC", /\bWBC\b|\bWhite\s+Blood\s+Cell\b|\bLeukocytes?\b/i],
    ["RBC", /\bRBC\b|\bRed\s+Blood\s+Cell\b|\bErythrocytes?\b/i],
    ["PLATELETS", /\bPlatelets?\b|\bPLT\b|\bThrombocytes?\b/i],
    ["MCV", /\bMCV\b/i],
    ["MCH", /\bMCH\b/i],
    ["MCHC", /\bMCHC\b/i],
    ["CREATININE", /\bCreatinine\b|\bS-?\s*Creatinine\b/i],
    ["EGFR", /\beGFR\b|\bGFR\b|\bMDRD\b|\bCKD-?EPI\b/i],
    ["ALT", /\bALT\b|\bALAT\b|\bSGPT\b/i],
    ["AST", /\bAST\b|\bASAT\b|\bSGOT\b/i],
    ["TRIGLYCERIDES", /\bTriglycerides?\b|\bTG\b/i],
    ["HDL", /\bHDL\b|\bHDL\s*Cholesterol\b/i],
    ["LDL", /\bLDL\b|\bLDL\s*Cholesterol\b/i],
    ["TOTAL CHOLESTEROL", /\bTotal\s+Cholesterol\b|\bCholesterol\s+Total\b/i],
    ["ANTI-TPO", /\bAnti-?TPO\b|\bTPO\s*Ab\b|\bThyroid\s*Peroxidase\b/i],
    ["BHCG", /\bβ-?\s*hCG\b|\bBeta\s*hCG\b|\bhCG\b|\bBHCG\b/i],
    ["CA-125", /\bCA-?125\b|\bCancer\s*Antigen\s*125\b/i],
  ];
  const results = [];
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    for (const [name, re] of aliases) {
      const parsed = parseLabLineForAlias(trimmed, re);
      if (parsed) {
        results.push({
          marker:          name,
          value:           parsed.value,
          unit:            parsed.unit,
          reference_range: parsed.reference_range,
          confidence:      parsed.confidence,
          source_snippet:  trimmed.slice(0, 120),
        });
        break;
      }
    }
  }
  const seen = new Set();
  const deduped = results.filter((r) => !seen.has(r.marker) && seen.add(r.marker));
  const foundNames = new Set(deduped.map((r) => r.marker.toUpperCase()));
  const not_found_markers = KNOWN_PANEL.filter((n) => {
    const norm = n.toUpperCase().replace(/\s*\(.*?\)\s*/g, "").trim();
    return ![...foundNames].some((f) => f.includes(norm) || norm.includes(f));
  });
  return { results: deduped, not_found_markers };
}

// ---------- Interpretations (static; applied AFTER confirmation, no values changed) ----------
const INTERPRETATIONS = {
  "TSH": { measures: "Hormônio Tireoestimulante (TSH), o sinal da hipófise que regula a produção da tireoide.",
    female_context: "Mudanças tireoidianas causam irregularidade do ciclo, defeitos de fase lútea e fadiga no climatério. O TSH oscila com a gestação e com terapia estrogênica.",
    low: "Palpitações, intolerância ao calor, ciclos mais leves ou ausentes, ansiedade.",
    high: "Fadiga, sensibilidade ao frio, ciclos mais intensos, queda de cabelo, subfertilidade.",
    evidence: "forte" },
  "FREE T4": { measures: "A fração livre e biodisponível do hormônio tireoidiano que circula até os tecidos.",
    female_context: "Leia junto com o TSH. O T4 livre pode revelar hipotireoidismo central que o TSH sozinho não detecta, importante no climatério e no pós-parto.",
    low: "Fadiga persistente, intolerância ao frio, lentidão cognitiva.",
    high: "Tremores, perda de peso, sono interrompido, encurtamento do ciclo.",
    evidence: "forte" },
  "FERRITIN": { measures: "Ferro armazenado, o melhor indicador isolado das reservas de ferro.",
    female_context: "Mulheres que menstruam perdem ferro mensalmente. A ferritina costuma estar baixa mesmo sem anemia. Queda de cabelo e fadiga ao exercício aparecem bem antes de a hemoglobina cair.",
    low: "Queda de cabelo, intolerância ao exercício, síndrome das pernas inquietas, falta de ar, nevoeiro mental.",
    high: "Pode refletir inflamação, sobrecarga hepática ou excesso de ferro. Investigue o contexto.",
    evidence: "forte" },
  "VITAMIN D": { measures: "A forma de armazenamento da vitamina D, refletindo as últimas 2 a 3 semanas de status.",
    female_context: "Vitamina D baixa está associada à intensidade da TPM, a características metabólicas da SOP e à aceleração da perda óssea no climatério.",
    low: "Dores musculoesqueléticas, humor baixo, sono ruim, suscetibilidade imunológica.",
    high: "Rara fora de suplementação. Risco de hipercalcemia em níveis muito altos.",
    evidence: "moderada" },
  "PROGESTERONE": { measures: "Hormônio do corpo lúteo, dominante na segunda metade de um ciclo ovulatório.",
    female_context: "Depende do dia do ciclo. Amostras de meio da fase lútea acima de cerca de 3 ng/mL indicam que houve ovulação. A progesterona cai primeiro no climatério.",
    low: "Fase lútea curta, escape, distúrbio do sono, ansiedade aumentada antes da menstruação.",
    high: "Pode indicar gestação, cisto lúteo ou progesterona exógena.",
    evidence: "forte" },
  "ESTRADIOL": { measures: "O estrogênio dominante em mulheres em idade reprodutiva, produzido principalmente pelos folículos em desenvolvimento.",
    female_context: "Varia ao longo do ciclo: baixo no início da fase folicular, pico antes da ovulação, segunda elevação no meio da fase lútea. Cai progressivamente no climatério.",
    low: "Ressecamento vaginal, fogachos, perda de densidade óssea, alterações de humor, nevoeiro cognitivo.",
    high: "Sensibilidade nas mamas, menstruações intensas, ou pico pré-ovulatório normal.",
    evidence: "forte" },
  "FSH": { measures: "Hormônio Folículo-Estimulante (FSH), conduz o recrutamento folicular a cada ciclo.",
    female_context: "Melhor interpretado entre os dias 2 e 4 do ciclo. Aumento do FSH é um dos primeiros sinais de queda da reserva ovariana e do início do climatério.",
    low: "Raro. Pode indicar supressão hipofisária ou amenorreia hipotalâmica.",
    high: "Reserva ovariana diminuída, climatério, menopausa.",
    evidence: "forte" },
  "LH": { measures: "Hormônio Luteinizante (LH), desencadeia a ovulação com seu pico no meio do ciclo.",
    female_context: "Razão LH/FSH acima de 2 em coleta na fase folicular inicial é uma característica de apoio à SOP. Leia junto com FSH e dia do ciclo.",
    low: "Supressão hipotalâmica, baixa disponibilidade de energia, amenorreia relacionada ao estresse.",
    high: "Padrão de SOP, pico ovulatório, ou climatério.",
    evidence: "moderada" },
  "VITAMIN B12": { measures: "Cobalamina, necessária para formação de hemácias, mielina e metilação.",
    female_context: "Contraceptivos orais e metformina reduzem a B12. A deficiência simula o nevoeiro mental e a fadiga do climatério, e costuma passar despercebida.",
    low: "Fadiga, parestesia, lentidão cognitiva, glossite, alterações de humor.",
    high: "Geralmente por suplementação. Raramente por causas hematológicas ou hepáticas.",
    evidence: "forte" },
  "HBA1C": { measures: "Glicose média no sangue dos últimos 3 meses aproximadamente, refletida na hemoglobina glicada.",
    female_context: "Aumento da HbA1c na meia-idade acompanha a mudança metabólica do climatério em direção à resistência à insulina. Relevante para o rastreio metabólico na SOP.",
    low: "Raramente preocupante. Considere hemólise ou redução do tempo de vida das hemácias.",
    high: "Pré-diabetes (5,7 a 6,4%), diabetes (a partir de 6,5%). Interage com irregularidade do ciclo e variação de peso.",
    evidence: "forte" },
  "CORTISOL": { measures: "Principal glicocorticoide. Regula a resposta ao estresse e a mobilização de glicose.",
    female_context: "Elevação crônica suprime a ovulação, piora o sono e os sintomas do climatério, e amplifica a adiposidade abdominal." },
  "AMH": { measures: "Hormônio Antimülleriano (HAM), produzido pelos pequenos folículos antrais.",
    female_context: "Marcador indireto de reserva ovariana. Útil para planejamento de fertilidade, não preditor direto de concepção natural em um ciclo específico." },
  "PROLACTIN": { measures: "Hormônio hipofisário. Níveis altos suprimem a ovulação.",
    female_context: "Prolactina elevada é causa comum e reversível de amenorreia, galactorreia e subfertilidade." },
  "TESTOSTERONE": { measures: "Andrógeno produzido pelos ovários e pelas suprarrenais.",
    female_context: "Elevado na SOP. Níveis baixos associam-se à redução da libido e da energia, especialmente após ooforectomia." },
  "SHBG": { measures: "Globulina Ligadora de Hormônios Sexuais (SHBG), liga testosterona e estradiol na circulação.",
    female_context: "SHBG baixa eleva os andrógenos livres (SOP, resistência à insulina). Estrogênio e hormônio tireoidiano elevam a SHBG." },
  "DHEA-S": { measures: "Precursor de andrógeno produzido pelas suprarrenais.",
    female_context: "Rastreia a contribuição adrenal no hiperandrogenismo. Cai acentuadamente com a idade." },
  "IRON": { measures: "Ferro sérico circulante, uma fotografia do momento, não um estoque.",
    female_context: "Use junto com a ferritina e a saturação de transferrina. Um valor isolado pode ser enganoso conforme o dia do ciclo." },
  "FOLATE": { measures: "Vitamina B9 (folato), necessária para síntese de DNA e formação de hemácias.",
    female_context: "Relevância pré-concepcional alta. A deficiência aumenta o risco de defeito do tubo neural." },

  // ── Tireoide (estendido) ─────────────────────────────────────────────────
  "FREE T3": { measures: "Tri-iodotironina (T3 livre), o hormônio tireoidiano biologicamente ativo no nível celular.",
    female_context: "Muitas mulheres sentem sintomas de hipotireoidismo com TSH e T4 normais, mas com T3 livre no limite inferior. Estresse, dietas de muito baixa caloria e deficiência de ferro prejudicam a conversão de T4 em T3. Particularmente relevante no climatério e no pós-parto.",
    low: "Fadiga, nevoeiro mental, intolerância ao frio, humor baixo, constipação, queda de cabelo, mesmo com TSH normal.",
    high: "Palpitações, intolerância ao calor, ansiedade, perda de peso. Menos comum se o T4 também estiver normal.",
    evidence: "moderada" },

  "ANTI-TPO": { measures: "Anticorpos antitireoperoxidase (anti-TPO), principal marcador de doença tireoidiana autoimune.",
    female_context: "A tireoidite de Hashimoto é a condição autoimune mais comum em mulheres. Anti-TPO positivo pode preceder a elevação do TSH em anos. Associado a perda gestacional, depressão, tireoidite pós-parto e sobreposição com SOP. Mulheres com anticorpos positivos e TSH 'normal' merecem acompanhamento.",
    low: "Normal (negativo). Faixa de referência tipicamente abaixo de 35 UI/mL.",
    high: "Sugere tireoidite autoimune. Elevado em Hashimoto e em Graves.",
    evidence: "forte" },

  "ANTI-TG": { measures: "Anticorpos anti-tireoglobulina (anti-TG), marcador secundário de doença tireoidiana autoimune.",
    female_context: "Presente em 60 a 80% dos casos de Hashimoto. Útil quando o anti-TPO está no limite. Também elevado em alguns cânceres de tireoide. Menos específico que o anti-TPO, mas acrescenta informação quando os dois são pedidos juntos.",
    low: "Normal (negativo). Faixa de referência tipicamente abaixo de 40 UI/mL.",
    high: "Sugere tireoidite autoimune ao lado do anti-TPO.",
    evidence: "moderada" },

  "REVERSE T3": { measures: "Uma forma inativa de T3 produzida a partir do T4, que compete com o T3 livre ativo nos sítios receptores.",
    female_context: "T3 reverso elevado bloqueia o T3 ativo, produzindo sintomas de hipotireoidismo apesar de TSH normal. Sobe em estresse severo, doença, dietas de muito baixa caloria e excesso de cortisol. Relevante quando os sintomas persistem após tratamento padrão da tireoide.",
    low: "Pode indicar baixa produção geral de T4.",
    high: "Sugere prejuízo na conversão de T4 em T3. T3 reverso alto com T3 livre no limite inferior é clinicamente significativo.",
    evidence: "emergente" },

  // ── Inflamação ───────────────────────────────────────────────────────────
  "HSCRP": { measures: "Proteína C-reativa ultrassensível (PCR-us), marcador de inflamação sistêmica de baixo grau.",
    female_context: "Elevada em SOP, endometriose, climatério e síndrome metabólica. PCR-us aumentada (acima de 1 mg/L) somada a desequilíbrio hormonal aponta para causas inflamatórias dos sintomas. O risco cardiovascular dobra em mulheres na menopausa com PCR-us acima de 3 mg/L. Suprimida pelo estrogênio. Costuma subir na menopausa.",
    low: "Abaixo de 1 mg/L: risco cardiovascular baixo. Bom basal.",
    high: "1 a 3 mg/L: risco intermediário. Acima de 3 mg/L: risco alto. Descarte infecção aguda antes de interpretar.",
    evidence: "forte" },

  "CRP": { measures: "Proteína C-reativa (PCR), proteína inflamatória de fase aguda produzida pelo fígado.",
    female_context: "A PCR padrão detecta inflamação grosseira. A PCR-us é mais sensível para inflamação crônica de baixo grau, relevante para saúde hormonal. Elevada em endometriose ativa, SOP, doença tireoidiana autoimune e risco cardiovascular do climatério.",
    low: "Abaixo de 5 mg/L: tipicamente normal.",
    high: "Acima de 10 mg/L geralmente indica infecção ativa ou doença inflamatória significativa.",
    evidence: "forte" },

  // ── Metabolismo ──────────────────────────────────────────────────────────
  "FASTING GLUCOSE": { measures: "Glicose no sangue medida após jejum mínimo de 8 horas, refletindo o controle glicêmico basal.",
    female_context: "Mulheres com SOP têm risco significativamente elevado de diabetes tipo 2 ao longo da vida. Alterações da glicose em jejum precedem a elevação da HbA1c em anos. O metabolismo da glicose muda no climatério, quando a perda de estrogênio prejudica a sensibilidade à insulina. Glicose em jejum de 100 a 125 mg/dL define pré-diabetes.",
    low: "Abaixo de 70 mg/dL: hipoglicemia. Pode causar fadiga, tremores, nevoeiro mental, às vezes confundidos com ansiedade.",
    high: "100 a 125 mg/dL: pré-diabetes. Igual ou acima de 126 mg/dL em duas ocasiões: diabetes.",
    evidence: "forte" },

  "FASTING INSULIN": { measures: "Insulina medida após jejum mínimo de 8 horas, refletindo a produção pancreática de insulina e a sensibilidade à insulina.",
    female_context: "A resistência à insulina está presente em 70 a 80% das mulheres com SOP, inclusive nas magras. Insulina em jejum elevada com glicose normal é o sinal metabólico mais precoce, aparecendo anos antes de a HbA1c se alterar. Raramente entra nos painéis padrão, mas é provavelmente o marcador metabólico clinicamente mais importante para mulheres em idade reprodutiva com sintomas hormonais.",
    low: "Abaixo de 3 µUI/mL: pode sugerir produção insuficiente de insulina.",
    high: "Acima de 10 a 15 µUI/mL em jejum sugere resistência à insulina. Interprete junto com a glicose em jejum via HOMA-IR.",
    evidence: "forte" },

  "HOMA-IR": { measures: "Modelo Homeostático de Avaliação de Resistência à Insulina (HOMA-IR), calculado como glicose em jejum vezes insulina em jejum, dividido por 22,5.",
    female_context: "A medida clínica mais acessível de resistência à insulina sem teste oral de tolerância à glicose. Valor acima de 2,0 sugere resistência à insulina. Acima de 2,5 é clinicamente significativo na maioria das populações. Mulheres com SOP, ganho de peso no climatério, ou dificuldade para perder peso apesar de mudanças no estilo de vida, devem priorizar esse marcador.",
    low: "Abaixo de 1,0: boa sensibilidade à insulina.",
    high: "Acima de 2,0 a 2,5: resistência à insulina. Acima de 3,5: resistência significativa. Impulsiona o excesso de andrógenos na SOP e o risco cardiovascular após a menopausa.",
    evidence: "forte" },

  // ── Lipídios ─────────────────────────────────────────────────────────────
  "TOTAL CHOLESTEROL": { measures: "Soma de todo o colesterol no sangue: HDL, LDL e VLDL.",
    female_context: "Mulheres têm naturalmente HDL mais alto que os homens, o que mascara o risco cardiovascular quando se avalia apenas o colesterol total. A razão entre colesterol total e HDL é mais informativa. O colesterol sobe acentuadamente na menopausa, quando a perda de estrogênio prejudica a depuração do LDL.",
    low: "Abaixo de 115 mg/dL: raro. Pode afetar a produção de hormônios esteroides e a integridade das membranas celulares.",
    high: "Acima de 200 mg/dL: elevado. O contexto de risco depende muito da relação HDL/LDL.",
    evidence: "forte" },

  "LDL": { measures: "Lipoproteína de baixa densidade (LDL), principal transportadora de colesterol para os tecidos. Marcador-chave de risco cardiovascular.",
    female_context: "O LDL sobe significativamente no climatério e na menopausa, quando o estrogênio (que estimula os receptores de LDL) cai. Mulheres anteriormente de baixo risco podem ter LDL elevado aos 50 anos sem nenhuma mudança alimentar. O tamanho das partículas importa: LDL pequeno e denso é mais aterogênico.",
    low: "Abaixo de 70 mg/dL: ideal, especialmente se houver outros fatores de risco cardiovascular.",
    high: "Acima de 115 mg/dL: elevado. Acima de 155 mg/dL: risco alto. Interprete com HDL, triglicérides e PCR-us.",
    evidence: "forte" },

  "HDL": { measures: "Lipoproteína de alta densidade (HDL), o 'transportador' do colesterol dos tecidos de volta para o fígado. Protetora.",
    female_context: "Mulheres naturalmente têm HDL mais alto que homens, por efeito do estrogênio. O HDL cai na menopausa e com resistência à insulina. HDL em queda em uma mulher no climatério é um sinal metabólico precoce. HDL baixo somado a triglicérides altos é o padrão lipídico mais perigoso para risco cardiovascular.",
    low: "Abaixo de 40 mg/dL em mulheres: risco cardiovascular significativamente elevado.",
    high: "Acima de 60 mg/dL: protetor. HDL muito alto (acima de 100 mg/dL) pode paradoxalmente perder a função protetora.",
    evidence: "forte" },

  "TRIGLYCERIDES": { measures: "Gorduras no sangue que refletem ingestão de carboidratos, produção hepática de gordura e sensibilidade à insulina.",
    female_context: "Triglicérides são altamente sensíveis ao estrogênio e à insulina. Sobem com resistência à insulina (comum na SOP) e na menopausa. Triglicérides em jejum acima de 150 mg/dL é um marcador precoce de disfunção metabólica. A razão triglicérides/HDL é um dos preditores mais fortes de resistência à insulina em mulheres.",
    low: "Abaixo de 80 mg/dL: ideal.",
    high: "Acima de 150 mg/dL: elevado. Acima de 500 mg/dL: risco de pancreatite.",
    evidence: "forte" },

  "GLUCOSE": { measures: "Concentração de glicose no sangue (medida aleatória ou linha laboratorial de glicose conforme rotulada no laudo).",
    female_context: "O controle glicêmico interage com SOP, risco de diabetes gestacional e a mudança metabólica do climatério. Interprete com o status de jejum e a HbA1c quando disponível. Limites na gestação diferem dos não gestacionais.",
    low: "Hipoglicemia sintomática precisa de contexto clínico. Faixas baixas variam por método laboratorial.",
    high: "Valores elevados merecem correlação com HbA1c, status gestacional e sintomas.",
    evidence: "forte" },

  "CREATININE": { measures: "Resíduo do metabolismo muscular filtrado pelos rins. Marcador central de depuração renal.",
    female_context: "A doença renal crônica é subdiagnosticada em mulheres. A TFG estimada (eGFR) deve ser interpretada com massa muscular e status gestacional. Muitos medicamentos usados em ginecologia e obstetrícia exigem ajuste de dose quando a função renal cai.",
    low: "Raramente baixa isoladamente. Considere baixa massa muscular.",
    high: "Creatinina em alta com TFG em queda merece acompanhamento nefrológico e revisão das medicações.",
    evidence: "forte" },

  "EGFR": { measures: "Taxa de filtração glomerular estimada (TFGe), derivada da creatinina e de dados demográficos.",
    female_context: "Dose de medicamentos, decisões sobre contraste e planejamento gestacional usam a TFGe. Doença autoimune e hipertensão, comuns em mulheres com SOP ou histórico de pré-eclâmpsia, aceleram o declínio.",
    low: "Valores interpretados conforme idade e etnia, pela equação do laboratório.",
    high: "TFGe persistentemente reduzida define o estadiamento da doença renal crônica e dispara redução de risco cardiovascular.",
    evidence: "forte" },

  "WBC": { measures: "Contagem de leucócitos (glóbulos brancos), reflete a produção medular imune e o estresse agudo.",
    female_context: "Leucocitose na gestação pode ser fisiológica. Em mulheres não gestantes, infecção, inflamação (inclusive pélvica) e medicações são causas comuns. Leucócitos baixos podem se relacionar a autoimunidade ou supressão medular.",
    low: "Limites de neutropenia são específicos do laboratório. Correlacione com sintomas e diferenciais.",
    high: "Leucocitose exige investigação de infecção versus inflamação no contexto clínico.",
    evidence: "forte" },

  "RBC": { measures: "Contagem de hemácias, em paralelo à hemoglobina para tipagem da anemia.",
    female_context: "Sangramento menstrual intenso causa padrões de deficiência de ferro (frequentemente hemácias baixas com VCM baixo). Traço talassêmico pode aumentar a contagem de hemácias com VCM baixo, comum em algumas ancestralidades.",
    low: "Hemácias baixas com Hb baixa apoiam anemia. Interprete com VCM e ferritina.",
    high: "Policitemia é incomum. Considere desidratação ou encaminhamento à hematologia.",
    evidence: "forte" },

  "PLATELETS": { measures: "Contagem de plaquetas, central para a coagulação e para o risco cirúrgico.",
    female_context: "Trombocitopenia na gestação (trombocitopenia gestacional, HELLP) e elevação de plaquetas na deficiência de ferro são padrões clássicos da saúde feminina. Influenciam planejamento de anestesia peridural e cirurgia.",
    low: "Abaixo de aproximadamente 150 mil/µL merece avaliação obstétrica se a paciente estiver gestante. Os limites variam por trimestre.",
    high: "Trombocitose reativa costuma vir após correção de deficiência de ferro ou inflamação.",
    evidence: "forte" },

  "MCH": { measures: "Hemoglobina Corpuscular Média (HCM), Hb média por hemácia.",
    female_context: "HCM baixa com VCM baixo apoia deficiência de ferro em mulheres que menstruam. HCM alta com VCM alto sugere problemas com B12 ou folato.",
    low: "Hipocromia no esfregaço correlaciona com deficiência de ferro.",
    high: "Hipercromia sugere investigação de macrocitose.",
    evidence: "moderada" },

  "MCHC": { measures: "Concentração de Hemoglobina Corpuscular Média (CHCM).",
    female_context: "Usada com VCM e HCM para classificar a anemia. Esferocitose e artefatos técnicos podem alterar a CHCM.",
    low: "CHCM baixa com microcitose apoia deficiência de ferro.",
    high: "Valores espuriamente altos podem ocorrer com hemólise ou crioaglutininas.",
    evidence: "moderada" },

  "ALT": { measures: "TGP (ALT). Alanina aminotransferase, enzima hepatocelular.",
    female_context: "A prevalência de gordura no fígado (esteatose hepática) sobe após a menopausa e na SOP. Elevação leve de TGP/ALT é frequentemente a primeira pista bioquímica. Estrogênios orais, gestação (HELLP) e álcool interagem com a interpretação.",
    low: "TGP/ALT baixa isolada raramente é clinicamente significativa.",
    high: "Elevação persistente merece avaliação metabólica e de hepatites virais.",
    evidence: "forte" },

  "AST": { measures: "TGO (AST). Aspartato aminotransferase, encontrada no fígado e no músculo.",
    female_context: "Razão TGO/TGP acima de 2 sugere lesão relacionada ao álcool. Ambas as enzimas sobem na gordura no fígado (esteatose hepática) e em lesão induzida por medicamentos. Lesão muscular pós-parto ou após exercício pode aumentar a TGO/AST desproporcionalmente.",
    low: "Raramente importante clinicamente sozinha.",
    high: "Interprete junto com TGP/ALT, Gama-GT e contexto clínico.",
    evidence: "forte" },

  "BHCG": { measures: "Gonadotrofina coriônica humana (beta-hCG), produzida pelo trofoblasto após a implantação.",
    female_context: "Beta-hCG seriado apoia a viabilidade da gestação inicial, a estratificação de risco de gravidez ectópica e a vigilância pós-molar. Elevações fora da gestação exigem avaliação em oncologia ginecológica.",
    low: "Indetectável fora da gestação. Em gestação inicial, o padrão de duplicação importa mais do que um valor isolado.",
    high: "Crescendo adequadamente na gestação. Platô ou queda exige ultrassom obstétrico e exclusão de gestação ectópica ou perda gestacional.",
    evidence: "forte" },

  // ── Específicos reprodutivos ─────────────────────────────────────────────
  "CA-125": { measures: "Antígeno tumoral 125 (CA-125), glicoproteína produzida por células epiteliais. Elevado em endometriose, cistos ovarianos e alguns cânceres.",
    female_context: "CA-125 não é diagnóstico isolado para endometriose. Tem 50 a 60% de sensibilidade e costuma ser normal em doença leve. Entretanto, CA-125 acima de 35 U/mL em mulher com dor pélvica, dismenorreia ou dispareunia profunda é clinicamente relevante e merece investigação adicional. Também é acompanhado no seguimento do câncer de ovário. No climatério, degeneração de miomas e adenomiose podem elevá-lo.",
    low: "Abaixo de 35 U/mL: normal. Atenção: CA-125 normal não exclui endometriose.",
    high: "Acima de 35 U/mL: exige correlação clínica. Não específico, mas relevante em mulheres sintomáticas.",
    evidence: "moderada" },

  // ── Ossos e minerais ─────────────────────────────────────────────────────
  "CALCIUM": { measures: "Cálcio circulante total, crítico para densidade óssea, função nervosa e contração muscular.",
    female_context: "O metabolismo do cálcio depende do estrogênio. Conforme o estrogênio cai no climatério e na menopausa, a reabsorção óssea acelera, elevando levemente o cálcio sérico enquanto esgota os estoques esqueléticos. Sempre interprete com vitamina D e PTH. Hipocalcemia pode simular ansiedade e tetania.",
    low: "Abaixo de 8,8 mg/dL: hipocalcemia. Causa cãibras musculares, formigamento, ansiedade, sono ruim.",
    high: "Acima de 10,4 mg/dL: hipercalcemia. Verifique o paratormônio (PTH). Pode indicar hiperparatireoidismo primário.",
    evidence: "forte" },

  "ALP": { measures: "Fosfatase Alcalina (FA), enzima encontrada em osso, fígado e ductos biliares. Elevada com aumento de turnover ósseo ou doença hepática.",
    female_context: "A FA ósseo-específica é marcador de atividade osteoblástica. Sobe quando o osso está se reconstruindo após perda. FA elevada em mulher na menopausa sem doença hepática pode refletir turnover ósseo acelerado. Também elevada na gestação (FA placentária). Interprete com cálcio, vitamina D e enzimas hepáticas.",
    low: "Abaixo de 30 U/L: pode indicar deficiência de zinco ou hipotireoidismo.",
    high: "Acima de 120 U/L: investigue origem óssea ou hepática. No contexto da menopausa, o fracionamento ósseo-específico ajuda.",
    evidence: "moderada" },

  "PHOSPHORUS": { measures: "Fósforo inorgânico, fortemente acoplado ao cálcio no metabolismo ósseo e na produção de energia.",
    female_context: "Raramente alterado isoladamente, mas fósforo baixo com cálcio normal sugere perda renal de fosfato ou má absorção. Fósforo alto com cálcio alto aponta para hiperparatireoidismo. Relevante na avaliação da saúde óssea no climatério.",
    low: "Abaixo de 2,5 mg/dL: fraqueza, dor óssea, função prejudicada das hemácias.",
    high: "Acima de 4,7 mg/dL: pode indicar disfunção renal ou ingestão excessiva de lácteos e fósforo.",
    evidence: "moderada" },

  // ── Hematologia ──────────────────────────────────────────────────────────
  "HEMOGLOBIN": { measures: "Proteína transportadora de oxigênio nas hemácias. Principal marcador de anemia.",
    female_context: "A anemia ferropriva é a deficiência nutricional mais comum em mulheres no mundo, causada pela perda menstrual. Importante: sintomas de deficiência de ferro (fadiga, nevoeiro mental, queda de cabelo, intolerância ao exercício) aparecem quando a ferritina está baixa, mas a hemoglobina ainda está normal. A hemoglobina é um marcador tardio. A ferritina é o sinal de alerta precoce. Endometriose e miomas aumentam significativamente a perda sanguínea.",
    low: "Abaixo de 12 g/dL em mulheres: anemia. Abaixo de 8 g/dL: anemia grave que exige avaliação urgente.",
    high: "Acima de 16 g/dL: hemoconcentração, desidratação ou policitemia.",
    evidence: "forte" },

  "HAEMATOCRIT": { measures: "Porcentagem do volume sanguíneo ocupada pelas hemácias.",
    female_context: "Acompanha os achados da hemoglobina. Útil como verificação ao lado da hemoglobina. Hematócrito baixo com VCM normal sugere perda aguda recente. Hematócrito baixo com VCM baixo sugere deficiência de ferro crônica.",
    low: "Abaixo de 36% em mulheres: sugere anemia.",
    high: "Acima de 47%: hemoconcentração ou policitemia.",
    evidence: "forte" },

  "MCV": { measures: "Volume Corpuscular Médio (VCM), tamanho médio das hemácias.",
    female_context: "Hemácias pequenas (VCM baixo) apontam para deficiência de ferro ou talassemia. Hemácias grandes (VCM alto) apontam para deficiência de B12 ou folato. Os dois padrões são comuns em mulheres com menstruações intensas ou alimentação restritiva. VCM combinado com ferritina e B12 é mais informativo do que qualquer marcador isolado.",
    low: "Abaixo de 80 fL: anemia microcítica. Deficiência de ferro é a causa mais comum em mulheres.",
    high: "Acima de 100 fL: anemia macrocítica. Verifique B12, folato e tireoide.",
    evidence: "forte" },

  // ── Nutricionais (estendido) ─────────────────────────────────────────────
  "MAGNESIUM": { measures: "Mineral intracelular envolvido em mais de 300 reações enzimáticas, incluindo produção de energia e relaxamento muscular.",
    female_context: "Deficiência de magnésio é extremamente comum em mulheres, e frequentemente passa despercebida porque o magnésio sérico é indicador ruim dos estoques intracelulares (a maior parte do magnésio fica dentro das células). Reduzido por estresse, álcool, alta ingestão de açúcar e contraceptivos orais. Clinicamente relevante para intensidade da TPM, qualidade do sono, cãibras musculares, ansiedade, frequência de enxaqueca e resistência à insulina na SOP.",
    low: "Abaixo de 1,7 mg/dL: deficiência. Sintomas incluem cãibras musculares, sono ruim, ansiedade, constipação, piora da TPM.",
    high: "Acima de 2,7 mg/dL: rara, exceto em suplementação excessiva ou disfunção renal.",
    evidence: "moderada" },

  "ZINC": { measures: "Mineral traço essencial para função imunológica, reparo de DNA, síntese hormonal e ovulação.",
    female_context: "O zinco é necessário para sensibilidade do receptor de FSH e desenvolvimento folicular. A deficiência prejudica a conversão de hormônios tireoidianos e eleva o T3 reverso. Zinco baixo é comum em mulheres com dietas predominantemente vegetais (fitatos bloqueiam a absorção) e nas que usam contracepção hormonal. Importante para cicatrização, defesa imunológica e integridade da pele.",
    low: "Abaixo de 65 µg/dL: deficiência. Associada a queda de cabelo, imunidade prejudicada, cicatrização ruim, subfertilidade.",
    high: "Acima de 150 µg/dL: rara. Excesso de zinco inibe competitivamente a absorção de cobre.",
    evidence: "moderada" },

  "VITAMIN B6": { measures: "Piridoxina, envolvida na síntese de neurotransmissores, no metabolismo hormonal e na função imunológica.",
    female_context: "A B6 é cofator no metabolismo de estrogênio e progesterona e na síntese de serotonina e dopamina. A deficiência piora os sintomas de humor da TPM, a náusea na gestação e a depressão. Reduzida por contraceptivos orais (o uso de ACO pode reduzir a B6 pela metade). Importante no contexto da SOP e das mudanças de humor no climatério.",
    low: "Abaixo de 5 ng/mL: deficiência. Causa depressão, TPM, neuropatia periférica, imunidade prejudicada.",
    high: "Acima de 50 ng/mL por suplementação: risco de neuropatia periférica. Toxicidade da B6 é real em doses altas.",
    evidence: "moderada" },

  "HOMOCYSTEINE": { measures: "Aminoácido produzido durante o metabolismo da metionina. Níveis elevados danificam as paredes dos vasos sanguíneos.",
    female_context: "Homocisteína elevada é fator independente de risco cardiovascular que sobe na menopausa, conforme o estrogênio cai. Também associada a perda gestacional recorrente, defeitos do tubo neural e declínio cognitivo. Causada por B12, B6 e folato baixos, e por variantes do gene MTHFR. Normaliza com suplementação direcionada de vitaminas do complexo B. Frequentemente omitida em painéis de rotina.",
    low: "Abaixo de 7 µmol/L: ideal.",
    high: "Acima de 10 µmol/L: moderadamente elevada. Acima de 15 µmol/L: significativamente elevada. Verifique B12, folato, B6.",
    evidence: "forte" },

  "OMEGA-3 INDEX": { measures: "Porcentagem dos ácidos graxos ômega-3 EPA e DHA nas membranas das hemácias. Reflete a ingestão de longo prazo.",
    female_context: "Os ômega-3 anti-inflamatórios são diretamente relevantes para endometriose (inflamação das lesões), SOP (sensibilidade à insulina), climatério (humor, cardiovascular) e desfechos gestacionais. Índice abaixo de 4% associa-se a risco cardiovascular elevado. Acima de 8% é protetor. A maioria das dietas ocidentais fica entre 4 e 5%.",
    low: "Abaixo de 4%: risco cardiovascular e inflamatório alto.",
    high: "Acima de 8%: status anti-inflamatório ideal.",
    evidence: "moderada" },

  "SELENIUM": { measures: "Mineral traço essencial para ativação dos hormônios tireoidianos e defesa antioxidante.",
    female_context: "O selênio é necessário para converter T4 em T3 ativo. A deficiência prejudica a função tireoidiana e piora a autoimunidade de Hashimoto. A suplementação de selênio (200 µg/dia) reduz os títulos de anti-TPO em mulheres com Hashimoto. Também protetora contra tireoidite pós-parto. A depleção do solo torna a ingestão dietética pouco confiável em várias regiões.",
    low: "Abaixo de 80 µg/L: deficiência. Piora Hashimoto, prejudica a conversão tireoidiana.",
    high: "Acima de 200 µg/L: risco de selenose. Queda de cabelo, alterações nas unhas, hálito de alho.",
    evidence: "moderada" },
};

function lookupInterp(marker) {
  const key = marker.toUpperCase().replace(/\s*\(.*?\)\s*/g, "").trim();
  return INTERPRETATIONS[key] || INTERPRETATIONS[marker.toUpperCase()] || null;
}

function rangeStatus(m) {
  const v = parseFloat(String(m.value).replace(",", "."));
  const rr = String(m.reference_range || "");
  const parts = rr.match(/(-?\d+(?:[.,]\d+)?)\s*[–\-—to]+\s*(-?\d+(?:[.,]\d+)?)/);
  if (!parts) return { status: "within range", pct: null };
  const lo = parseFloat(parts[1].replace(",", "."));
  const hi = parseFloat(parts[2].replace(",", "."));
  if (isNaN(v) || isNaN(lo) || isNaN(hi)) return { status: "within range", pct: null };
  const pct = hi > lo ? Math.max(0, Math.min(1, (v - lo) / (hi - lo))) : null;
  if (v < lo) return { status: "below range", pct, lo, hi };
  if (v > hi) return { status: "above range", pct, lo, hi };
  const span = hi - lo;
  if (v < lo + span * 0.1) return { status: "low-normal", pct, lo, hi };
  if (v > hi - span * 0.1) return { status: "high-normal", pct, lo, hi };
  return { status: "within range", pct, lo, hi };
}

function buildFallbackSummary(tests) {
  const outOfRange = tests.filter((m) => {
    const s = rangeStatus(m).status;
    return s === "below range" || s === "above range";
  });
  const borderline = tests.filter((m) => {
    const s = rangeStatus(m).status;
    return s === "low-normal" || s === "high-normal";
  });
  const key = outOfRange.slice(0, 3).map((m) => `${m.marker} (${m.value} ${m.unit || ""})`.trim());
  const base = {
    headline: outOfRange.length
      ? `${outOfRange.length} marcador${outOfRange.length > 1 ? "es estão" : " está"} fora da faixa neste exame.`
      : "Nenhum marcador está claramente fora da faixa neste exame.",
    key_points: key.length ? key : ["A maior parte dos valores está dentro das faixas indicadas pelo laboratório."],
    discuss_with_gp: [
      "Revise as tendências em relação aos seus exames anteriores, não apenas este recorte isolado.",
      "Confirme se o momento da coleta (dia do ciclo, jejum, medicações) pode afetar a interpretação.",
      "Converse sobre seus sintomas junto com esses valores antes de mudar tratamento ou suplementos.",
    ],
    next_steps: borderline.length
      ? [`Repita os marcadores no limite: ${borderline.slice(0, 4).map((m) => m.marker).join(", ")}.`]
      : ["Repita os marcadores principais no intervalo clinicamente adequado se os sintomas persistirem."],
    reassurance:
      "Este resumo é educacional e deve apoiar, não substituir, a orientação clínica da sua médica ou especialista.",
  };
  const womenFocus = {
    headline: "Foco em saúde da mulher: priorize os sinais hormonais, tireoidianos, de ferro e metabólicos deste exame.",
    key_points: [
      "Olhe primeiro para os marcadores do ciclo e reprodutivos (LH, FSH, estradiol, progesterona, HAM) quando disponíveis.",
      "Marcadores tireoidianos (TSH, T4 e T3 livres, anticorpos) podem afetar qualidade do ciclo, fertilidade e energia.",
      "Ferritina, ferro, B12 e folato costumam explicar fadiga, queda de cabelo e sintomas cognitivos em mulheres.",
      "Glicose, insulina e lipídios podem revelar sobrecarga metabólica precoce, inclusive padrões relevantes para SOP e climatério.",
    ],
    discuss_with_gp: base.discuss_with_gp,
    next_steps: base.next_steps,
    reassurance: base.reassurance,
  };
  return { full_summary: base, women_focus_summary: womenFocus };
}

function isWomensPriorityTest(name) {
  const n = String(name || "").toUpperCase();
  return [
    /\bLH\b/,
    /\bFSH\b/,
    /\bAMH\b/,
    /ESTRADIOL|OESTRADIOL|E2/,
    /PROGESTERONE/,
    /TESTOSTERONE|SHBG|DHEA|PROLACTIN/,
    /TSH|FREE\s*T4|FREE\s*T3|ANTI-?TPO|ANTI-?TG/,
    /FERRITIN|IRON|HEMOGLOBIN|HAEMOGLOBIN|B12|FOLATE|VITAMIN D/,
    /GLUCOSE|HBA1C|INSULIN|HOMA|TRIGLYCERIDES|HDL|LDL/,
  ].some((rx) => rx.test(n));
}

// ---------- Paywall helpers ----------
function decodeMonthKey() {
  const now = new Date();
  return `fd:decodes:${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

// ---------- UpgradeModal ----------
function UpgradeModal({ onClose }) {
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState("");

  const upgrade = async (plan = "monthly") => {
    setLoading(true);
    setErr("");
    try {
      const r = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Checkout failed");
      window.location.href = data.url;
    } catch (e) {
      setErr(e.message);
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "1rem",
    }}>
      <div style={{
        background: "#fff", borderRadius: "1.25rem", maxWidth: "440px", width: "100%",
        padding: "2rem 2rem 1.75rem", boxShadow: "0 24px 60px rgba(0,0,0,0.18)",
        position: "relative",
      }}>
        {/* close */}
        <button onClick={onClose} style={{
          position: "absolute", top: "1rem", right: "1rem",
          background: "none", border: "none", cursor: "pointer",
          fontSize: "1.25rem", color: "#999", lineHeight: 1,
        }}>✕</button>

        {/* crown */}
        <div style={{ fontSize: "2.25rem", textAlign: "center", marginBottom: "0.5rem" }}>👑</div>

        <h2 style={{
          margin: "0 0 0.35rem", textAlign: "center",
          fontFamily: "Playfair Display, serif", fontSize: "1.35rem",
          color: "#8B1A4A",
        }}>Você já usou sua decifração gratuita deste mês</h2>

        <p style={{ textAlign: "center", color: "#666", fontSize: "0.875rem", marginBottom: "1.25rem" }}>
          Assine o Decifra Pro para ter decifrações ilimitadas todos os meses.
        </p>

        <ul style={{ listStyle: "none", padding: 0, margin: "0 0 1.5rem", fontSize: "0.875rem", color: "#444" }}>
          {[
            "Decifrações ilimitadas todos os meses",
            "Contexto feminino para cada marcador",
            "Download em PDF e JSON após cada decifração",
            "Suporte prioritário",
          ].map((b) => (
            <li key={b} style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start", marginBottom: "0.5rem" }}>
              <span style={{ marginTop: "2px", flexShrink: 0 }}><IcCheck size={13} color="#8B1A4A"/></span>
              <span>{b}</span>
            </li>
          ))}
        </ul>

        {err && (
          <p style={{ color: "#c0392b", fontSize: "0.8rem", marginBottom: "0.75rem", textAlign: "center" }}>{err}</p>
        )}

        <button
          onClick={() => upgrade("monthly")}
          disabled={loading}
          style={{
            display: "block", width: "100%", padding: "0.85rem",
            background: loading ? "#c9a0b9" : "#8B1A4A",
            color: "#fff", border: "none", borderRadius: "0.75rem",
            fontSize: "1rem", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
            marginBottom: "0.6rem", transition: "background 0.2s",
          }}
        >
          {loading ? "Redirecionando ao Stripe…" : "Assinar Pro · R$ 29,90/mês"}
        </button>

        <button
          onClick={() => upgrade("annual")}
          disabled={loading}
          style={{
            display: "block", width: "100%", padding: "0.75rem",
            background: "#f8f1f5", color: "#8B1A4A",
            border: "1.5px solid #e4a5c7", borderRadius: "0.75rem",
            fontSize: "0.9rem", fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
            marginBottom: "1rem",
          }}
        >
          Plano anual · R$ 249/ano (economize R$ 109,80)
        </button>

        <button
          onClick={onClose}
          style={{
            display: "block", width: "100%", background: "none", border: "none",
            color: "#999", fontSize: "0.8rem", cursor: "pointer", textDecoration: "underline",
          }}
        >
          Volte no mês que vem (a cota gratuita reseta automaticamente)
        </button>
      </div>
    </div>
  );
}

// ---------- ProToast ----------
function ProToast({ onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 4000);
    return () => clearTimeout(t);
  }, []);
  return (
    <div style={{
      position: "fixed", bottom: "1.5rem", left: "50%", transform: "translateX(-50%)",
      background: "#8B1A4A", color: "#fff", borderRadius: "0.75rem",
      padding: "0.85rem 1.5rem", fontSize: "0.9rem", fontWeight: 600,
      boxShadow: "0 8px 24px rgba(0,0,0,0.2)", zIndex: 9998,
      display: "flex", alignItems: "center", gap: "0.6rem",
    }}>
      <span>🎉</span>
      <span>Pro liberado! Decifrações ilimitadas ativadas.</span>
    </div>
  );
}

// ---------- Toast ----------
const ToastContext = createContext({ show: () => {}, dismiss: () => {} });
const useToast = () => useContext(ToastContext);

function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef({});

  const dismiss = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
    if (timersRef.current[id]) {
      clearTimeout(timersRef.current[id]);
      delete timersRef.current[id];
    }
  }, []);

  const show = useCallback((message, opts = {}) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const variant = opts.variant || "default";
    const duration = opts.duration ?? 3500;
    setToasts((t) => [...t, { id, message, variant }]);
    timersRef.current[id] = setTimeout(() => dismiss(id), duration);
    return id;
  }, [dismiss]);

  useEffect(() => () => {
    Object.values(timersRef.current).forEach(clearTimeout);
  }, []);

  return (
    <ToastContext.Provider value={{ show, dismiss }}>
      {children}
      <div className="toast-viewport" aria-live="polite" aria-atomic="false">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.variant}`} role="status">
            <span className="toast-icon" aria-hidden="true">
              {t.variant === "success"
                ? <IcCheck size={14} color="currentColor"/>
                : t.variant === "error"
                  ? <span style={{ fontWeight: 700 }}>!</span>
                  : <span className="toast-dot"/>}
            </span>
            <span className="toast-message">{t.message}</span>
            <button
              className="toast-close"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss notification"
            >×</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ---------- App ----------
function App() {
  // Always land on home — never restore a previous route on fresh load
  const [route, setRoute] = useState("home");
  const [userEmail, setUserEmail] = useState(() => localStorage.getItem("fd:email") || "");
  const [reportText, setReportText] = useState("");
  const [reportName, setReportName] = useState("Lab Report 2026-04-11");
  const [extracted, setExtracted] = useState([]);
  const [notFound, setNotFound] = useState([]);
  const [confirmed, setConfirmed] = useState([]);
  // stages: idle | scanning | preview | done | error
  // "preview" = extraction done, showing partial results + unlock gate
  const [decodeStage, setDecodeStage] = useState("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [tweaks, setTweaks] = useState(TWEAK_DEFAULTS);
  const [showProToast, setShowProToast] = useState(false);
  const [supabasePro, setSupabasePro] = useState(false);
  const [testMode, setTestMode] = useState(() => localStorage.getItem("fd:test_mode") === "1");
  const [userContext, setUserContext] = useState(() => {
    try {
      const raw = localStorage.getItem("fd:context");
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });
  const saveUserContext = (ctx) => {
    setUserContext(ctx);
    try { localStorage.setItem("fd:context", JSON.stringify(ctx)); } catch {}
    // Cross-device sync — fire-and-forget when user has email
    if (userEmail) sbSaveContext(userEmail, ctx);
  };

  const resetReportSession = () => {
    setReportText("");
    setReportName("Lab Report 2026-04-11");
    setExtracted([]);
    setNotFound([]);
    setConfirmed([]);
    setErrorMsg("");
    setDecodeStage("idle");
  };
  useEffect(() => {
    // route is intentionally not persisted — app always opens on home
  }, [route]);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("route") === "decode") setRoute("decode");
    if (params.get("test") === "1") {
      localStorage.setItem("fd:test_mode", "1");
      setTestMode(true);
    } else if (params.get("test") === "0") {
      localStorage.removeItem("fd:test_mode");
      setTestMode(false);
    }
  }, []);
  useEffect(() => {
    // If QA mode is enabled while user is already on preview, unlock immediately.
    if (testMode && decodeStage === "preview") {
      setDecodeStage("done");
    }
  }, [testMode, decodeStage]);
  useEffect(() => { ensureFont(tweaks.serif); applyTweaks(tweaks); }, [tweaks]);

  // Cross-device sync: fetch Supabase tier + context whenever email is known
  useEffect(() => {
    if (!userEmail) return;
    sbGetUser(userEmail).then((data) => {
      if (!data) return;
      const nowSec = Math.floor(Date.now() / 1000);
      const expiresAt = data.pro_expires_at
        ? Math.floor(new Date(data.pro_expires_at).getTime() / 1000)
        : null;
      const isDbPro = data.tier === "pro" && (!expiresAt || expiresAt > nowSec);
      setSupabasePro(isDbPro);

      // Hydrate user context from Supabase when local copy is empty
      // (so signing in on a new device picks up the previously-saved context).
      if (data.context && !userContext) {
        setUserContext(data.context);
        try { localStorage.setItem("fd:context", JSON.stringify(data.context)); } catch {}
      }
    });
  }, [userEmail]);

  // Handle Stripe success redirect: ?payment=success&session_id=cs_xxx
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") !== "success") return;
    const sessionId = params.get("session_id");
    // Clean URL immediately so a refresh doesn't re-trigger
    window.history.replaceState({}, "", window.location.pathname);
    if (!sessionId) return;
    const knownEmail = localStorage.getItem("fd:email") || "";
    fetch("/api/verify-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId, email: knownEmail }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.tier === "pro") {
          setSupabasePro(true);
          setShowProToast(true);
          // If there are already extracted results waiting, unlock them
          // Otherwise go home
          setDecodeStage((prev) => prev === "preview" ? "done" : prev);
          setRoute((prev) => prev === "decode" ? "decode" : "home");
        }
      })
      .catch(() => {});
  }, []);

  // Sign-up handler — called from SignUp page
  const handleSignUp = async (email, plan) => {
    localStorage.setItem("fd:email", email);
    setUserEmail(email);

    // Check if they already have a Pro record in Supabase (returning Pro user on new device)
    const existingUser = await sbGetUser(email);
    const nowSec = Math.floor(Date.now() / 1000);
    const expiresAt = existingUser?.pro_expires_at
      ? Math.floor(new Date(existingUser.pro_expires_at).getTime() / 1000)
      : null;
    if (existingUser?.tier === "pro" && (!expiresAt || expiresAt > nowSec)) {
      setSupabasePro(true);
      setShowProToast(true);
      setRoute("home");
      return;
    }

    if (plan === "free") {
      // Upsert free user (non-blocking)
      sbUpsertUser(email, { tier: "free" });
      // Only go to decode if results are already waiting, otherwise home
      setRoute((prev) => prev === "decode" ? "decode" : "home");
      return;
    }

    // Pro → upsert with pending tier, then redirect to Stripe
    sbUpsertUser(email, { tier: "free" }); // will be upgraded to pro after payment
    try {
      const r = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, plan: plan === "annual" ? "annual" : "monthly" }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Checkout failed");
      window.location.href = data.url;
    } catch {
      setRoute("home"); // fallback — land on home, can upgrade later
    }
  };

  // Sign out
  const handleSignOut = () => {
    ["fd:email", "fd:route"].forEach((k) => localStorage.removeItem(k));
    setUserEmail("");
    setSupabasePro(false);
    setDecodeStage("idle");
    setRoute("home");
  };

  const go = (r) => setRoute(r);

  const startDecode = async (payload, name) => {
    // Accept legacy string payload (text only) or new object payload { text, images }.
    const input = typeof payload === "string" ? { text: payload, images: [] } : (payload || { text: "", images: [] });
    const text = input.text || "";
    const images = Array.isArray(input.images) ? input.images : [];
    setReportText(text);
    setReportName(name || reportName);
    setRoute("decode");
    setErrorMsg("");
    if (!text && images.length === 0) {
      setDecodeStage("error");
      setErrorMsg("Envie um arquivo, foto do laudo, ou cole o texto do exame.");
      return;
    }
    if (text && text.length > MAX_EXTRACT_CHARS) {
      setDecodeStage("error");
      setErrorMsg(
        `O laudo está longo demais (${text.length.toLocaleString()} caracteres). O limite é ${MAX_EXTRACT_CHARS.toLocaleString()}. Tente um painel laboratorial por vez, ou cole apenas o bloco de resultados.`
      );
      return;
    }
    setDecodeStage("scanning");
    try {
      let out;
      try {
        out = await extractWithClaude(text, images);
      } catch (e) {
        console.warn("[Decifra] Falha na extração via Claude, voltando para regex:", e.message);
        // Regex fallback only works on text; image-only inputs surface the error.
        out = text ? regexExtract(text) : { results: [], not_found_markers: [] };
        if (!text) {
          setDecodeStage("error");
          setErrorMsg("Não foi possível ler a(s) foto(s) do laudo. Tente novamente com uma imagem mais nítida, ou cole o texto manualmente.");
          return;
        }
      }
      const results = (out.results || []).map((r) => ({
        marker: String(r.marker || "").trim(),
        value: String(r.value ?? "").trim(),
        unit: String(r.unit || "").trim(),
        reference_range: String(r.reference_range || "").trim(),
        confidence: r.confidence || "medium",
        source_snippet: String(r.source_snippet || "").trim(),
        female_context: String(r.female_context || "").trim(),
        status: r.status || "",
        panel: r.panel || "",
      })).filter((r) => r.marker && r.value);
      setExtracted(results);
      setNotFound(out.not_found_markers || []);
      setConfirmed(results.map((r) => ({ ...r, included: true })));

      // ── Access decision (happens AFTER value is shown) ────────
      const isProNow = supabasePro || testMode;
      const monthKey  = decodeMonthKey();
      const usedCount = parseInt(localStorage.getItem(monthKey) || "0", 10);
      const hasEmail  = !!localStorage.getItem("fd:email");

      if (BETA_FREE_MODE || isProNow || usedCount < 1) {
        // Full access — beta mode bypasses paywall, otherwise first decode always free
        if (!isProNow && !BETA_FREE_MODE) localStorage.setItem(monthKey, String(usedCount + 1));
        setDecodeStage("done");
      } else {
        // Show preview + unlock gate — paywall at the moment of realized value
        setDecodeStage("preview");
      }
    } catch (err) {
      setErrorMsg(String(err?.message || err));
      setDecodeStage("error");
    }
  };

  // Unlock handler — called from PreviewGate when user signs up / upgrades
  const handleUnlock = async (email, plan) => {
    localStorage.setItem("fd:email", email);
    setUserEmail(email);

    // Check Supabase first — returning Pro user on a new device
    const existing = await sbGetUser(email);
    const nowSec   = Math.floor(Date.now() / 1000);
    const dbExpiry = existing?.pro_expires_at
      ? Math.floor(new Date(existing.pro_expires_at).getTime() / 1000) : null;
    if (existing?.tier === "pro" && (!dbExpiry || dbExpiry > nowSec)) {
      setSupabasePro(true);
      setShowProToast(true);
      setDecodeStage("done");
      return;
    }

    if (plan === "free") {
      sbUpsertUser(email, { tier: "free" });
      const monthKey = decodeMonthKey();
      localStorage.setItem(monthKey, "1");
      setDecodeStage("done");
      return;
    }

    // Pro → Stripe Checkout
    sbUpsertUser(email, { tier: "free" }); // upgraded to pro server-side after payment
    try {
      const r = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, plan: plan === "annual" ? "annual" : "monthly" }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Checkout failed");
      window.location.href = data.url;
    } catch {
      // Stripe failed — give free access so user isn't stranded
      const monthKey = decodeMonthKey();
      localStorage.setItem(monthKey, "1");
      setDecodeStage("done");
    }
  };

  // Pro if: valid JWT in localStorage (just paid this device)
  //      OR Supabase confirms pro + not expired (cross-device)
  const isPro = supabasePro || testMode;

  return (
    <div className="app">
      {showProToast && <ProToast onDone={() => setShowProToast(false)} />}
      {testMode && (
        <div style={{ margin: "12px auto 0", maxWidth: "1200px", padding: "10px 14px", border: "1px solid #EAD9B5", borderRadius: 10, background: "#FBF4E4", color: "#5A3A00", fontSize: 13 }}>
          Test mode is ON: paywall is bypassed for local QA. Add <code>?test=0</code> to URL to disable.
        </div>
      )}
      {route === "signup"
        ? <SignUp onSignUp={handleSignUp} onBack={() => go("home")} onPrivacy={() => go("privacy")} />
        : <>
            <TopBar route={route} go={go} userEmail={userEmail} isPro={isPro} onSignOut={handleSignOut} onSignUp={() => go("signup")} />
            <main className="main" id="main-content" tabIndex={-1}>
              {route === "home" && <Home go={go} onUseSample={() => startDecode(SAMPLE_REPORT, "Exame laboratorial exemplo 2026-04-11")} />}
              {route === "decode" && (
                <Decode
                  stage={decodeStage}
                  errorMsg={errorMsg}
                  extracted={extracted}
                  reportText={reportText}
                  onStart={startDecode}
                  onReview={() => setRoute("review")}
                  onRetry={() => { resetReportSession(); setRoute("decode"); }}
                  onUnlock={handleUnlock}
                  userEmail={userEmail}
                  limitHit={!isPro && !!userEmail && parseInt(localStorage.getItem(decodeMonthKey()) || "0", 10) >= 1}
                />
              )}
              {route === "review" && (
                <Review
                  reportName={reportName}
                  setReportName={setReportName}
                  confirmed={confirmed}
                  setConfirmed={setConfirmed}
                  onConfirm={() => setRoute("context")}
                  onBack={() => setRoute("decode")}
                />
              )}
              {route === "context" && (
                <Context
                  initial={userContext}
                  onSave={(ctx) => { saveUserContext(ctx); setRoute("results"); }}
                  onSkip={() => setRoute("results")}
                  onBack={() => setRoute("review")}
                />
              )}
              {route === "results" && (
                <Results
                  reportName={reportName}
                  confirmed={confirmed.filter((m) => m.included)}
                  notFound={notFound}
                  userContext={userContext}
                  onDecodeAnother={() => { resetReportSession(); setRoute("decode"); }}
                />
              )}
              {route === "markers" && <MarkersPage />}
              {route === "science" && <SciencePage />}
              {route === "mobile" && <MobilePage />}
              {route === "privacy" && <PrivacyPage go={go} />}
            </main>
            <Footer go={go} />
            <Tweaks tweaks={tweaks} setTweaks={setTweaks} />
          </>
      }
    </div>
  );
}

// ---------- Top bar ----------
function TopBar({ route, go, userEmail, isPro, onSignOut, onSignUp }) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [acctOpen, setAcctOpen] = React.useState(false);
  const acctRef = React.useRef(null);
  const items = [
    { id: "home", label: "Início" },
    { id: "decode", label: "Decifrar" },
    { id: "results", label: "Resultados" },
    { id: "markers", label: "Marcadores" },
    { id: "science", label: "Ciência" },
    { id: "mobile", label: "Mobile" },
  ];
  const initial = userEmail ? userEmail[0].toUpperCase() : "?";
  const goAndClose = (id) => { go(id); setMenuOpen(false); };

  // Close account dropdown on outside click
  React.useEffect(() => {
    if (!acctOpen) return;
    const handler = (e) => { if (acctRef.current && !acctRef.current.contains(e.target)) setAcctOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [acctOpen]);

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div className="brand-wrap">
          <button className="brand brand-wordmark" onClick={() => go("home")} aria-label="Página inicial Decifra">
            <span className="brand-name">Decifra</span>
          </button>
          <a
            className="beta-badge beta-badge-link"
            href={feedbackMailto("Topo da navegação")}
            aria-label="Enviar feedback da beta"
            title="Enviar feedback da beta"
          >
            Beta
          </a>
          {BETA_FREE_MODE && (
            <span className="free-badge" title="Todos os recursos são gratuitos durante a beta">Grátis</span>
          )}
        </div>
        <nav className="nav" aria-label="Navegação principal">
          {items.map((it) => (
            <button
              key={it.id}
              type="button"
              className={`nav-item ${route === it.id ? "active" : ""}`}
              onClick={() => go(it.id)}
              aria-current={route === it.id ? "page" : undefined}
            >
              {it.label}
            </button>
          ))}
        </nav>
        <button className="hamburger" onClick={() => setMenuOpen(!menuOpen)} aria-label="Abrir menu" aria-expanded={menuOpen}>
          <span/><span/><span/>
        </button>
        {menuOpen && (
          <div className="mobile-menu">
            {items.map((it) => (
              <button key={it.id} className={`mobile-menu-item ${route === it.id ? "active" : ""}`} onClick={() => goAndClose(it.id)}>
                {it.label}
              </button>
            ))}
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          {!userEmail && (
            <button type="button" className="btn btn-primary btn-nav-cta" onClick={onSignUp}>
              Criar conta
            </button>
          )}
          {userEmail && (
            <div ref={acctRef} style={{ position: "relative" }}>
              <button
                onClick={() => setAcctOpen(v => !v)}
                style={{
                  width: "28px", height: "28px", borderRadius: "50%",
                  background: isPro ? "#8B1A4A" : "#f8f1f5",
                  border: "1.5px solid #e4a5c7",
                  color: isPro ? "#fff" : "#8B1A4A",
                  fontWeight: 700, fontSize: "0.75rem",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                }}
                aria-label="Menu da conta"
              >{initial}</button>
              {acctOpen && (
                <div style={{
                  position: "absolute", right: 0, top: "calc(100% + 8px)",
                  background: "#fff", border: "1px solid #e8ddd6",
                  borderRadius: "0.75rem", boxShadow: "0 4px 20px rgba(0,0,0,0.10)",
                  minWidth: "220px", zIndex: 200, overflow: "hidden",
                }}>
                  <div style={{ padding: "0.85rem 1rem", borderBottom: "1px solid #f0e8e0" }}>
                    <div style={{ fontSize: "0.7rem", color: "#aaa", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "2px" }}>Conectada como</div>
                    <div style={{ fontSize: "0.82rem", color: "#333", fontWeight: 500, wordBreak: "break-all" }}>{userEmail}</div>
                    <div style={{ marginTop: "4px" }}>
                      <span style={{
                        background: isPro ? "#8B1A4A" : "#f0e8e0",
                        color: isPro ? "#fff" : "#8B1A4A",
                        fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.08em",
                        textTransform: "uppercase", padding: "0.15rem 0.5rem",
                        borderRadius: "999px",
                      }}>{isPro ? "Pro" : "Grátis"}</span>
                    </div>
                  </div>
                  {!isPro && (
                    <button onClick={() => { setAcctOpen(false); onSignUp(); }} style={{
                      width: "100%", padding: "0.7rem 1rem", background: "none",
                      border: "none", borderBottom: "1px solid #f0e8e0",
                      textAlign: "left", fontSize: "0.82rem", color: "#8B1A4A",
                      fontWeight: 600, cursor: "pointer",
                    }}>Assinar plano Pro</button>
                  )}
                  <button onClick={() => { setAcctOpen(false); onSignOut(); }} style={{
                    width: "100%", padding: "0.7rem 1rem", background: "none",
                    border: "none", textAlign: "left", fontSize: "0.82rem",
                    color: "#888", cursor: "pointer",
                  }}>Sair</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

// ── Logo components ─────────────────────────────────────────────────────────
// Shared arc-path helper (works inside any component scope)
function _logoArc(cx, cy, outerR, innerR, startDeg, endDeg, fill, ink, sw) {
  const pt = (r, d) => {
    const rad = (d - 90) * Math.PI / 180;
    return [+(cx + r * Math.cos(rad)).toFixed(2), +(cy + r * Math.sin(rad)).toFixed(2)];
  };
  const [ox1,oy1]=pt(outerR,startDeg), [ox2,oy2]=pt(outerR,endDeg);
  const [ix1,iy1]=pt(innerR,startDeg), [ix2,iy2]=pt(innerR,endDeg);
  const lg = (endDeg - startDeg) > 180 ? 1 : 0;
  const d = `M${ox1},${oy1}A${outerR},${outerR},0,${lg},1,${ox2},${oy2}L${ix2},${iy2}A${innerR},${innerR},0,${lg},0,${ix1},${iy1}Z`;
  return <path d={d} fill={fill} stroke={ink} strokeWidth={sw} strokeLinejoin="round"/>;
}

// Module-level cache so the canvas processing runs only once per session
// ── Icon system ─────────────────────────────────────────────────────────────
function IcArrowRight({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0 }}>
      <path d="M3 8h10M9.5 4.5L13 8l-3.5 3.5" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function IcArrowLeft({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0 }}>
      <path d="M13 8H3M6.5 4.5L3 8l3.5 3.5" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function IcChevronDown({ size = 18, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" aria-hidden="true" style={{ display: "block", flexShrink: 0 }}>
      <path d="M4.5 7l4.5 4.5L13.5 7" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function IcChevronUp({ size = 18, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" aria-hidden="true" style={{ display: "block", flexShrink: 0 }}>
      <path d="M4.5 11L9 6.5 13.5 11" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function IcChevronRight({ size = 14, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden="true" style={{ display: "inline-block", verticalAlign: "middle" }}>
      <path d="M5 3l4 4-4 4" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function IcCheck({ size = 14, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden="true" style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0 }}>
      <path d="M2 7.5l3.5 3.5 6.5-7" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function IcCheckCircle({ size = 64, color = "#8B1A4A" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <circle cx="32" cy="32" r="30" stroke={color} strokeWidth="1.5" opacity=".12"/>
      <circle cx="32" cy="32" r="22" fill={color} fillOpacity=".08"/>
      <path d="M20 32l9 9 15-16" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function IcDot({ size = 12, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" aria-hidden="true" style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0 }}>
      <circle cx="6" cy="6" r="2.5" fill={color} opacity=".45"/>
    </svg>
  );
}
function IcLock({ size = 24, color = "#8B1A4A" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="11" width="14" height="10.5" rx="2.5" stroke={color} strokeWidth="1.5"/>
      <path d="M8 11V7.5a4 4 0 018 0V11" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="12" cy="16.5" r="1.5" fill={color}/>
    </svg>
  );
}
function IcLab({ size = 36, color = "#8B1A4A" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <circle cx="18" cy="18" r="16" fill={color} fillOpacity=".09"/>
      <path d="M12 13h12M12 18h8M12 23h10" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}
// ── Phase panel icons ────────────────────────────────────────────────────────
function IcPhaseFertile({ size = 28, color = "#8B1A4A" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <circle cx="14" cy="14" r="3.5" stroke={color} strokeWidth="1.4"/>
      <path d="M14 4v4M14 20v4M4 14h4M20 14h4" stroke={color} strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M7.05 7.05l2.83 2.83M18.12 18.12l2.83 2.83M7.05 20.95l2.83-2.83M18.12 9.88l2.83-2.83" stroke={color} strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}
function IcPhasePcos({ size = 28, color = "#6B2E6B" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <circle cx="14" cy="13" r="8" stroke={color} strokeWidth="1.4"/>
      <circle cx="10" cy="11" r="1.6" stroke={color} strokeWidth="1.1"/>
      <circle cx="18" cy="11" r="1.6" stroke={color} strokeWidth="1.1"/>
      <circle cx="14" cy="16" r="1.6" stroke={color} strokeWidth="1.1"/>
      <path d="M14 21v4M12 23h4" stroke={color} strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}
function IcPhaseEndo({ size = 28, color = "#B0552B" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <path d="M14 4c-3 3.5-5.5 7-5.5 10.5a5.5 5.5 0 0011 0C19.5 11 17 7.5 14 4z" stroke={color} strokeWidth="1.4" strokeLinejoin="round"/>
      <path d="M10.5 16.5a4.5 4.5 0 007 0" stroke={color} strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M14 20v4M11 24h6" stroke={color} strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}
function IcPhaseFertility({ size = 28, color = "#2E5D4F" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <circle cx="14" cy="14" r="7" stroke={color} strokeWidth="1.4"/>
      <circle cx="14" cy="14" r="2.8" fill={color} fillOpacity=".18" stroke={color} strokeWidth="1.2"/>
      <path d="M14 4v3M14 21v3M4 14h3M21 14h3" stroke={color} strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}
function IcPhasePeri({ size = 28, color = "#1F3A5F" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <path d="M3 14c1.5-5 4.5-9 8-9s6 4 6 9-2.5 9-6 9" stroke={color} strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M17 14c0-5 2.5-9 5-9" stroke={color} strokeWidth="1.4" strokeLinecap="round" opacity=".35"/>
    </svg>
  );
}
function IcPhaseMeno({ size = 28, color = "#4A1A4A" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <path d="M22 7a10 10 0 11-10 18" stroke={color} strokeWidth="1.4" strokeLinecap="round"/>
      <circle cx="8" cy="9" r="1.3" fill={color}/>
      <circle cx="5" cy="14" r="1" fill={color} fillOpacity=".55"/>
      <circle cx="8" cy="19" r="1" fill={color} fillOpacity=".55"/>
      <circle cx="12" cy="22.5" r="0.9" fill={color} fillOpacity=".35"/>
    </svg>
  );
}
function IcFlag({ size = 13, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 13 13" fill="none" aria-hidden="true" style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0 }}>
      <path d="M2.5 11.5V1.5" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M2.5 1.5h7l-2 3 2 3H2.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

const PANEL_ICONS = {
  fertile:   IcPhaseFertile,
  pcos:      IcPhasePcos,
  endo:      IcPhaseEndo,
  fertility: IcPhaseFertility,
  peri:      IcPhasePeri,
  meno:      IcPhaseMeno,
};

// ---------- PreviewGate — combined sign-up + paywall at moment of realized value ----------
function PreviewGate({ extracted, onUnlock, prefillEmail, limitHit }) {
  const [email, setEmail]     = React.useState(prefillEmail || "");
  const [plan, setPlan]       = React.useState("monthly");
  const [loading, setLoading] = React.useState(false);
  const [err, setErr]         = React.useState("");
  const [mode, setMode]       = React.useState("signup"); // "signup" | "signin"
  const [consent, setConsent] = React.useState(false);

  const PREVIEW_COUNT = 2; // lab tests shown freely
  const lockedCount   = Math.max(0, extracted.length - PREVIEW_COUNT);
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const submit = async () => {
    if (!valid) { setErr("Informe um e-mail válido para continuar."); return; }
    if (mode === "signup" && !consent) { setErr("Concorde com a Política de Privacidade para continuar."); return; }
    setLoading(true);
    setErr("");
    await onUnlock(email, mode === "signin" ? "free" : plan);
    setLoading(false);
  };

  // plans shown. If limit already hit, free plan is removed.
  const plans = [
    ...(!limitHit ? [{
      id: "free", label: "Grátis", price: "R$ 0", cycle: "/ mês",
      note: "1 decifração por mês",
      cta: "Liberar laudo grátis",
    }] : []),
    { id: "monthly", label: "Pro", price: "R$ 29,90", cycle: "/ mês",
      note: "Decifrações ilimitadas · todos os marcadores · prioridade",
      cta: "Liberar com Pro · R$ 29,90/mês", highlight: true },
    { id: "annual", label: "Pro Anual", price: "R$ 249", cycle: "/ ano",
      note: "Melhor custo. 2 meses grátis. Em até 12x no cartão.",
      cta: "Liberar com Pro · R$ 249/ano", badge: "Economize R$ 109" },
  ];

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9000,
      background: "rgba(247,243,236,0.92)", backdropFilter: "blur(12px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "1rem", overflowY: "auto",
    }}>
      <div style={{
        background: "#fff", borderRadius: "1.5rem", maxWidth: "480px", width: "100%",
        padding: "2rem 2rem 1.75rem",
        boxShadow: "0 32px 80px rgba(139,26,74,0.14), 0 2px 8px rgba(0,0,0,0.06)",
      }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <h2 style={{
            fontFamily: "Playfair Display, serif", fontSize: "1.3rem",
            color: "#1a0a10", margin: "0 0 0.5rem", lineHeight: 1.3,
          }}>
            {limitHit
              ? "Você já usou sua decifração gratuita deste mês"
              : "Libere a interpretação completa do seu laudo"}
          </h2>
          <p style={{ color: "#777", fontSize: "0.85rem", margin: 0, lineHeight: 1.5 }}>
            {limitHit
              ? `Assine o Pro para decifrações ilimitadas, ou volte no mês que vem.`
              : `Seu laudo tem ${extracted.length} marcadores. Encontramos ${lockedCount > 0 ? `mais ${lockedCount}` : "os resultados"}. Salve seu laudo e veja tudo agora.`}
          </p>
        </div>

        {/* What's locked — teaser */}
        {lockedCount > 0 && (
          <div style={{
            background: "#fdf6f9", border: "1px solid #f0d9e6", borderRadius: "0.75rem",
            padding: "0.85rem 1rem", marginBottom: "1.25rem",
            display: "flex", alignItems: "center", gap: "0.75rem",
          }}>
            <IcLock size={22} color="#8B1A4A"/>
            <div>
              <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "#8B1A4A" }}>
                {lockedCount} marcador{lockedCount !== 1 ? "es" : ""} + contexto feminino bloqueado{lockedCount !== 1 ? "s" : ""}
              </div>
              <div style={{ fontSize: "0.78rem", color: "#999", marginTop: "0.1rem" }}>
                {extracted.slice(PREVIEW_COUNT).map(m => m.marker).slice(0, 4).join(" · ")}
                {lockedCount > 4 ? ` · +${lockedCount - 4} mais` : ""}
              </div>
            </div>
          </div>
        )}

        {/* Mode toggle tabs */}
        <div style={{ display: "flex", borderRadius: "0.6rem", background: "#f5eff5", padding: "3px", marginBottom: "1.25rem", gap: "3px" }}>
          {[["signup", "Criar conta"], ["signin", "Entrar"]].map(([m, label]) => (
            <button key={m} onClick={() => { setMode(m); setErr(""); }} style={{
              flex: 1, padding: "0.45rem", border: "none", borderRadius: "0.45rem",
              background: mode === m ? "#fff" : "transparent",
              color: mode === m ? "#8B1A4A" : "#999",
              fontWeight: mode === m ? 700 : 500,
              fontSize: "0.8rem", cursor: "pointer",
              boxShadow: mode === m ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
              transition: "all 0.12s",
            }}>{label}</button>
          ))}
        </div>

        {/* Email */}
        {!prefillEmail && (
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#555", marginBottom: "0.35rem" }}>
              Seu e-mail
            </label>
            <input
              type="email" placeholder="voce@exemplo.com" value={email}
              onChange={(e) => { setEmail(e.target.value); setErr(""); }}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              style={{
                width: "100%", padding: "0.7rem 0.9rem", borderRadius: "0.55rem",
                border: "1.5px solid #d8cfc8", fontSize: "0.9rem",
                outline: "none", boxSizing: "border-box", background: "#fff",
              }}
            />
          </div>
        )}

        {/* Sign-in helper text */}
        {mode === "signin" && (
          <p style={{ fontSize: "0.8rem", color: "#888", marginBottom: "1rem", lineHeight: 1.5 }}>
            Use o e-mail com que você se cadastrou. Se você tem uma conta Pro, ela será restaurada automaticamente.
          </p>
        )}

        {err && <p style={{ color: "#c0392b", fontSize: "0.75rem", marginBottom: "0.75rem" }}>{err}</p>}

        {/* Plan pills — only shown when creating account */}
        {mode === "signup" && (
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
            {plans.map((p) => {
              const sel = plan === p.id;
              return (
                <div key={p.id} onClick={() => setPlan(p.id)} style={{
                  flex: "1 1 120px", borderRadius: "0.75rem", padding: "0.75rem",
                  border: sel ? "2px solid #8B1A4A" : "2px solid #ece5e0",
                  background: sel ? "#fdf6f9" : "#fff",
                  cursor: "pointer", position: "relative",
                  boxShadow: sel ? "0 2px 12px rgba(139,26,74,0.1)" : "none",
                  transition: "all 0.12s",
                }}>
                  {p.badge && (
                    <span style={{
                      position: "absolute", top: "-0.55rem", right: "0.5rem",
                      background: "#8B1A4A", color: "#fff",
                      fontSize: "0.6rem", fontWeight: 700, padding: "0.1rem 0.4rem",
                      borderRadius: "999px",
                    }}>{p.badge}</span>
                  )}
                  <div style={{ fontWeight: 700, fontSize: "0.8rem", color: sel ? "#8B1A4A" : "#333" }}>{p.label}</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "0.15rem", margin: "0.15rem 0" }}>
                    <span style={{ fontSize: "1.15rem", fontWeight: 800, color: "#8B1A4A" }}>{p.price}</span>
                    <span style={{ fontSize: "0.7rem", color: "#aaa" }}>{p.cycle}</span>
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "#888" }}>{p.note}</div>
                </div>
              );
            })}
          </div>
        )}

        {/* LGPD consent. Signup only. */}
        {mode === "signup" && (
          <label style={{ display: "flex", alignItems: "flex-start", gap: "8px", marginBottom: "1rem", cursor: "pointer" }}>
            <input type="checkbox" checked={consent} onChange={(e) => { setConsent(e.target.checked); setErr(""); }}
              style={{ marginTop: "3px", accentColor: "#8B1A4A", flexShrink: 0 }} />
            <span style={{ fontSize: "0.72rem", color: "#999", lineHeight: 1.5 }}>
              Concordo com a Política de Privacidade. A Decifra armazena apenas seu e-mail e o plano da assinatura. Nenhum dado de exame é guardado.
            </span>
          </label>
        )}

        {/* CTA */}
        <button onClick={submit} disabled={loading} style={{
          display: "block", width: "100%", padding: "0.85rem",
          background: loading ? "#c9a0b9" : "#8B1A4A",
          color: "#fff", border: "none", borderRadius: "0.75rem",
          fontSize: "1rem", fontWeight: 700,
          cursor: loading ? "not-allowed" : "pointer",
          marginBottom: "0.85rem",
        }}>
          {loading ? "Um instante…" : mode === "signin" ? "Entrar e liberar" : (plans.find(p => p.id === plan)?.cta || "Liberar laudo")}
        </button>

        {/* Trust row */}
        <div style={{
          display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap",
          fontSize: "0.7rem", color: "#bbb",
        }}>
          {["Não diagnostica", "Seus dados são seus", "Cancele quando quiser"].map(t => (
            <span key={t}>{t}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- ResultPreview — blurred results behind the gate ----------
function ResultPreview({ extracted, onUnlock, userEmail, limitHit }) {
  const PREVIEW_COUNT = 2;
  const visible = extracted.slice(0, PREVIEW_COUNT);
  const locked  = extracted.slice(PREVIEW_COUNT);

  return (
    <div style={{ position: "relative" }}>
      {/* Visible markers */}
      <div className="page complete" style={{ paddingBottom: 0 }}>
        <div className="card complete-card" style={{ maxWidth: "640px", margin: "0 auto" }}>
          <div className="eyebrow">Extração concluída · {extracted.length} marcador{extracted.length !== 1 ? "es" : ""} encontrado{extracted.length !== 1 ? "s" : ""}</div>
          <h1 className="h1" style={{ marginBottom: "0.5rem" }}>Seus resultados estão prontos</h1>
          <p className="sub" style={{ marginBottom: "1.5rem" }}>
            Mostrando {visible.length} de {extracted.length} marcadores. Libere para ver a interpretação feminina completa.
          </p>

          {/* Preview rows — visible */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "0.75rem" }}>
            {visible.map((m) => {
              const rs = rangeStatus(m);
              return (
                <div key={m.marker} style={{
                  display: "flex", alignItems: "center", gap: "0.75rem",
                  padding: "0.75rem 1rem", background: "#fdf6f9",
                  borderRadius: "0.6rem", border: "1px solid #f0d9e6",
                }}>
                  <div style={{ fontWeight: 700, fontSize: "0.9rem", flex: 1, color: "#1a0a10" }}>{m.marker}</div>
                  <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.85rem", color: "#444" }}>
                    {m.value}{m.unit ? ` ${m.unit}` : ""}
                  </div>
                  <StatusBadge status={rs.status} compact />
                </div>
              );
            })}
          </div>

          {/* Locked rows — blurred */}
          {locked.length > 0 && (
            <div style={{ position: "relative" }}>
              <div style={{
                display: "flex", flexDirection: "column", gap: "0.5rem",
                filter: "blur(5px)", userSelect: "none", pointerEvents: "none",
                opacity: 0.6,
              }}>
                {locked.slice(0, 3).map((m, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: "0.75rem",
                    padding: "0.75rem 1rem", background: "#f5f0ee",
                    borderRadius: "0.6rem", border: "1px solid #e8e0da",
                  }}>
                    <div style={{ fontWeight: 700, fontSize: "0.9rem", flex: 1 }}>{m.marker}</div>
                    <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.85rem" }}>
                      {m.value}{m.unit ? ` ${m.unit}` : ""}
                    </div>
                    <div style={{
                      padding: "0.2rem 0.6rem", borderRadius: "999px",
                      background: "#e8d5df", fontSize: "0.7rem", fontWeight: 700, color: "#8B1A4A",
                    }}>bloqueado</div>
                  </div>
                ))}
                {locked.length > 3 && (
                  <div style={{
                    textAlign: "center", fontSize: "0.8rem", color: "#aaa",
                    padding: "0.5rem",
                  }}>+ {locked.length - 3} marcadores</div>
                )}
              </div>
              {/* Fade overlay */}
              <div style={{
                position: "absolute", bottom: 0, left: 0, right: 0,
                height: "60px",
                background: "linear-gradient(to bottom, transparent, #fff)",
              }} />
            </div>
          )}
        </div>
      </div>

      {/* The gate overlay */}
      <PreviewGate
        extracted={extracted}
        onUnlock={onUnlock}
        prefillEmail={userEmail}
        limitHit={limitHit}
      />
    </div>
  );
}

// ---------- Sign Up ----------
function SignUp({ onSignUp, onBack, onPrivacy }) {
  const [email, setEmail] = React.useState("");
  const [plan, setPlan] = React.useState("monthly"); // "free" | "monthly" | "annual"
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState("");
  const [consent, setConsent] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [mode, setMode] = React.useState("signup"); // "signup" | "signin"
  const [signinEmail, setSigninEmail] = React.useState("");
  const [signinDone, setSigninDone] = React.useState(false);

  const handleSignIn = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signinEmail)) { setErr("Informe um e-mail válido."); return; }
    setLoading(true); setErr("");
    await onSignUp(signinEmail, "free");
    setLoading(false); setSigninDone(true);
  };

  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const submit = async () => {
    if (!valid) { setErr("Informe um e-mail válido."); return; }
    if (!consent) { setErr("Concorde com a Política de Privacidade para continuar."); return; }
    setLoading(true);
    setErr("");
    await onSignUp(email, plan);
    setLoading(false);
    if (plan === "free") setDone(true);
  };

  const plans = [
    {
      id: "free",
      label: "Grátis",
      price: "R$ 0",
      cycle: "para sempre",
      perks: ["1 decifração por mês", "Contexto feminino em cada marcador", "18 biomarcadores interpretados"],
      cta: "Começar grátis",
      highlight: false,
    },
    {
      id: "monthly",
      label: "Pro Mensal",
      price: "R$ 29,90",
      cycle: "/ mês",
      perks: ["Decifrações ilimitadas", "Contexto feminino em cada marcador", "Mais de 18 biomarcadores interpretados", "Download em PDF e JSON", "Suporte prioritário"],
      cta: "Assinar Pro · R$ 29,90/mês",
      highlight: true,
    },
    {
      id: "annual",
      label: "Pro Anual",
      price: "R$ 249",
      cycle: "/ ano",
      badge: "Economize R$ 109",
      perks: ["Tudo do Pro Mensal", "Em até 12x no cartão sem juros", "2 meses grátis vs. mensal", "Suporte prioritário"],
      cta: "Assinar Pro · R$ 249/ano",
      highlight: false,
    },
  ];

  if (mode === "signin") {
    return (
      <div style={{ minHeight: "100vh", background: "var(--c-paper, #F7F3EC)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem 1rem" }}>
        <h1 style={{ fontFamily: "Playfair Display, serif", fontSize: "1.5rem", color: "#1a0a10", marginBottom: "0.4rem" }}>Bem-vinda de volta</h1>
        <p style={{ fontSize: "0.9rem", color: "#666", marginBottom: "1.75rem", textAlign: "center", maxWidth: 360 }}>Use o e-mail com que você se cadastrou. Se você tem uma conta Pro, ela será restaurada automaticamente.</p>
        {signinDone
          ? <p style={{ fontSize: "0.95rem", color: "#8B1A4A", fontWeight: 600 }}>Você está conectada. Pode fechar e continuar.</p>
          : (
            <div style={{ width: "100%", maxWidth: "360px" }}>
              <input type="email" placeholder="voce@exemplo.com" value={signinEmail}
                onChange={(e) => { setSigninEmail(e.target.value); setErr(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
                style={{ width: "100%", padding: "0.75rem 1rem", borderRadius: "0.6rem", border: "1.5px solid #d8cfc8", fontSize: "0.95rem", outline: "none", boxSizing: "border-box", background: "#fff", marginBottom: "0.75rem" }}
              />
              {err && <p style={{ color: "#c0392b", fontSize: "0.78rem", marginBottom: "0.5rem" }}>{err}</p>}
              <button onClick={handleSignIn} disabled={loading}
                style={{ width: "100%", padding: "0.85rem", background: loading ? "#c9a0b9" : "#8B1A4A", color: "#fff", border: "none", borderRadius: "0.75rem", fontSize: "1rem", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer" }}>
                {loading ? "Verificando…" : "Continuar"}
              </button>
            </div>
          )}
        <button onClick={() => { setMode("signup"); setErr(""); }} style={{ marginTop: "1.25rem", background: "none", border: "none", color: "#aaa", fontSize: "0.78rem", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: "3px" }}>Criar uma nova conta</button>
        <button onClick={onBack} style={{ marginTop: "0.5rem", background: "none", border: "none", color: "#aaa", fontSize: "0.78rem", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: "3px" }}>Voltar para o início</button>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh", background: "var(--c-paper, #F7F3EC)",
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "2rem 1rem",
    }}>
      <div style={{ fontFamily: "Playfair Display, serif", fontSize: "2rem", color: "#1a0a10", fontWeight: 500, letterSpacing: "-0.02em", marginBottom: "0.4rem" }}>
        Decifra
      </div>

      <p style={{ fontSize: "0.72rem", color: "#aaa", marginBottom: "1.75rem", letterSpacing: "0.06em", textTransform: "uppercase" }}>
        Um produto da{" "}
        <a href="https://femhealth.science" target="_blank" rel="noopener noreferrer"
           style={{ color: "#8B1A4A", textDecoration: "none", fontWeight: 600 }}>
          FemHealth.Science
        </a>
      </p>

      <h1 style={{
        fontFamily: "Playfair Display, serif", fontSize: "clamp(1.5rem, 4vw, 2rem)",
        color: "#1a0a10", textAlign: "center", maxWidth: "480px",
        lineHeight: 1.25, margin: "0 0 0.4rem",
      }}>
        Decifre sua saúde.
      </h1>
      <p style={{ fontFamily: "Playfair Display, serif", fontSize: "clamp(1.2rem, 3vw, 1.6rem)", color: "#8B1A4A", fontStyle: "italic", margin: "0 0 0.85rem", textAlign: "center" }}>
        Descubra respostas.
      </p>

      <p style={{ color: "#666", fontSize: "0.95rem", textAlign: "center", maxWidth: "420px", marginBottom: "2rem", lineHeight: 1.6 }}>
        A Decifra extrai os biomarcadores do seu exame e os coloca no contexto do ciclo, da fertilidade, do climatério e da menopausa, com contexto feminino baseado em evidências para cada marcador.
      </p>

      {/* E-mail */}
      <div style={{ width: "100%", maxWidth: "360px", marginBottom: "2rem" }}>
        <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#555", marginBottom: "0.4rem" }}>
          Seu e-mail
        </label>
        <input
          type="email"
          placeholder="voce@exemplo.com"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setErr(""); }}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          style={{
            width: "100%", padding: "0.75rem 1rem", borderRadius: "0.6rem",
            border: "1.5px solid #d8cfc8", fontSize: "0.95rem",
            outline: "none", boxSizing: "border-box",
            background: "#fff",
          }}
        />
        {err && <p style={{ color: "#c0392b", fontSize: "0.78rem", marginTop: "0.35rem" }}>{err}</p>}
      </div>

      {/* Plan cards */}
      <div style={{
        display: "flex", gap: "0.75rem", flexWrap: "wrap",
        justifyContent: "center", width: "100%", maxWidth: "820px",
        marginBottom: "1.75rem",
      }}>
        {plans.map((p) => {
          const sel = plan === p.id;
          return (
            <div
              key={p.id}
              onClick={() => setPlan(p.id)}
              style={{
                flex: "1 1 220px", maxWidth: "260px",
                border: sel ? "2px solid #8B1A4A" : "2px solid #e2d9d0",
                borderRadius: "1rem", padding: "1.25rem 1.1rem",
                background: sel ? "#fff8fb" : "#fff",
                cursor: "pointer", transition: "all 0.15s",
                position: "relative", boxShadow: sel ? "0 4px 16px rgba(139,26,74,0.12)" : "none",
              }}
            >
              {p.badge && (
                <span style={{
                  position: "absolute", top: "-0.6rem", right: "0.75rem",
                  background: "#8B1A4A", color: "#fff",
                  fontSize: "0.65rem", fontWeight: 700, padding: "0.15rem 0.5rem",
                  borderRadius: "999px", letterSpacing: "0.04em",
                }}>{p.badge}</span>
              )}
              {p.highlight && (
                <div style={{
                  fontSize: "0.65rem", fontWeight: 700, color: "#8B1A4A",
                  textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.35rem",
                }}>Mais escolhido</div>
              )}
              <div style={{ fontFamily: "Playfair Display, serif", fontSize: "1rem", fontWeight: 700, color: "#1a0a10", marginBottom: "0.2rem" }}>{p.label}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "0.25rem", marginBottom: "0.75rem" }}>
                <span style={{ fontSize: "1.5rem", fontWeight: 800, color: "#8B1A4A" }}>{p.price}</span>
                <span style={{ fontSize: "0.8rem", color: "#888" }}>{p.cycle}</span>
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {p.perks.map((perk) => (
                  <li key={perk} style={{ fontSize: "0.8rem", color: "#555", display: "flex", gap: "0.5rem", marginBottom: "0.3rem", alignItems: "flex-start" }}>
                    <span style={{ marginTop: "1px", flexShrink: 0 }}><IcCheck size={13} color="#8B1A4A"/></span>
                    {perk}
                  </li>
                ))}
              </ul>
              {/* selection indicator */}
              <div style={{
                marginTop: "0.9rem", height: "3px", borderRadius: "999px",
                background: sel ? "#8B1A4A" : "transparent", transition: "background 0.15s",
              }} />
            </div>
          );
        })}
      </div>

      {/* CTA */}
      <button
        onClick={submit}
        disabled={loading}
        style={{
          padding: "0.9rem 2.5rem",
          background: loading ? "#c9a0b9" : "#8B1A4A",
          color: "#fff", border: "none", borderRadius: "0.75rem",
          fontSize: "1rem", fontWeight: 700,
          cursor: loading ? "not-allowed" : "pointer",
          transition: "background 0.2s",
          boxShadow: "0 4px 16px rgba(139,26,74,0.2)",
        }}
      >
        {loading ? "Um instante…" : (plans.find((p) => p.id === plan)?.cta || "Começar")}
      </button>

      <p style={{ marginTop: "1rem", fontSize: "0.75rem", color: "#aaa", textAlign: "center" }}>
        Sem cartão de crédito no plano gratuito · Cancele quando quiser
      </p>

      {/* GDPR consent */}
      <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", maxWidth: "360px", cursor: "pointer", marginTop: "0.5rem" }}>
        <input type="checkbox" checked={consent} onChange={(e) => { setConsent(e.target.checked); setErr(""); }}
          style={{ marginTop: "3px", accentColor: "#8B1A4A", flexShrink: 0 }}/>
        <span style={{ fontSize: "0.75rem", color: "#888", lineHeight: 1.5 }}>
          Concordo com a{" "}
          <button onClick={(e) => { e.preventDefault(); onPrivacy(); }} style={{ background: "none", border: "none", color: "#8B1A4A", fontSize: "0.75rem", cursor: "pointer", textDecoration: "underline", padding: 0 }}>Política de Privacidade</button>.
          {" "}A Decifra armazena apenas seu e-mail e o plano da assinatura. Nenhum dado de exame é guardado.
        </span>
      </label>

      {done && (
        <div style={{ marginTop: "1.25rem", background: "#fdf6fa", border: "1px solid #e4a5c7", borderRadius: "0.75rem", padding: "1rem 1.25rem", maxWidth: "360px", textAlign: "center" }}>
          <div style={{ fontSize: "1.5rem", marginBottom: "0.35rem" }}>✓</div>
          <div style={{ fontFamily: "Playfair Display, serif", fontSize: "1rem", color: "#8B1A4A", fontWeight: 700, marginBottom: "0.25rem" }}>Tudo certo</div>
          <p style={{ fontSize: "0.8rem", color: "#666", margin: "0 0 0.75rem" }}>Sua conta gratuita está ativa. Uma decifração por mês, sem cartão de crédito.</p>
          <button onClick={onBack} style={{ background: "#8B1A4A", color: "#fff", border: "none", borderRadius: "0.5rem", padding: "0.6rem 1.25rem", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer" }}>Ir para o início</button>
        </div>
      )}

      {!done && (
        <>
          <button onClick={() => { setMode("signin"); setErr(""); }}
            style={{ marginTop: "1rem", background: "none", border: "none", color: "#8B1A4A", fontSize: "0.78rem", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: "3px" }}>
            Já tem uma conta? Entrar
          </button>
          <button onClick={onBack}
            style={{ marginTop: "0.5rem", background: "none", border: "none", color: "#aaa", fontSize: "0.78rem", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: "3px" }}>
            Voltar para o início
          </button>
        </>
      )}

      <p style={{ marginTop: "1.5rem", fontSize: "0.7rem", color: "#ccc", textAlign: "center" }}>
        Feito por <a href="https://luana.systems" style={{ color: "#bbb" }}>luana.systems</a> ·
        Com as lentes do <a href="https://momops.org" style={{ color: "#bbb" }}>MomOps</a>
      </p>
    </div>
  );
}

// ---------- Home ----------
function Home({ go, onUseSample }) {
  return (
    <div className="page home">
      <section className="hero" aria-labelledby="hero-heading">
        <div className="hero-left">
          <div className="eyebrow">Inteligência clínica · Exames femininos</div>
          <h1 id="hero-heading" className="display">Seus exames,<br/><em>decifrados</em> para ela.</h1>
          <p className="lede">A Decifra extrai os biomarcadores que estão de fato no seu exame e os coloca no contexto do ciclo menstrual, da fertilidade, do climatério e da menopausa. Sem diagnósticos. Apenas o que o laboratório registrou, interpretado com cuidado.</p>
          <div className="cta-row">
            <button className="btn btn-primary" onClick={() => go("decode")}>Decifrar um exame</button>
            <button className="btn btn-ghost" onClick={onUseSample}>Testar com exemplo</button>
          </div>
          <ul className="trust-list">
            <li><Dot/> Extração rigorosa. Mostramos só o que está no seu exame.</li>
            <li><Dot/> Valores não alterados, marcadores não inventados, unidades não convertidas.</li>
            <li><Dot/> Marcadores ausentes aparecem em destaque, nunca fabricados.</li>
          </ul>
        </div>
        <div className="hero-right">
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--s3)" }}>
            <PreviewCard />
          </div>
        </div>
      </section>

      <section className="pillars">
        <PillarCard num="01" title="Extrair" body="Extração rigorosa via prompt de grau clínico. Valores copiados exatamente, sem arredondamento, sem conversão de unidade." />
        <PillarCard num="02" title="Confirmar" body="Você revê cada marcador extraído antes da interpretação começar. Pode incluir, excluir ou sinalizar linhas de baixa confiança." />
        <PillarCard num="03" title="Interpretar" body="Cada marcador confirmado recebe contexto estruturado: o que mede, por que importa para mulheres e qual a força da evidência." />
      </section>

      <section className="guide-hub" aria-labelledby="guides-heading">
        <div className="guide-hub-head">
          <h2 id="guides-heading" className="h2">Guias de exames femininos</h2>
          <p className="sub">Leia explicações focadas antes de decifrar seu exame.</p>
        </div>
        <div className="guide-grid">
          <a className="guide-card" href="/sop-interpretacao-exames">
            <div className="guide-eyebrow">SOP</div>
            <div className="guide-title">Interpretação de exames de SOP</div>
            <p>Entenda LH, FSH, AMH, insulina, glicose e marcadores tireoidianos, e onde cada um se encaixa clinicamente.</p>
          </a>
          <a className="guide-card" href="/exames-hormonais-fertilidade">
            <div className="guide-eyebrow">Fertilidade</div>
            <div className="guide-title">Exames hormonais para fertilidade</div>
            <p>Receba contexto prático sobre hormônios reprodutivos, micronutrientes, tireoide e fase do ciclo.</p>
          </a>
          <a className="guide-card" href="/exames-tireoide-mulher">
            <div className="guide-eyebrow">Tireoide</div>
            <div className="guide-title">Exames de tireoide na mulher</div>
            <p>Revise TSH, T4/T3 livres, anticorpos e por que padrões tireoidianos importam na fertilidade e no climatério.</p>
          </a>
          <a className="guide-card" href="/exames-climaterio">
            <div className="guide-eyebrow">Climatério</div>
            <div className="guide-title">Exames laboratoriais no climatério</div>
            <p>Saiba quais exames têm maior valor durante a transição e por que acompanhar a tendência vale mais do que um único momento.</p>
          </a>
        </div>
      </section>

      <section className="principles">
        <div className="principles-top card">
          <div className="principles-copy">
            <div className="eyebrow">Nossa abordagem</div>
            <h2 className="h2">Disciplina de dados</h2>
            <p className="sub">A Decifra é desenhada em torno de quatro princípios que orientam cada laudo.</p>
          </div>
          <div className="principles-art" aria-hidden="true">
            <img src="/illustrations/principles-hero.png" alt="" className="principles-art-img"/>
          </div>
        </div>
        <div className="principles-list">
          <div className="principle-row card"><span className="principle-icon">◉</span><div><div className="principle-t">Extrair, não inventar</div><div className="principle-b">Mostramos apenas marcadores e valores identificados no seu exame. Nada é adicionado ou estimado.</div></div></div>
          <div className="principle-row card"><span className="principle-icon">◍</span><div><div className="principle-t">Preservar o exame original</div><div className="principle-b">Os valores permanecem alinhados ao documento de origem do laboratório sempre que possível.</div></div></div>
          <div className="principle-row card"><span className="principle-icon">◎</span><div><div className="principle-t">Interpretar com cuidado</div><div className="principle-b">Fornecemos contexto fisiológico baseado em pesquisa de saúde feminina, não diagnósticos ou recomendações de tratamento.</div></div></div>
          <div className="principle-row card"><span className="principle-icon">◌</span><div><div className="principle-t">Mostrar o que falta</div><div className="principle-b">Marcadores ausentes no seu exame aparecem em destaque para você ver o quadro completo do que foi e do que não foi testado.</div></div></div>
        </div>
        <div className="principles-foot card">
          <span>Esses princípios moldam nosso sistema, mas nenhuma extração é 100% infalível. Recomendamos revisar cada resultado antes de usar.</span>
        </div>
      </section>
    </div>
  );
}

function Dot() { return <span className="bullet-dot"/>; }
function PillarCard({ num, title, body }) { return (<div className="pillar-card"><div className="pillar-num">{num}</div><div className="pillar-title">{title}</div><div className="pillar-body">{body}</div></div>); }
function Principle({ n, t, b }) { return (<div className="principle"><div className="principle-n">{n}</div><div><div className="principle-t">{t}</div><div className="principle-b">{b}</div></div></div>); }

function PreviewCard() {
  return (
    <div className="preview">
      <div className="preview-chrome"><span className="preview-dot"/><span className="preview-path">decifra · prévia dos resultados</span></div>
      <div className="preview-body">
        <div className="preview-row"><div className="preview-label">Ferritina</div><div className="preview-value">21 <span className="u">ng/mL</span></div><div className="preview-range">15 a 150</div><StatusBadge status="low-normal" compact /></div>
        <div className="preview-row"><div className="preview-label">Vitamina D</div><div className="preview-value">27 <span className="u">ng/mL</span></div><div className="preview-range">30 a 100</div><StatusBadge status="below range" compact /></div>
        <div className="preview-row"><div className="preview-label">TSH</div><div className="preview-value">3,4 <span className="u">mUI/L</span></div><div className="preview-range">0,4 a 4,0</div><StatusBadge status="within range" compact /></div>
        <div className="preview-note"><span className="preview-note-label">Contexto feminino</span>Mulheres que menstruam perdem ferro mensalmente. A ferritina costuma baixar antes da hemoglobina cair.</div>
      </div>
    </div>
  );
}

// ---------- Decode ----------
function Decode({ stage, errorMsg, extracted, reportText, onStart, onReview, onRetry, onUnlock, userEmail, limitHit }) {
  const [tab, setTab] = useState("upload");
  const [text, setText] = useState("");
  const [name, setName] = useState("");
  const [uploadHint, setUploadHint] = useState("");
  const [images, setImages] = useState([]); // [{ data: "<base64>", media_type: "image/jpeg", name: "..." }]
  const fileRef = useRef(null);
  const MAX_IMAGES = 5;
  const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB raw

  const extractPdfText = async (file) => {
    const pdfjs = window.pdfjsLib;
    if (!pdfjs) throw new Error("PDF parser unavailable");
    pdfjs.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    const bytes = await file.arrayBuffer();
    const collectText = async (doc) => {
      const pages = [];
      for (let i = 1; i <= doc.numPages; i += 1) {
        const page = await doc.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((it) => ("str" in it ? it.str : ""))
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();
        if (pageText) pages.push(pageText);
      }
      return pages.join("\n");
    };

    try {
      const loadingTask = pdfjs.getDocument({ data: bytes });
      const pdf = await loadingTask.promise;
      return await collectText(pdf);
    } catch {
      // Some browsers block worker loading from CDN; retry on main thread.
      const loadingTaskNoWorker = pdfjs.getDocument({ data: bytes, disableWorker: true });
      const pdfNoWorker = await loadingTaskNoWorker.promise;
      return await collectText(pdfNoWorker);
    }
  };

  const readImageAsBase64 = (file) => new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = (e) => {
      const url = typeof e.target.result === "string" ? e.target.result : "";
      const comma = url.indexOf(",");
      resolve(comma === -1 ? url : url.slice(comma + 1));
    };
    r.onerror = () => reject(new Error("read failed"));
    r.readAsDataURL(file);
  });

  const handleFiles = async (fileList) => {
    if (!fileList || !fileList.length) return;
    const files = Array.from(fileList);

    // HEIC friendly error before anything else.
    const heic = files.find((f) => /\.heic$/i.test(f.name) || /^image\/heic/i.test(f.type || ""));
    if (heic) {
      setUploadHint("iPhones podem enviar fotos no formato HEIC. Converta para JPG na galeria antes de enviar, ou tire a foto novamente com a câmera do app Câmera (que salva em JPG).");
      return;
    }

    const imageFiles = files.filter((f) => /\.(jpe?g|png)$/i.test(f.name) || /^image\/(jpe?g|png)/i.test(f.type || ""));

    // Multi-image batch path: all files are images, append to images state.
    if (imageFiles.length === files.length) {
      const oversize = imageFiles.find((f) => f.size > MAX_IMAGE_BYTES);
      if (oversize) {
        setUploadHint(`Imagem muito grande (${(oversize.size / 1024 / 1024).toFixed(1)} MB). Use fotos de até 10 MB cada.`);
        return;
      }
      const totalAfter = images.length + imageFiles.length;
      if (totalAfter > MAX_IMAGES) {
        setUploadHint(`Máximo de ${MAX_IMAGES} imagens por exame. Você já tem ${images.length}, e tentou adicionar ${imageFiles.length}.`);
        return;
      }
      try {
        const added = await Promise.all(
          imageFiles.map(async (f) => ({
            data: await readImageAsBase64(f),
            media_type: /\.png$/i.test(f.name) ? "image/png" : "image/jpeg",
            name: f.name,
          }))
        );
        setText(""); // images path is exclusive of text path
        setImages((prev) => [...prev, ...added]);
        if (!name) setName(imageFiles[0].name.replace(/\.[^.]+$/, ""));
        setUploadHint(
          totalAfter === 1
            ? "Imagem carregada. Continue para decifrar."
            : `${totalAfter} imagens carregadas. Continue para decifrar.`
        );
      } catch {
        setUploadHint("Não foi possível ler uma das imagens. Tente novamente.");
      }
      return;
    }

    // Mixed images + non-images is ambiguous; surface a clear error.
    if (imageFiles.length > 0) {
      setUploadHint("Envie só fotos do laudo, ou só o arquivo PDF/TXT. Não misture os dois tipos.");
      return;
    }

    // Non-image flow falls back to single-file handler (PDF/TXT/CSV/RTF/MD).
    handleFile(files[0]);
  };

  const handleFile = async (file) => {
    if (!file) return;
    setUploadHint("");
    setImages([]); // entering text/PDF flow drops any pending images
    setName(file.name.replace(/\.[^.]+$/, ""));
    if (/\.pdf$/i.test(file.name)) {
      try {
        const content = await extractPdfText(file);
        if (!content || content.trim().length < 5) {
          setText("");
          setUploadHint("Este PDF parece escaneado ou só com imagens. Copie e cole o texto do portal do laboratório, ou rode um OCR antes.");
          return;
        }
        setText(content);
        setUploadHint("Texto do PDF extraído. Revise rapidamente se faltou alguma linha antes de extrair os marcadores.");
      } catch (err) {
        setText("");
        setUploadHint("Não foi possível ler este PDF. Tente um PDF com texto selecionável, ou cole o conteúdo do laudo.");
      }
      return;
    }
    if (!/\.(txt|csv|rtf|md)$/i.test(file.name)) {
      setText("");
      setUploadHint("Use um arquivo .txt ou .csv, ou cole o texto do portal do laboratório. RTF pode funcionar se o conteúdo for praticamente texto puro.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = typeof e.target.result === "string" ? e.target.result : "";
      const trimmed = content.trim();
      if (!trimmed) {
        setText("");
        setUploadHint("O arquivo não tinha texto legível. Tente exportar como texto puro ou cole o conteúdo direto do PDF.");
        return;
      }
      setText(content);
    };
    reader.onerror = () => {
      setText("");
      setUploadHint("Não foi possível ler este arquivo. Tente um arquivo menor ou cole o texto diretamente.");
    };
    reader.readAsText(file);
  };

  if (stage === "scanning") return <Scanning reportText={reportText} />;
  if (stage === "preview") return (
    <ResultPreview
      extracted={extracted}
      onUnlock={onUnlock}
      userEmail={userEmail}
      limitHit={limitHit}
    />
  );
  if (stage === "done") return <ExtractionComplete count={extracted.length} onReview={onReview} />;
  if (stage === "error") return (
    <div className="page complete"><div className="card complete-card">
      <div className="eyebrow" style={{color:"#7A2E2E"}}>Extração falhou</div>
      <h1 className="h1">Não conseguimos ler esse exame</h1>
      <p className="sub">O motor de extração retornou um erro. Seu texto não foi salvo. Tente de novo, ou cole o conteúdo direto.</p>
      {errorMsg && <pre className="marker-source" style={{marginTop:16, textAlign:"left"}}>{errorMsg}</pre>}
      <div style={{marginTop:24}}><button className="btn btn-primary" onClick={onRetry}>Tentar de novo</button></div>
    </div></div>
  );

  return (
    <div className="page decode">
      <div className="page-head">
        <div className="eyebrow">Etapa 1 de 3 · Decifrar</div>
        <h1 className="h1">Adicione seu exame laboratorial</h1>
        <p className="sub">Envie um PDF, TXT ou CSV do seu laboratório. Extraímos apenas o que está no seu exame. Nada adicionado, nada presumido.</p>
      </div>

      <div className="decode-grid">
        <div className="card decode-card">
          <div className="tabs" role="tablist" aria-label="Forma de envio do exame">
            <button
              type="button"
              role="tab"
              id="tab-upload"
              aria-selected={tab === "upload"}
              aria-controls="tab-panel-decode"
              className={`tab ${tab === "upload" ? "active" : ""}`}
              onClick={() => { setUploadHint(""); setTab("upload"); }}
            >
              Enviar arquivo
            </button>
            <button
              type="button"
              role="tab"
              id="tab-paste"
              aria-selected={tab === "paste"}
              aria-controls="tab-panel-decode"
              className={`tab ${tab === "paste" ? "active" : ""}`}
              onClick={() => { setUploadHint(""); setTab("paste"); }}
            >
              Colar texto
            </button>
          </div>

          <div
            id="tab-panel-decode"
            role="tabpanel"
            aria-labelledby={tab === "paste" ? "tab-paste" : "tab-upload"}
          >
            {tab === "paste" && (
              <div className="tab-body">
                <label className="field-label" htmlFor="decode-report-name">Nome do exame</label>
                <input id="decode-report-name" className="text-input" placeholder="ex.: Check-up de rotina abril 2026" value={name} onChange={(e) => setName(e.target.value)} />
                <label className="field-label field-label-spaced" htmlFor="decode-report-text">Texto do exame</label>
                <textarea id="decode-report-text" className="textarea" placeholder="Cole aqui o texto do seu exame laboratorial. Inclua nomes dos marcadores, valores, unidades e faixas de referência." value={text} onChange={(e) => setText(e.target.value)} />
                {text.length > 50_000 && (
                  <p className={`char-count ${text.length > MAX_EXTRACT_CHARS ? "is-over" : ""}`} aria-live="polite">
                    {text.length.toLocaleString("pt-BR")} / {MAX_EXTRACT_CHARS.toLocaleString("pt-BR")} caracteres
                    {text.length > MAX_EXTRACT_CHARS ? ". Reduza antes de extrair." : ""}
                  </p>
                )}
                <div className="row-between tab-actions">
                  <button type="button" className="btn btn-ghost small" onClick={() => { setText(SAMPLE_REPORT); setImages([]); setName("Exame laboratorial exemplo 2026-04-11"); }}>Carregar exame de exemplo</button>
                  <button type="button" className="btn btn-primary" disabled={!text.trim()} onClick={() => onStart({ text, images: [] }, name || "Exame sem nome")}>Continuar para decifrar <IcArrowRight size={15} color="#fff"/></button>
                </div>
              </div>
            )}

            {tab === "upload" && (
              <div className="tab-body">
                <label className="field-label" htmlFor="decode-upload-name">Nome do exame</label>
                <input id="decode-upload-name" className="text-input" placeholder="ex.: Check-up de rotina abril 2026" value={name} onChange={(e) => setName(e.target.value)} />
                <label className="field-label field-label-spaced">Arquivo</label>
                <div
                  className="dropzone"
                  role="button"
                  tabIndex={0}
                  aria-label="Enviar arquivo do exame laboratorial"
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileRef.current?.click(); } }}
                  onClick={() => fileRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("drag"); }}
                  onDragLeave={(e) => e.currentTarget.classList.remove("drag")}
                  onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove("drag"); handleFiles(e.dataTransfer.files); }}
                >
                  <img src="/illustrations/dropzone-bg.png" alt="" className="dropzone-bg" aria-hidden="true"/>
                  <div className="dropzone-content">
                    <div className="drop-icon"><svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true"><circle cx="16" cy="16" r="14" fill="var(--primary)" fillOpacity=".08"/><path d="M16 9v11" stroke="var(--primary)" strokeWidth="1.6" strokeLinecap="round"/><path d="M11 13.5l5-5 5 5" stroke="var(--primary)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M8 22v1.5a1.5 1.5 0 001.5 1.5h13a1.5 1.5 0 001.5-1.5V22" stroke="var(--primary)" strokeWidth="1.6" strokeLinecap="round"/></svg></div>
                    <div className="drop-title">Arraste e solte seu(s) arquivo(s) aqui</div>
                    <div className="drop-sub">PDF, JPG, PNG, TXT ou CSV (máx. 10 MB por arquivo)</div>
                  </div>
                  <input ref={fileRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.txt,.csv,.rtf,.md" onChange={(e) => handleFiles(e.target.files)} style={{display: "none"}} aria-hidden="true" />
                </div>
                <div className="drop-notes">
                  <span className="drop-note"><span className="drop-note-dot" aria-hidden="true"/>PDFs de texto são lidos automaticamente.</span>
                  <span className="drop-note"><span className="drop-note-dot" aria-hidden="true"/>Fotos do laudo (JPG/PNG) são lidas por visão computacional. Tire fotos nítidas, uma página por foto.</span>
                </div>
                {uploadHint && <p className="upload-hint" role="status">{uploadHint}</p>}
                {text && images.length === 0 && (<div className="file-meta"><span className="file-meta-name">{name || "Sem nome"}</span><span className="file-meta-size">{(text.length/1024).toFixed(1)} KB</span><span className="chip">Pronto</span></div>)}
                {images.length > 0 && (
                  <div className="file-meta" style={{ flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
                    {images.map((img, i) => (
                      <span key={i} className="chip" style={{ display: "inline-flex", alignItems: "center", gap: "6px", paddingRight: "4px" }}>
                        <span>{img.name.length > 22 ? img.name.slice(0, 20) + "…" : img.name}</span>
                        <button
                          type="button"
                          aria-label={`Remover ${img.name}`}
                          onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                          style={{ background: "none", border: "none", color: "var(--ink-3)", cursor: "pointer", fontSize: "14px", lineHeight: 1, padding: "0 2px" }}
                        >×</button>
                      </span>
                    ))}
                    <span className="file-meta-size">{images.length}/{MAX_IMAGES}</span>
                  </div>
                )}
                <div className="row-between tab-actions">
                  <button type="button" className="btn btn-ghost small" onClick={() => { setText(SAMPLE_REPORT); setImages([]); setName("Exame laboratorial exemplo 2026-04-11"); }}>Carregar exame de exemplo</button>
                  <button type="button" className="btn btn-primary" disabled={!text.trim() && images.length === 0} onClick={() => onStart({ text, images }, name || "Exame sem nome")}>Continuar para decifrar <IcArrowRight size={15} color="#fff"/></button>
                </div>
              </div>
            )}
          </div>
        </div>

        <aside className="card aside-card">
          <div className="aside-h">O que acontece a seguir</div>
          <ol className="aside-steps">
            <li><span className="step-n">1</span><div><b>Extração</b><br/>Extraímos apenas marcadores, valores, unidades e faixas presentes no seu exame.</div></li>
            <li><span className="step-n">2</span><div><b>Revisão</b><br/>Você confere cada resultado. Pode incluir, excluir ou sinalizar itens de baixa confiança.</div></li>
            <li><span className="step-n">3</span><div><b>Interpretação</b><br/>Adicionamos contexto estruturado segundo a fisiologia feminina e a fase da vida.</div></li>
          </ol>
          <div className="aside-divider"/>
          <div className="aside-h small">Disciplina de dados</div>
          <ul className="aside-deny">
            <li>Extrair, não inventar.</li>
            <li>Preservar o exame original.</li>
            <li>Interpretar com cuidado.</li>
            <li>Mostrar o que falta.</li>
          </ul>
          <div className="aside-foot">Recomendamos revisar cada resultado antes de qualquer decisão.</div>
        </aside>
      </div>
    </div>
  );
}

const SCAN_TIDBITS = [
  "A ferritina costuma baixar antes da hemoglobina cair.",
  "TSH entre 2,5 e 4,0 mUI/L pode causar sintomas, mesmo dentro da “faixa de referência”.",
  "Anti-TPO pode positivar anos antes do TSH começar a se alterar.",
  "Faixas de referência mudam conforme fase do ciclo, idade e momento da vida.",
  "Anemia ferropriva é a deficiência nutricional mais comum em mulheres brasileiras em idade fértil.",
  "Progesterona no dia 21 do ciclo abaixo de 3 ng/mL sugere ciclo anovulatório.",
  "AMH é o melhor marcador de reserva ovariana e não varia com a fase do ciclo.",
  "T3 livre raramente é pedido em painéis padrão, mas é o hormônio tireoidiano ativo.",
  "Hipotireoidismo subclínico é mais frequente em mulheres brasileiras acima dos 40 anos.",
];
function Scanning({ reportText }) {
  const [progress, setProgress] = useState(0);
  const [tidbitIdx, setTidbitIdx] = useState(0);
  useEffect(() => { const id = setInterval(() => setProgress((p) => Math.min(96, p + 3)), 120); return () => clearInterval(id); }, []);
  useEffect(() => { const id = setInterval(() => setTidbitIdx((i) => (i + 1) % SCAN_TIDBITS.length), 5000); return () => clearInterval(id); }, []);
  const stepAt = Math.floor(progress / 20); // 0-4
  const steps = [
    "Lendo seu exame",
    "Mapeando sinais hormonais",
    "Traçando vias metabólicas",
    "Conectando marcadores tireoidianos e reprodutivos",
    "Montando seu retrato fisiológico",
  ];
  return (
    <div className="page scanning scanning-polished">
      <div className="page-head scanning-head">
        <div className="eyebrow">Etapa 2 de 3 · Decifrar</div>
        <h1 className="h1">Construindo seu atlas biológico</h1>
        <p className="sub">Traduzindo seus sinais laboratoriais em uma visão sistêmica da sua fisiologia.</p>
      </div>

      <div className="card scan-status scan-status-solo">
        <ol className="scan-step-list">
          {steps.map((label, i) => {
            const state = i < stepAt ? "done" : i === stepAt ? "active" : "pending";
            return (
              <li key={i} className={`scan-step ${state}`} aria-current={state === "active" ? "step" : undefined}>
                <span className="scan-step-badge" aria-hidden="true">
                  {state === "done" && (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M3 7.2l2.8 2.8L11 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                  {state === "active" && <span className="scan-step-pulse"/>}
                  {state === "pending" && <span className="scan-step-bullet"/>}
                </span>
                <span className="scan-step-label">{label}</span>
              </li>
            );
          })}
        </ol>
      </div>

      <figure className="scan-tidbit-pull" aria-live="polite">
        <div className="tidbit-eyebrow">Você sabia?</div>
        <blockquote className="tidbit-body" key={tidbitIdx}>{SCAN_TIDBITS[tidbitIdx]}</blockquote>
      </figure>

      <div className="scan-trust" role="note">
        <svg className="scan-trust-icon" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M3.5 6.5V4.5a3.5 3.5 0 117 0v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          <rect x="2.5" y="6.5" width="9" height="6" rx="1.4" stroke="currentColor" strokeWidth="1.2"/>
          <circle cx="7" cy="9.5" r=".9" fill="currentColor"/>
        </svg>
        <span>Seu exame permanece no seu navegador. Nada inferido, nada armazenado.</span>
      </div>
    </div>
  );
}

function ExtractionComplete({ count, onReview }) {
  return (
    <div className="page complete">
      <div className="complete-card card">
        <div className="complete-check"><IcCheckCircle size={64} color="#8B1A4A"/></div>
        <h1 className="h1">Extração concluída</h1>
        <p className="sub">{count} resultados foram encontrados, sem alteração, no seu exame. Revise-os antes da interpretação.</p>
        <div style={{marginTop: 24}}><button className="btn btn-primary" onClick={onReview}>Revisar resultados extraídos <IcArrowRight size={15} color="#fff"/></button></div>
      </div>
    </div>
  );
}

// ---------- Review ----------
function Review({ reportName, setReportName, confirmed, setConfirmed, onConfirm, onBack }) {
  const toggle = (i) => setConfirmed(confirmed.map((m, idx) => idx === i ? { ...m, included: !m.included } : m));
  const included = confirmed.filter((m) => m.included).length;
  const [flash, setFlash] = useState(false);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const handleConfirm = () => { setFlash(true); setTimeout(() => { onConfirm(); }, 420); };
  const toggleExpand = (i) => setExpandedRows((prev) => {
    const next = new Set(prev);
    next.has(i) ? next.delete(i) : next.add(i);
    return next;
  });

  return (
    <div className="page review">
      <div className="page-head">
        <div className="eyebrow">Etapa 2 de 3 · Revisão</div>
        <h1 className="h1">Confirme os resultados extraídos</h1>
        <p className="sub">Cada linha abaixo foi encontrada, sem alteração, no seu exame. Desmarque o que não quer interpretar. Clique em uma linha para ver origem e contexto. Os valores são somente leitura.</p>
      </div>

      <div className="review-toolbar card">
        <div>
          <label className="field-label">Nome do exame</label>
          <input className="text-input small" value={reportName} onChange={(e) => setReportName(e.target.value)} />
        </div>
        <div className="review-meta">
          <div><div className="meta-n">{confirmed.length}</div><div className="meta-l">encontrados</div></div>
          <div><div className="meta-n">{included}</div><div className="meta-l">incluídos</div></div>
          <div><div className="meta-n">{confirmed.filter(m => m.confidence === "high").length}</div><div className="meta-l">alta conf.</div></div>
        </div>
      </div>

      <div className="review-table card">
        <div className="review-header">
          <div className="col-inc">Incl.</div>
          <div className="col-marker">Exame</div>
          <div className="col-val">Valor</div>
          <div className="col-unit">Unidade</div>
          <div className="col-range">Faixa de referência</div>
          <div className="col-conf">Confiança</div>
          <div className="col-expand"></div>
        </div>
        {confirmed.map((m, i) => {
          const isExpanded = expandedRows.has(i);
          const hasDetail = m.source_snippet || m.female_context;
          return (
            <div key={i} className="review-row-wrap">
              <div
                className={`review-row${m.included ? "" : " excluded"}${hasDetail ? " expandable" : ""}`}
                onClick={() => hasDetail && toggleExpand(i)}
              >
                <div className="col-inc" onClick={(e) => e.stopPropagation()}>
                  <label className="checkbox"><input type="checkbox" checked={m.included} onChange={() => toggle(i)} /><span className="box"/></label>
                </div>
                <div className="col-marker"><div className="marker-n">{m.marker}</div></div>
                <div className="col-val mono">{m.value}</div>
                <div className="col-unit mono">{m.unit || "–"}</div>
                <div className="col-range mono">{m.reference_range || "–"}</div>
                <div className="col-conf"><ConfBadge level={m.confidence}/></div>
                <div className="col-expand">
                  {hasDetail && (
                    <span className={`expand-chevron${isExpanded ? " open" : ""}`}>
                      <IcChevronDown size={15} color="var(--ink-3)"/>
                    </span>
                  )}
                </div>
              </div>
              {isExpanded && hasDetail && (
                <div className="review-row-detail">
                  {m.source_snippet && (
                    <div className="detail-block">
                      <div className="detail-label">Trecho do laudo</div>
                      <div className="detail-snip">{m.source_snippet}</div>
                    </div>
                  )}
                  {m.female_context && (
                    <div className="detail-block">
                      <div className="detail-label">Contexto clínico</div>
                      <div className="detail-ctx">{m.female_context}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {confirmed.length === 0 && (
          <div style={{padding:"48px 24px", textAlign:"center", color:"var(--ink-3)"}}>
            Nenhum exame foi extraído do seu laudo. O motor só registra exames que aparecem explicitamente.
          </div>
        )}
      </div>

      {flash && (
        <div className="confirm-flash" role="status">
          <IcCheck size={14} color="#8B1A4A"/> {included} resultado{included !== 1 ? "s" : ""} confirmado{included !== 1 ? "s" : ""}
        </div>
      )}
      <div className="review-actions">
        <button className="btn btn-ghost" onClick={onBack}><IcArrowLeft size={15}/> Voltar</button>
        <div className="review-actions-right">
          <span className="review-count">{included} de {confirmed.length} resultados serão interpretados</span>
          <button className="btn btn-primary" disabled={!included || flash} onClick={handleConfirm}>Confirmar e interpretar <IcArrowRight size={15} color="#fff"/></button>
        </div>
      </div>
    </div>
  );
}

function ConfBadge({ level }) {
  const map = { high: "Alta", medium: "Média", low: "Baixa" };
  return <span className={`conf conf-${level}`}>{map[level] || level}</span>;
}

// ---------- Context ----------
const LIFE_STAGES = [
  { id: "cycle",         label: "Ciclo menstrual" },
  { id: "pregnancy",     label: "Gestação" },
  { id: "postpartum",    label: "Pós-parto" },
  { id: "perimenopause", label: "Climatério" },
  { id: "menopause",     label: "Menopausa" },
  { id: "other",         label: "Outro / não tenho certeza" },
];

function Context({ initial, onSave, onSkip, onBack }) {
  const [age, setAge]                   = useState(initial?.age || "");
  const [lifeStage, setLifeStage]       = useState(initial?.lifeStage || "");
  const [cycleDay, setCycleDay]         = useState(initial?.cycleDay || "");
  const [postpartumWeeks, setPP]        = useState(initial?.postpartumWeeks || "");
  const [monthsSincePeriod, setMSP]     = useState(initial?.monthsSincePeriod || "");
  const [notes, setNotes]               = useState(initial?.notes || "");

  const submit = () => {
    const ctx = {
      age: age ? parseInt(age, 10) : null,
      lifeStage: lifeStage || null,
      cycleDay: lifeStage === "cycle" && cycleDay ? parseInt(cycleDay, 10) : null,
      postpartumWeeks: lifeStage === "postpartum" && postpartumWeeks ? parseInt(postpartumWeeks, 10) : null,
      monthsSincePeriod: (lifeStage === "perimenopause" || lifeStage === "menopause") && monthsSincePeriod
        ? parseInt(monthsSincePeriod, 10) : null,
      notes: notes.trim().slice(0, 600) || null,
    };
    onSave(ctx);
  };

  const stageDetail = (() => {
    if (lifeStage === "cycle") {
      return (
        <div className="ctx-detail">
          <label className="field-label" htmlFor="ctx-cycle-day">Dia do ciclo (se souber)</label>
          <input
            id="ctx-cycle-day"
            className="text-input"
            type="number"
            min="1" max="45"
            placeholder="ex.: 14"
            value={cycleDay}
            onChange={(e) => setCycleDay(e.target.value)}
          />
          <p className="ctx-help">Dia 1 é o primeiro dia da sua última menstruação.</p>
        </div>
      );
    }
    if (lifeStage === "postpartum") {
      return (
        <div className="ctx-detail">
          <label className="field-label" htmlFor="ctx-pp">Semanas pós-parto</label>
          <input
            id="ctx-pp"
            className="text-input"
            type="number"
            min="0" max="156"
            placeholder="ex.: 3"
            value={postpartumWeeks}
            onChange={(e) => setPP(e.target.value)}
          />
          <p className="ctx-help">Hormônios e ferritina mudam muito nos primeiros 6 meses após o parto.</p>
        </div>
      );
    }
    if (lifeStage === "perimenopause" || lifeStage === "menopause") {
      return (
        <div className="ctx-detail">
          <label className="field-label" htmlFor="ctx-msp">Meses desde a última menstruação</label>
          <input
            id="ctx-msp"
            className="text-input"
            type="number"
            min="0" max="600"
            placeholder="ex.: 8"
            value={monthsSincePeriod}
            onChange={(e) => setMSP(e.target.value)}
          />
          <p className="ctx-help">Ajuda a ponderar as faixas de referência de FSH, estradiol e marcadores ósseos.</p>
        </div>
      );
    }
    return null;
  })();

  return (
    <div className="page context-page">
      <div className="page-head context-head">
        <div className="eyebrow">Opcional · Adicionar contexto</div>
        <h1 className="h1">Conte um pouco sobre você.</h1>
        <p className="sub">Valores laboratoriais mudam com a fase do ciclo, idade e momento da vida. Quanto mais sabemos, mais precisa a interpretação. Pule se preferir não compartilhar.</p>
      </div>

      <div className="card context-card">
        <div className="ctx-field">
          <label className="field-label" htmlFor="ctx-age">Idade</label>
          <input
            id="ctx-age"
            className="text-input ctx-age-input"
            type="number"
            min="13" max="100"
            placeholder="ex.: 32"
            value={age}
            onChange={(e) => setAge(e.target.value)}
          />
        </div>

        <div className="ctx-field">
          <span className="field-label">Em que momento do ciclo você está?</span>
          <div className="ctx-stage-grid" role="radiogroup" aria-label="Momento da vida">
            {LIFE_STAGES.map((s) => (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={lifeStage === s.id}
                className={`ctx-stage ${lifeStage === s.id ? "active" : ""}`}
                onClick={() => setLifeStage(lifeStage === s.id ? "" : s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {stageDetail}

        <div className="ctx-field">
          <label className="field-label" htmlFor="ctx-notes">Tem mais algo que deveríamos saber?</label>
          <textarea
            id="ctx-notes"
            className="textarea ctx-notes"
            placeholder="Sintomas, medicamentos, eventos recentes (ex.: ciclo de FIV, aborto, cirurgia, novo contraceptivo)."
            value={notes}
            onChange={(e) => setNotes(e.target.value.slice(0, 600))}
            rows={4}
          />
          <p className="ctx-help">{notes.length}/600 caracteres</p>
        </div>
      </div>

      <div className="ctx-actions">
        <button type="button" className="btn btn-ghost" onClick={onBack}><IcArrowLeft size={15}/> Voltar para revisão</button>
        <div className="ctx-actions-right">
          <button type="button" className="btn btn-ghost" onClick={onSkip}>Pular</button>
          <button type="button" className="btn btn-primary" onClick={submit}>Continuar para resultados <IcArrowRight size={15} color="#fff"/></button>
        </div>
      </div>
    </div>
  );
}

// ---------- Results ----------
function Results({ reportName, confirmed, notFound, userContext, onDecodeAnother }) {
  const toast = useToast();
  const [summary, setSummary] = useState(null);
  const [summaryState, setSummaryState] = useState("idle"); // idle | loading | ready
  const date = new Date().toLocaleDateString("pt-BR", { year: "numeric", month: "long", day: "numeric" });
  const visibleConfirmed = confirmed;
  const fallback = buildFallbackSummary(confirmed);
  const fullSummary = summary?.full_summary || fallback.full_summary;
  const womenSummary = summary?.women_focus_summary || fallback.women_focus_summary;
  const markerSystem = (markerName) => {
    const k = String(markerName || "").toUpperCase();
    if (/(ESTRADIOL|OESTRADIOL|PROGESTERONA|PROGESTERONE|LH|FSH|AMH|ANTIMÜLLERIANO|ANTI-MULLERIANO|PROLACTINA|PROLACTIN)/.test(k)) return "Hormônios Reprodutivos";
    if (/(TSH|T3 LIVRE|T4 LIVRE|FREE T3|FREE T4|T3|T4|TPO|ANTI-TPO|ANTI TG|TIREO|THYROID|TIREOGLOBULINA)/.test(k)) return "Função Tireoidiana";
    if (/(HBA1C|HEMOGLOBINA GLIC|GLICOSE|GLICEMIA|GLUCOSE|INSULIN|HOMA|TRIGLIC|TRIGLYCERIDES|HDL|LDL|COLESTEROL|CHOLESTEROL)/.test(k)) return "Saúde Metabólica";
    if (/(FERRITINA|FERRITIN|FERRO|IRON|B12|COBALAMINA|FOLATO|FOLATE|ÁCIDO FÓLICO|VITAMINA D|VITAMIN D|VIT D|HEMOGLOBIN|HEMÁCIAS|MAGNÉSIO|MAGNESIUM|ZINCO|ZINC)/.test(k)) return "Ferro e Nutrientes";
    return "Outros Sistemas e Andrógenos";
  };
  const SYSTEM_ORDER = [
    "Hormônios Reprodutivos",
    "Função Tireoidiana",
    "Saúde Metabólica",
    "Ferro e Nutrientes",
    "Outros Sistemas e Andrógenos",
  ];
  const SYSTEM_ART = {
    "Hormônios Reprodutivos": "/illustrations/system-reproductive.png",
    "Função Tireoidiana": "/illustrations/system-thyroid.png",
    "Saúde Metabólica": "/illustrations/system-metabolic.png",
    "Ferro e Nutrientes": "/illustrations/system-iron.png",
    "Outros Sistemas e Andrógenos": "/illustrations/system-other.png",
  };
  const systemsOverview = useMemo(() => {
    const buckets = Object.fromEntries(SYSTEM_ORDER.map((s) => [s, []]));
    confirmed.forEach((m) => {
      const key = markerSystem(m.marker);
      if (buckets[key]) buckets[key].push(m);
    });
    return SYSTEM_ORDER.map((s) => [s, buckets[s]]);
  }, [confirmed]);
  const statusWeight = { "above range": 4, "below range": 4, "high-normal": 3, "low-normal": 3, "within range": 2 };
  const statusText = (status, systemName, hasMarkers) => {
    if (!hasMarkers) return "Não avaliado";
    if (status === "within range") {
      return systemName === "Hormônios Reprodutivos" ? "Equilibrado" : "Ideal";
    }
    return ({
      "low-normal": "Limite inferior",
      "high-normal": "Acompanhar",
      "below range": "Baixo",
      "above range": "Elevado",
    }[status] || "Ideal");
  };
  const systemCards = useMemo(() => {
    return systemsOverview.map(([systemName, items]) => {
      const dominant = items.reduce((acc, m) => {
        const s = rangeStatus(m).status;
        if (!acc || (statusWeight[s] || 0) > (statusWeight[acc] || 0)) return s;
        return acc;
      }, "within range");
      return { systemName, items, dominant };
    });
  }, [systemsOverview]);
  const keyObservations = useMemo(() => {
    const observations = [];
    const thyroid = confirmed.filter((m) => markerSystem(m.marker) === "Função Tireoidiana");
    if (thyroid.length) {
      const thyroidOut = thyroid.filter((m) => {
        const s = rangeStatus(m).status;
        return s === "below range" || s === "above range";
      }).length;
      observations.push({
        text: thyroidOut
          ? "Marcadores tireoidianos com variação que merece acompanhamento."
          : "Padrão tireoidiano aparentemente estável.",
        icon: "/illustrations/obs-thyroid.png",
      });
    }
    const repro = confirmed.filter((m) => markerSystem(m.marker) === "Hormônios Reprodutivos");
    if (repro.length) observations.push({
      text: "Sinais hormonais reprodutivos presentes, interpretados conforme a fase do ciclo.",
      icon: "/illustrations/obs-hormone.png",
    });
    const ironNutrients = confirmed.filter((m) => markerSystem(m.marker) === "Ferro e Nutrientes");
    if (ironNutrients.some((m) => {
      const s = rangeStatus(m).status;
      return s === "below range" || s === "low-normal";
    })) observations.push({
      text: "Reservas de ferro ou micronutrientes podem merecer acompanhamento mais próximo.",
      icon: "/illustrations/obs-iron.png",
    });
    const metabolic = confirmed.filter((m) => markerSystem(m.marker) === "Saúde Metabólica");
    if (metabolic.length) observations.push({
      text: "Sinais metabólicos trazem contexto além da interpretação hormonal.",
      icon: "/illustrations/obs-hormone.png",
    });
    return observations.slice(0, 3);
  }, [confirmed]);

  useEffect(() => {
    if (!confirmed.length) return;
    let cancelled = false;
    setSummaryState("loading");
    setSummary(null);
    fetch("/api/summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        report_name: reportName,
        markers: confirmed.map((m) => ({
          marker: m.marker,
          value: m.value,
          unit: m.unit,
          reference_range: m.reference_range,
        })),
        context: userContext || null,
      }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("summary unavailable"))))
      .then((data) => {
        if (cancelled) return;
        if (data?.summary?.full_summary?.headline) setSummary(data.summary);
        else setSummary(fallback);
        setSummaryState("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setSummary(fallback);
        setSummaryState("ready");
      });
    return () => { cancelled = true; };
  }, [reportName, confirmed, userContext]);

  if (confirmed.length === 0) {
    return (
      <div className="page results empty">
        <div className="card empty-card">
          <div className="eyebrow">Nenhum exame ainda</div>
          <h1 className="h1">Comece adicionando um laudo laboratorial</h1>
          <p className="sub">Envie ou cole seus resultados para vê-los interpretados pela lente da fisiologia feminina.</p>
          <div style={{marginTop:24}}><button className="btn btn-primary" onClick={onDecodeAnother}>Decifrar um exame</button></div>
        </div>
      </div>
    );
  }

  return (
    <div className="page results">
      <div className="results-head">
        <div>
          <div className="eyebrow">Etapa 3 de 3 · Resultados</div>
          <h1 className="h1">{reportName}</h1>
          <div className="results-meta">
            <span>{date}</span><span className="dot-sep">·</span>
            <span>{confirmed.length} marcadores extraídos</span><span className="dot-sep">·</span>
            <span>{notFound.length} não incluídos neste exame</span>
            {userContext && (userContext.age || userContext.lifeStage || userContext.notes) && (
              <>
                <span className="dot-sep">·</span>
                <span className="results-meta-context">Interpretado com seu contexto</span>
              </>
            )}
          </div>
        </div>
        <div className="results-head-actions">
          <button className="btn btn-ghost small" onClick={onDecodeAnother}>+ Decifrar outro</button>
          <button className="btn btn-primary small" onClick={() => window.print()}>Baixar laudo</button>
        </div>
      </div>

      <section className="section">
        <div className="card snapshot-card">
          <div className="snapshot-main">
            <div className="snapshot-art" aria-hidden="true">
              <img src="/illustrations/snapshot-hero.png" alt="" className="snapshot-art-img"/>
            </div>
            <div className="snapshot-content">
              <div className="summary-eyebrow">Retrato fisiológico</div>
              <h2 className="h2" style={{ marginTop: 2 }}>{fullSummary?.headline || "Retrato fisiológico"}</h2>
              <p className="section-sub">{(womenSummary?.key_points || fullSummary?.key_points || []).slice(0, 2).join(" ")}</p>
              {summaryState === "loading" && <p className="section-sub">Refinando a narrativa fisiológica…</p>}
            </div>
          </div>
          {!!keyObservations.length && (
            <div className="snapshot-observations">
              <div className="summary-eyebrow">Três observações principais</div>
              <div className="obs-grid compact">
                {keyObservations.map((item, i) => (
                  <article key={i} className="obs-pill">
                    <img src={item.icon} alt="" className="obs-icon" aria-hidden="true"/>
                    <p>{item.text}</p>
                  </article>
                ))}
              </div>
            </div>
          )}
          {!!fullSummary?.reassurance && <p className="section-sub snapshot-reassure">{fullSummary.reassurance}</p>}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2 className="h2">Visão por sistemas <span style={{ fontSize: 12, color: "var(--ink-3)" }}>ⓘ</span></h2>
          <p className="section-sub">Marcadores agrupados por fisiologia, não como exames isolados.</p>
        </div>
        <div className="systems-grid compact">
          {systemCards.map(({ systemName, items, dominant }) => {
            const has = items.length > 0;
            const label = statusText(dominant, systemName, has);
            const art = SYSTEM_ART[systemName];
            return (
              <article key={systemName} className={`card system-card compact${has ? "" : " is-empty"}`}>
                <div className="system-meta">
                  <div className="system-title">{systemName}</div>
                  <div className="system-count">{items.length} {items.length === 1 ? "marcador" : "marcadores"}</div>
                  <div className="system-status">
                    <span className={`system-dot s-${(has ? dominant : "not-assessed").replace(/\s+/g, "-")}`}/>
                    {label}
                  </div>
                </div>
                {art && <img src={art} alt="" className="system-art" aria-hidden="true"/>}
              </article>
            );
          })}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <h2 className="h2">Resultados detalhados</h2>
            <p className="section-sub">Cada card é extraído sem alteração e interpretado pela lente da fisiologia feminina.</p>
          </div>
          <div className="view-toggle">
            <button className="toggle-btn is-on" type="button">Cards</button>
            <button className="toggle-btn" type="button">Tabela</button>
          </div>
        </div>
        <div className="marker-grid">
          {visibleConfirmed.map((m, i) => <MarkerCard key={`${m.marker}-${i}`} marker={m} reportName={reportName} />)}
          {(() => {
            const fill = visibleConfirmed.length % 4;
            const span = fill === 0 ? 4 : 4 - fill;
            return (
              <div className="card results-about in-grid" style={{ gridColumn: `span ${span}` }}>
                <div className="results-about-icon" aria-hidden="true">
                  <span className="about-ring"/>
                </div>
                <div>
                  <div className="summary-title" style={{ marginBottom: 4 }}>Sobre estes resultados</div>
                  <p className="section-sub" style={{ margin: 0, maxWidth: "100%" }}>
                    Faixas de referência variam com sexo, idade, fase do ciclo e metodologia do laboratório.
                    Interpretamos seus marcadores pela lente da fisiologia feminina, não por uma faixa única.
                  </p>
                </div>
              </div>
            );
          })()}
        </div>
        {visibleConfirmed.length === 0 && (
          <div className="card" style={{ marginTop: 12, padding: 16, color: "var(--ink-2)" }}>
            Nenhum exame corresponde a este filtro. Mude para “Todos os exames extraídos”.
          </div>
        )}
      </section>

      {notFound.length > 0 && (
        <section className="section">
          <div className="section-head">
            <div>
              <h2 className="h2">Marcadores não avaliados</h2>
              <p className="section-sub">Estes marcadores não foram incluídos no exame. Eles podem adicionar contexto fisiológico que está faltando.</p>
            </div>
            <button className="toggle-btn" type="button">Ver todos</button>
          </div>
          <div className="absent-grid">
            {notFound.map((n) => <AbsentCard key={n} name={n}/>)}
            <div className="absent-card absent-add">+ Adicionar</div>
          </div>
        </section>
      )}

      <section className="section">
        <div className="download-card card">
          <div>
            <div className="download-t">Salve seu laudo: esta é a única cópia</div>
            <div className="download-s">A Decifra não armazena seus valores ou resultados completos. Quando você sair desta página, este laudo desaparece. Baixe agora para guardar uma cópia.</div>
          </div>
          <div className="download-actions">
            <button className="btn btn-ghost" onClick={() => { downloadJSON(reportName, confirmed, notFound); toast.show("Laudo baixado em JSON.", { variant: "success" }); }}>Baixar JSON</button>
            <button className="btn btn-primary" onClick={() => { toast.show("Abrindo caixa de impressão.", { variant: "default", duration: 2500 }); window.print(); }}>Baixar PDF</button>
            <button className="btn btn-ghost" onClick={onDecodeAnother}>Começar novo laudo</button>
          </div>
        </div>
      </section>

      <section className="section">
        <a className="feedback-card" href={feedbackMailto("Página de resultados")}>
          <div className="feedback-card-text">
            <div className="feedback-card-t">Algo parece estranho?</div>
            <div className="feedback-card-s">Conte o que ficou errado, confuso ou faltando. Ainda estamos em beta e lemos cada resposta.</div>
          </div>
          <span className="feedback-card-cta">Enviar feedback &rarr;</span>
        </a>
      </section>

    </div>
  );
}

function downloadJSON(name, confirmed, notFound) {
  const payload = {
    report_name: name,
    generated_at: new Date().toISOString(),
    results: confirmed.map(({ included, ...m }) => m),
    not_found_markers: notFound,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `decifra-${name.replace(/\s+/g, "_")}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------- Report inconsistency ----------
const REPORT_REASONS = [
  "Valor incorreto",
  "Unidade incorreta",
  "Faixa de referência incorreta",
  "Marcador identificado errado",
  "Interpretação parece equivocada",
  "Outro",
];

async function submitReport({ marker, reportName, reason, note }) {
  // Write to Supabase decode_reports table (insert-only via anon key)
  if (sb) {
    const { error } = await sb.from("decode_reports").insert({
      marker:          marker.marker,
      value:           marker.value,
      unit:            marker.unit,
      reference_range: marker.reference_range,
      issue_type:      reason,
      note:            note || null,
      report_name:     reportName || null,
      user_email:      localStorage.getItem("fd:email") || null,
    });
    if (error) throw error;
  }
}

function ReportButton({ marker, reportName }) {
  const [open,   setOpen]   = useState(false);
  const [reason, setReason] = useState("");
  const [note,   setNote]   = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | error
  const toast = useToast();

  const reset = () => { setOpen(false); setReason(""); setNote(""); setStatus("idle"); };

  const submit = async () => {
    if (!reason) return;
    setStatus("loading");
    try {
      await submitReport({ marker, reportName, reason, note });
      reset();
      toast.show("Obrigada. Registramos seu relato e iremos revisar.", { variant: "success" });
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="report-wrap">
      <button
        className={`report-btn ${open ? "active" : ""}`}
        onClick={() => setOpen(!open)}
        title="Relatar problema neste marcador"
      >
        <IcFlag size={12}/> Relatar problema
      </button>

      {open && (
        <div className="report-panel">
          <div className="report-panel-title">O que está errado neste marcador?</div>
          <div className="report-reasons">
            {REPORT_REASONS.map((r) => (
              <button
                key={r}
                className={`report-reason ${reason === r ? "selected" : ""}`}
                onClick={() => setReason(r)}
              >{r}</button>
            ))}
          </div>
          <textarea
            className="report-note"
            placeholder="Mais detalhes (opcional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          {status === "error" && (
            <p style={{ color: "#c0392b", fontSize: "0.72rem", margin: "0.35rem 0 0" }}>
              Não foi possível enviar. Tente novamente.
            </p>
          )}
          <div className="report-actions">
            <button className="report-cancel" onClick={reset}>Cancelar</button>
            <button
              className="report-submit"
              disabled={!reason || status === "loading"}
              onClick={submit}
            >{status === "loading" ? "Enviando…" : "Enviar relato"}</button>
          </div>
        </div>
      )}
    </div>
  );
}

function MarkerCard({ marker, reportName }) {
  const interp = useMemo(() => lookupInterp(marker.marker), [marker.marker]);
  const rs = useMemo(() => rangeStatus(marker), [marker]);
  const conciseInterpretation = useMemo(() => {
    const raw = interp?.measures || marker.female_context || "Contexto de interpretação limitado para este marcador no painel atual.";
    const firstSentence = raw.split(". ")[0]?.trim() || raw;
    const cleaned = firstSentence.endsWith(".") ? firstSentence : `${firstSentence}.`;
    return cleaned.length > 140 ? `${cleaned.slice(0, 137)}...` : cleaned;
  }, [interp, marker.female_context]);

  return (
    <article className="card marker-card">
      <div className="marker-head">
        <div style={{ minWidth: 0, flex: 1 }}><div className="marker-name" style={{ wordBreak: "break-word", overflowWrap: "break-word" }}>{marker.marker}</div></div>
        <StatusBadge status={rs.status} />
      </div>

      <div className="marker-value-row">
        <div className="marker-value"><span className="v">{marker.value}</span><span className="u">{marker.unit}</span></div>
        <div className="marker-range"><div className="range-label">Reference</div><div className="range-v mono">{marker.reference_range} {marker.unit}</div></div>
      </div>

      {rs.pct !== null && (
        <div className="range-bar">
          <div className="range-track">
            <div className="range-norm"/>
            <div className="range-pin" style={{ left: `${8 + rs.pct * 84}%` }}><div className="pin-dot"/></div>
          </div>
          <div className="range-ticks mono">
            <span>{rs.lo}</span><span>{rs.hi}</span>
          </div>
        </div>
      )}

      <div className="marker-block"><div className="block-label">Interpretação</div><div className="block-body concise">{conciseInterpretation}</div></div>

      <div className="marker-footer clean">
        <span className="marker-evidence">Trecho do laudo · confiança: {marker.confidence === "high" ? "alta" : marker.confidence === "medium" ? "média" : marker.confidence === "low" ? "baixa" : marker.confidence}</span>
        <button className="marker-flag" type="button" aria-label="Sinalizar este marcador">⚑</button>
      </div>
    </article>
  );
}

function StatusBadge({ status, compact }) {
  const map = {
    "within range": { label: "Dentro da faixa", cls: "in" },
    "low-normal": { label: "Limite inferior", cls: "warn" },
    "high-normal": { label: "Acompanhar", cls: "warn" },
    "below range": { label: "Baixo", cls: "out" },
    "above range": { label: "Elevado", cls: "out" },
  };
  const s = map[status] || map["within range"];
  return <span className={`badge ${s.cls} ${compact ? "compact" : ""}`}>{s.label}</span>;
}

const ABSENT_SUBTITLES = {
  // Ferro
  FERRITINA: "Estoque de ferro",
  FERRITIN: "Estoque de ferro",
  FERRO: "Estoque de ferro",
  IRON: "Estoque de ferro",
  "FERRO SÉRICO": "Ferro circulante",
  HEMOGLOBINA: "Transporte de oxigênio",
  HEMOGLOBIN: "Transporte de oxigênio",
  HB: "Transporte de oxigênio",
  HAEMOGLOBIN: "Transporte de oxigênio",
  TRANSFERRINA: "Transporte de ferro",
  TRANSFERRIN: "Transporte de ferro",
  TIBC: "Capacidade de ligação do ferro",
  "SATURAÇÃO DE TRANSFERRINA": "Saturação de ferro",

  // Vitaminas
  "VITAMINA D": "Imunidade, humor e ossos",
  "VITAMINA D 25-OH": "Imunidade, humor e ossos",
  "VIT D": "Imunidade, humor e ossos",
  "25-OH VITAMINA D": "Imunidade, humor e ossos",
  "VITAMIN D": "Imunidade, humor e ossos",
  "VITAMIN D 25-OH": "Imunidade, humor e ossos",
  "25-OH VITAMIN D": "Imunidade, humor e ossos",
  "VITAMINA B12": "Energia e sistema nervoso",
  COBALAMINA: "Energia e sistema nervoso",
  "VITAMIN B12": "Energia e sistema nervoso",
  B12: "Energia e sistema nervoso",
  "ÁCIDO FÓLICO": "Hemácias e DNA",
  FOLATO: "Hemácias e DNA",
  FOLATE: "Hemácias e DNA",
  "VITAMINA B6": "Energia e humor",
  "VITAMIN B6": "Energia e humor",
  B6: "Energia e humor",
  "VITAMINA B9": "Hemácias e DNA",

  // Hormônios reprodutivos
  FSH: "Reserva ovariana e ciclo",
  LH: "Ovulação e fase do ciclo",
  AMH: "Reserva ovariana",
  "HORMÔNIO ANTIMÜLLERIANO": "Reserva ovariana",
  "HORMÔNIO ANTI-MULLERIANO": "Reserva ovariana",
  ESTRADIOL: "Principal estrogênio",
  "ESTRADIOL (E2)": "Principal estrogênio",
  OESTRADIOL: "Principal estrogênio",
  PROGESTERONA: "Hormônio lúteo",
  PROGESTERONE: "Hormônio lúteo",
  TESTOSTERONA: "Equilíbrio androgênico",
  "TESTOSTERONA TOTAL": "Equilíbrio androgênico",
  TESTOSTERONE: "Equilíbrio androgênico",
  "TESTOSTERONA LIVRE": "Androgênio biodisponível",
  "FREE TESTOSTERONE": "Androgênio biodisponível",
  SHBG: "Ligação hormonal",
  PROLACTINA: "Hormônio hipofisário",
  PROLACTIN: "Hormônio hipofisário",
  DHEA: "Androgênio adrenal",
  "DHEA-S": "Androgênio adrenal",
  "DHEA SULFATO": "Androgênio adrenal",
  "SULFATO DE DEHIDROEPIANDROSTERONA": "Androgênio adrenal",
  SDHEA: "Androgênio adrenal",
  DHEAS: "Androgênio adrenal",
  "17-OH PROGESTERONA": "Precursor adrenal",
  "17-OH PROGESTERONE": "Precursor adrenal",
  "17 ALFA OH PROGESTERONA": "Precursor adrenal",
  CORTISOL: "Hormônio do estresse",
  "CORTISOL MATINAL": "Hormônio do estresse",

  // Gestação
  HCG: "Hormônio da gravidez",
  "BETA-HCG": "Hormônio da gravidez",
  "BETA HCG": "Hormônio da gravidez",
  "BHCG": "Hormônio da gravidez",

  // Tireoide
  TSH: "Sinal da tireoide",
  "T4 LIVRE": "Hormônio tireoidiano",
  "FREE T4": "Hormônio tireoidiano",
  "T3 LIVRE": "Hormônio tireoidiano ativo",
  "FREE T3": "Hormônio tireoidiano ativo",
  T3: "Hormônio tireoidiano",
  T4: "Hormônio tireoidiano",
  "ANTI-TPO": "Anticorpo tireoidiano",
  "ANTI TPO": "Anticorpo tireoidiano",
  "TPO ANTIBODIES": "Anticorpo tireoidiano",
  "ANTI-TG": "Anticorpo antitireoglobulina",
  "ANTI TG": "Anticorpo antitireoglobulina",
  TIREOGLOBULINA: "Proteína tireoidiana",
  THYROGLOBULIN: "Proteína tireoidiana",

  // Metabólico
  INSULINA: "Função metabólica",
  INSULIN: "Função metabólica",
  "INSULINA DE JEJUM": "Função metabólica de jejum",
  "FASTING INSULIN": "Função metabólica de jejum",
  GLICOSE: "Açúcar no sangue",
  "GLICEMIA DE JEJUM": "Açúcar de jejum",
  GLICEMIA: "Açúcar no sangue",
  GLUCOSE: "Açúcar no sangue",
  "FASTING GLUCOSE": "Açúcar de jejum",
  HBA1C: "Açúcar a longo prazo",
  "HEMOGLOBINA GLICADA": "Açúcar a longo prazo",
  "HEMOGLOBINA GLICOSILADA": "Açúcar a longo prazo",
  "HOMA-IR": "Resistência à insulina",
  HOMA: "Resistência à insulina",

  // Lipídios
  COLESTEROL: "Risco cardiovascular",
  CHOLESTEROL: "Risco cardiovascular",
  "COLESTEROL TOTAL": "Risco cardiovascular",
  "TOTAL CHOLESTEROL": "Risco cardiovascular",
  "LDL COLESTEROL": "Colesterol ruim",
  LDL: "Colesterol ruim",
  "HDL COLESTEROL": "Colesterol bom",
  HDL: "Colesterol bom",
  "VLDL": "Lipoproteína de muito baixa densidade",
  "NÃO HDL": "Colesterol não HDL",
  TRIGLICÉRIDES: "Gorduras no sangue",
  TRIGLICERÍDEOS: "Gorduras no sangue",
  TRIGLYCERIDES: "Gorduras no sangue",
  APOB: "Partículas aterogênicas",
  "APO B": "Partículas aterogênicas",
  "LP(A)": "Risco cardíaco hereditário",
  LIPOPROTEIN: "Risco cardíaco hereditário",

  // Inflamação
  "PCR ULTRASSENSÍVEL": "Inflamação",
  "PCR US": "Inflamação",
  PCR: "Inflamação",
  HSCRP: "Inflamação",
  CRP: "Inflamação",
  VHS: "Inflamação",
  ESR: "Inflamação",
  HOMOCISTEÍNA: "Risco cardiovascular e vit. B",
  HOMOCYSTEINE: "Risco cardiovascular e vit. B",

  // Minerais
  MAGNÉSIO: "Equilíbrio mineral",
  MAGNESIUM: "Equilíbrio mineral",
  ZINCO: "Equilíbrio mineral",
  ZINC: "Equilíbrio mineral",
  CÁLCIO: "Ossos e nervos",
  CALCIUM: "Ossos e nervos",
  FÓSFORO: "Mineral ósseo",
  PHOSPHORUS: "Mineral ósseo",
  PHOSPHATE: "Mineral ósseo",
  SELÊNIO: "Antioxidante mineral",
  SELENIUM: "Antioxidante mineral",
  POTÁSSIO: "Eletrólito",
  POTASSIUM: "Eletrólito",
  SÓDIO: "Eletrólito",
  SODIUM: "Eletrólito",
  CLORO: "Eletrólito",
  CLORETO: "Eletrólito",
  CHLORIDE: "Eletrólito",

  // Hemograma
  LEUCÓCITOS: "Células de defesa",
  WCC: "Células de defesa",
  WBC: "Células de defesa",
  "WHITE BLOOD CELLS": "Células de defesa",
  NEUTRÓFILOS: "Sinal de infecção bacteriana",
  NEUT: "Sinal de infecção bacteriana",
  NEUTROPHILS: "Sinal de infecção bacteriana",
  LINFÓCITOS: "Sinal de infecção viral",
  LYMP: "Sinal de infecção viral",
  LYMPHOCYTES: "Sinal de infecção viral",
  MONÓCITOS: "Marcador de inflamação",
  MONO: "Marcador de inflamação",
  MONOCYTES: "Marcador de inflamação",
  EOSINÓFILOS: "Alergia e parasitas",
  EOSIN: "Alergia e parasitas",
  EOSINOPHILS: "Alergia e parasitas",
  BASÓFILOS: "Marcador alérgico",
  BASO: "Marcador alérgico",
  BASOPHILS: "Marcador alérgico",
  HEMÁCIAS: "Contagem de hemácias",
  ERITRÓCITOS: "Contagem de hemácias",
  RCC: "Contagem de hemácias",
  RBC: "Contagem de hemácias",
  HEMATÓCRITO: "Proporção de hemácias",
  HCT: "Proporção de hemácias",
  HAEMATOCRIT: "Proporção de hemácias",
  HEMATOCRIT: "Proporção de hemácias",
  VCM: "Tamanho das hemácias",
  MCV: "Tamanho das hemácias",
  HCM: "Hemoglobina por hemácia",
  MCH: "Hemoglobina por hemácia",
  CHCM: "Concentração de hemoglobina",
  MCHC: "Concentração de hemoglobina",
  RDW: "Variação de tamanho das hemácias",
  PLAQUETAS: "Células de coagulação",
  PLT: "Células de coagulação",
  PLAT: "Células de coagulação",
  PLATELETS: "Células de coagulação",

  // Fígado
  ALT: "Enzima hepática",
  TGP: "Enzima hepática",
  AST: "Enzima hepática",
  TGO: "Enzima hepática",
  "FOSFATASE ALCALINA": "Fígado e ossos",
  ALP: "Fígado e ossos",
  "GAMA GT": "Enzima hepática",
  "GAMA-GT": "Enzima hepática",
  GGT: "Enzima hepática",
  BILIRRUBINA: "Função hepática",
  BILIRUBIN: "Função hepática",
  ALBUMINA: "Proteína hepática",
  ALBUMIN: "Proteína hepática",
  "PROTEÍNAS TOTAIS": "Proteína total",

  // Rim
  CREATININA: "Função renal",
  CREATININE: "Função renal",
  UREIA: "Função renal",
  UREA: "Função renal",
  EGFR: "Filtração renal",
  "TAXA DE FILTRAÇÃO GLOMERULAR": "Filtração renal",
  "ÁCIDO ÚRICO": "Inflamação e rim",
  "URIC ACID": "Inflamação e rim",

  // Autoimune e marcadores tumorais
  FAN: "Marcador autoimune",
  ANA: "Marcador autoimune",
  "ANTI-DSDNA": "Anticorpo de lúpus",
  "CA-125": "Inflamação ovariana",
  "CA 125": "Inflamação ovariana",
  CA125: "Inflamação ovariana",

  // Especialidades
  "ÍNDICE ÔMEGA-3": "Ácidos graxos essenciais",
  "OMEGA-3 INDEX": "Ácidos graxos essenciais",
  "VITAMINA A": "Visão e imunidade",
  "VITAMINA E": "Antioxidante",
  "VITAMINA K": "Coagulação e ossos",
  COBRE: "Mineral traço",
  COPPER: "Mineral traço",
  IODO: "Mineral da tireoide",
  IODINE: "Mineral da tireoide",
};
function absentSubtitle(name) {
  return ABSENT_SUBTITLES[String(name || "").toUpperCase().trim()] || "Não avaliado";
}
const ABSENT_ART = {
  FERRITIN: "/illustrations/chip-ferritin.png",
  IRON: "/illustrations/chip-ferritin.png",
  "VITAMIN D": "/illustrations/chip-vitd.png",
  "VITAMIN D 25-OH": "/illustrations/chip-vitd.png",
  "VIT D": "/illustrations/chip-vitd.png",
  FSH: "/illustrations/chip-fsh.png",
  LH: "/illustrations/chip-lh.png",
  "VITAMIN B12": "/illustrations/chip-b12.png",
  B12: "/illustrations/chip-b12.png",
  FOLATE: "/illustrations/chip-folate.png",
  AMH: "/illustrations/chip-amh.png",
  PROLACTIN: "/illustrations/chip-prolactin.png",
  DHEA: "/illustrations/chip-dhea.png",
  "DHEA-S": "/illustrations/chip-dhea.png",
  DHEAS: "/illustrations/chip-dhea.png",
  INSULIN: "/illustrations/chip-insulin.png",
  GLUCOSE: "/illustrations/chip-glucose.png",
  "FASTING GLUCOSE": "/illustrations/chip-glucose.png",
  "FASTING INSULIN": "/illustrations/chip-insulin.png",
};
function absentArt(name) {
  return ABSENT_ART[String(name || "").toUpperCase().trim()] || null;
}
function AbsentCard({ name }) {
  const art = absentArt(name);
  return (
    <div className="absent-card">
      <span className="absent-icon" aria-hidden="true">
        {art ? <img src={art} alt=""/> : <span className="absent-icon-ring"/>}
      </span>
      <div className="absent-text">
        <div className="absent-name">{name}</div>
        <div className="absent-sub">{absentSubtitle(name)}</div>
      </div>
    </div>
  );
}

// ---------- Markers page ----------
// ---------- Clinical panels data ----------
const CLINICAL_PANELS = [
  {
    id: "fertile", icon: "🌸", label: "Anos férteis", ages: "18 a 40",
    summary: "Saúde do ciclo, energia, humor, cabelo, imunidade.",
    context: "Os achados mais comuns em mulheres em idade reprodutiva são deficiência de ferro (ferritina baixa bem antes da hemoglobina cair), disfunção tireoidiana subclínica, deficiência de vitamina D e insuficiência de progesterona na fase lútea. Esses quatro sozinhos explicam a maioria dos casos de TPM, fadiga, queda de cabelo e irregularidade do ciclo. Painéis padrão frequentemente não incluem ferritina, T3 livre e Anti-TPO.",
    markers: ["TSH", "FREE T4", "FREE T3", "ANTI-TPO", "FERRITIN", "IRON", "HEMOGLOBIN", "VITAMIN D", "VITAMIN B12", "FOLATE", "MAGNESIUM", "ZINC", "ESTRADIOL", "PROGESTERONE", "FSH", "LH", "PROLACTIN", "HSCRP"],
    watch: [
      "Ferritina abaixo de 50 ng/mL pode causar queda de cabelo mesmo com hemoglobina ainda normal",
      "TSH entre 2,5 e 4,0 mUI/L pode ser sintomático para muitas mulheres, ainda que tecnicamente 'dentro da faixa'",
      "Progesterona no dia 21 abaixo de 3 ng/mL sugere ciclo anovulatório",
      "Anti-TPO positivo com TSH normal pode indicar Hashimoto em fase inicial. Vale acompanhar a cada 6 a 12 meses",
    ],
    missing: "Anti-TPO, T3 livre, Magnésio, Zinco e Insulina em jejum. Raramente pedidos, mas frequentemente relevantes.",
    color: "#8B1A4A",
  },
  {
    id: "pcos", icon: "⚡", label: "SOP", ages: "Qualquer idade reprodutiva",
    summary: "Excesso de andrógenos, resistência à insulina, ciclos irregulares, anovulação.",
    context: "A SOP (Síndrome dos Ovários Policísticos) é o distúrbio endócrino mais comum em mulheres em idade reprodutiva, afetando de 8 a 13% globalmente. Os critérios diagnósticos exigem dois de três: ciclos irregulares, hiperandrogenismo clínico ou bioquímico, e morfologia ovariana policística. Importante: 70 a 80% das mulheres com SOP têm resistência à insulina, mesmo as magras. Os marcadores metabólicos (insulina em jejum, HOMA-IR, razão triglicérides/HDL) são tão importantes quanto o painel hormonal, mas são os mais frequentemente omitidos dos exames padrão.",
    markers: ["LH", "FSH", "AMH", "TESTOSTERONE", "SHBG", "DHEA-S", "PROLACTIN", "FASTING GLUCOSE", "FASTING INSULIN", "HOMA-IR", "HBA1C", "TRIGLYCERIDES", "HDL", "HSCRP", "VITAMIN D", "TSH", "ANTI-TPO"],
    watch: [
      "Razão LH/FSH maior que 2:1 nos dias 2 a 4 do ciclo apoia a hipótese de SOP",
      "HAM acima de 4 a 5 ng/mL está fortemente associado à SOP, não apenas a reserva ovariana alta",
      "SHBG baixa amplifica a testosterona livre mesmo quando a testosterona total está no limite",
      "Insulina em jejum acima de 10 a 12 µUI/mL com glicose normal costuma ser o sinal metabólico mais precoce",
      "Razão triglicérides/HDL acima de 2,5 é um forte indício de resistência à insulina",
    ],
    missing: "Insulina em jejum e HOMA-IR quase nunca entram nos painéis padrão, mas são os marcadores metabólicos clinicamente mais importantes na SOP.",
    color: "#6B2E6B",
  },
  {
    id: "endo", icon: "🔴", label: "Endometriose", ages: "Idade reprodutiva ao climatério",
    summary: "Dor pélvica crônica, dismenorreia, inflamação, subfertilidade.",
    context: "A endometriose afeta 1 em cada 10 mulheres e leva em média de 7 a 10 anos para ser identificada. É primariamente uma doença de inflamação dirigida por estrogênio. Não existe exame de sangue definitivo, a confirmação é cirúrgica, mas um padrão de PCR-us elevada, ferritina baixa (por sangramento intenso), CA-125 elevado e vitamina D baixa é clinicamente sugestivo. A endometriose costuma coexistir com adenomiose, SOP e doença tireoidiana autoimune.",
    markers: ["CA-125", "HSCRP", "FERRITIN", "HEMOGLOBIN", "MCV", "ESTRADIOL", "PROGESTERONE", "VITAMIN D", "OMEGA-3 INDEX", "MAGNESIUM", "TSH", "ANTI-TPO"],
    watch: [
      "CA-125 acima de 35 U/mL em mulher sintomática merece investigação adicional. CA-125 normal, porém, não exclui endometriose.",
      "Anemia ferropriva por sangramento menstrual intenso é extremamente comum. A ferritina é o marcador precoce.",
      "Deficiência de progesterona (fase lútea baixa) é comum e pode piorar o crescimento das lesões endometriais",
      "Vitamina D baixa está significativamente associada à gravidade da endometriose",
    ],
    missing: "CA-125, PCR-us e Índice de Ômega-3 raramente entram nos painéis padrão, mas são diretamente relevantes para o acompanhamento da endometriose.",
    color: "#B0552B",
  },
  {
    id: "fertility", icon: "🥚", label: "Investigação de fertilidade", ages: "Geralmente 25 a 42",
    summary: "Reserva ovariana, confirmação de ovulação, ligação tireoide e fertilidade.",
    context: "A investigação de fertilidade feminina apoia-se em quatro pilares: reserva ovariana (HAM, FSH no dia 3), ovulação (progesterona no dia 21), fatores estruturais (ultrassonografia) e fatores sistêmicos (tireoide, vitamina D, imunidade). O HAM é hoje o marcador padrão-ouro de reserva ovariana e não depende da fase do ciclo. A disfunção tireoidiana é a causa reversível mais comum de infertilidade ovulatória. Vale solicitar Anti-TPO em toda mulher com dificuldade para engravidar, independentemente do TSH.",
    markers: ["AMH", "FSH", "ESTRADIOL", "LH", "PROGESTERONE", "PROLACTIN", "TSH", "FREE T4", "ANTI-TPO", "VITAMIN D", "FOLATE", "VITAMIN B12", "HOMOCYSTEINE", "HSCRP", "FASTING GLUCOSE", "FASTING INSULIN"],
    watch: [
      "HAM abaixo de 1,0 ng/mL sugere reserva ovariana diminuída. Abaixo de 0,5 ng/mL é significativamente reduzida.",
      "FSH no dia 3 acima de 10 mUI/mL sugere reserva diminuída. Acima de 15 mUI/mL é clinicamente significativo.",
      "Progesterona no dia 21 abaixo de 3 ng/mL costuma indicar ciclo anovulatório. Acima de 10 ng/mL sugere ovulação robusta.",
      "TSH acima de 2,5 mUI/mL em mulheres tentando engravidar: considere otimizar a função tireoidiana",
      "Anti-TPO positivo está associado a menor sucesso na FIV e maior risco de perda gestacional, mesmo com TSH normal",
      "Vitamina D abaixo de 30 ng/mL associa-se a piores resultados na FIV e a perda gestacional precoce",
    ],
    missing: "Anti-TPO, Homocisteína e Insulina em jejum são frequentemente omitidos, mas diretamente relevantes para o resultado da fertilidade.",
    color: "#2E5D4F",
  },
  {
    id: "peri", icon: "🌊", label: "Climatério", ages: "Geralmente 40 a 52",
    summary: "Variabilidade hormonal, sintomas vasomotores, mudança metabólica, risco ósseo e cardiovascular.",
    context: "O climatério é definido pela função ovariana variável antes da última menstruação, e pode durar de 4 a 10 anos. O FSH torna-se o marcador inicial mais confiável, subindo e oscilando acima de 10 mUI/mL. O estradiol oscila de forma errática antes de cair. O desafio clínico é que painéis padrão podem parecer 'normais' em muitos dias. O padrão e a tendência importam mais do que medições isoladas. O risco metabólico (resistência à insulina, dislipidemia, inflamação) sobe acentuadamente nessa fase, mesmo sem ganho de peso.",
    markers: ["FSH", "ESTRADIOL", "LH", "AMH", "PROGESTERONE", "TSH", "FREE T4", "ANTI-TPO", "TESTOSTERONE", "SHBG", "CORTISOL", "VITAMIN D", "CALCIUM", "ALP", "TOTAL CHOLESTEROL", "LDL", "HDL", "TRIGLYCERIDES", "HBA1C", "HSCRP", "HOMOCYSTEINE", "FERRITIN", "VITAMIN B12", "MAGNESIUM"],
    watch: [
      "FSH acima de 10 mUI/mL em dois exames separados (idealmente nos dias 2 a 5 do ciclo) sugere climatério",
      "HAM próximo de zero ou indetectável indica climatério tardio, anos finais antes da menopausa",
      "Oscilações de estradiol (muito alto em alguns exames, baixo em outros) são características do climatério e não indicam estrogênio 'normal'",
      "LDL sobe significativamente nos anos ao redor da última menstruação. A avaliação de risco cardiovascular é essencial.",
      "Glicose em jejum ou triglicérides em alta com HDL em queda costumam indicar síndrome metabólica emergente",
    ],
    missing: "Homocisteína, PCR-us e perfil lipídico completo são frequentemente omitidos no rastreio do climatério, mas diretamente relevantes para o risco cardiovascular.",
    color: "#1F3A5F",
  },
  {
    id: "meno", icon: "🌙", label: "Menopausa", ages: "Geralmente 51 anos ou mais",
    summary: "Deficiência de estrogênio, cardiovascular, densidade óssea, cognição, metabolismo.",
    context: "A menopausa é confirmada após 12 meses consecutivos de amenorreia. Na ausência de terapia de reposição hormonal, o estrogênio cai a níveis muito baixos e as consequências sistêmicas são amplas: perda óssea acelerada, aumento acentuado de LDL, aumento da adiposidade visceral e risco cardiovascular elevado. FSH acima de 40 mUI/mL com estradiol abaixo de 20 pg/mL é o padrão laboratorial da menopausa. A testosterona também declina (já vinha caindo no climatério), contribuindo para queda de energia, libido e massa magra.",
    markers: ["FSH", "ESTRADIOL", "LH", "TESTOSTERONE", "SHBG", "TSH", "FREE T4", "VITAMIN D", "CALCIUM", "ALP", "PHOSPHORUS", "TOTAL CHOLESTEROL", "LDL", "HDL", "TRIGLYCERIDES", "HBA1C", "FASTING GLUCOSE", "HSCRP", "HOMOCYSTEINE", "CORTISOL", "VITAMIN B12", "MAGNESIUM"],
    watch: [
      "FSH acima de 40 mUI/mL com estradiol abaixo de 20 pg/mL é o padrão laboratorial consistente com menopausa",
      "Aumento de LDL de 10 a 15% é comum nos 2 a 3 anos após a última menstruação",
      "Vitamina D abaixo de 50 ng/mL (125 nmol/L) acelera a perda óssea. Otimizar a vitamina D é primeira linha de proteção óssea.",
      "Triglicérides costumam subir na menopausa mesmo sem mudança alimentar. O estrogênio normalmente reduz a produção hepática de VLDL.",
      "Homocisteína elevada com B12 ou folato baixos é fator independente de risco cardiovascular que sobe na menopausa",
    ],
    missing: "Homocisteína, FA (fosfatase alcalina específica óssea) e perfil lipídico completo são frequentemente omitidos, mas essenciais para o acompanhamento da saúde na menopausa.",
    color: "#4A1A4A",
  },
];

function MarkersPage() {
  const [q, setQ]           = useState("");
  const [tab, setTab]       = useState("phases"); // "phases" | "library"
  const [openPanel, setOpenPanel] = useState(null);

  const groups = {
    "Tireoide": ["TSH", "FREE T4", "FREE T3", "ANTI-TPO", "ANTI-TG", "REVERSE T3"],
    "Hormônios reprodutivos": ["ESTRADIOL", "PROGESTERONE", "FSH", "LH", "AMH", "PROLACTIN"],
    "Andrógenos": ["TESTOSTERONE", "SHBG", "DHEA-S"],
    "Metabolismo": ["HBA1C", "FASTING GLUCOSE", "FASTING INSULIN", "HOMA-IR", "TOTAL CHOLESTEROL", "LDL", "HDL", "TRIGLYCERIDES"],
    "Inflamação": ["HSCRP", "CRP"],
    "Ferro e hematologia": ["FERRITIN", "IRON", "HEMOGLOBIN", "HAEMATOCRIT", "MCV"],
    "Vitaminas e minerais": ["VITAMIN D", "VITAMIN B12", "FOLATE", "VITAMIN B6", "MAGNESIUM", "ZINC", "CALCIUM", "SELENIUM"],
    "Saúde óssea": ["ALP", "PHOSPHORUS"],
    "Específicos reprodutivos": ["CA-125", "HOMOCYSTEINE", "OMEGA-3 INDEX"],
    "Estresse": ["CORTISOL"],
  };

  const filter = (n) => !q || n.toLowerCase().includes(q.toLowerCase()) ||
    (INTERPRETATIONS[n]?.measures || "").toLowerCase().includes(q.toLowerCase()) ||
    (INTERPRETATIONS[n]?.female_context || "").toLowerCase().includes(q.toLowerCase());

  return (
    <div className="page markers-page">
      <div className="page-head">
        <div className="eyebrow">Referência clínica</div>
        <h1 className="h1">Guia de marcadores</h1>
        <p className="sub">O que cada marcador mede, o que significa para mulheres em diferentes fases da vida, e quais condições ajuda a identificar. Este guia não mostra seus valores. Veja seus valores em <b>Resultados</b>.</p>

        {/* Tab selector */}
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "1.25rem" }}>
          {[["phases", "Por fase da vida e condição"], ["library", "Biblioteca completa de marcadores"]].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{
              padding: "0.45rem 1rem", borderRadius: "999px", fontSize: "0.85rem", fontWeight: 600,
              background: tab === id ? "var(--primary)" : "transparent",
              color: tab === id ? "#fff" : "var(--ink-2)",
              border: tab === id ? "none" : "1.5px solid var(--border)",
              cursor: "pointer",
            }}>{label}</button>
          ))}
        </div>
      </div>

      {/* ── Phases & Conditions tab ── */}
      {tab === "phases" && (
        <div>
          <p style={{ color: "var(--ink-2)", fontSize: "0.9rem", lineHeight: 1.65, marginBottom: "2rem", maxWidth: "680px" }}>
            O mesmo marcador conta uma história clínica diferente aos 25, aos 42 e aos 55. Abaixo estão os seis contextos clínicos mais importantes na saúde da mulher, cada um com os marcadores que mais importam, o que observar, e o que costuma faltar nos painéis padrão.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {CLINICAL_PANELS.map((panel) => {
              const isOpen = openPanel === panel.id;
              return (
                <div key={panel.id} className="card" style={{ padding: 0, overflow: "hidden" }}>
                  {/* Header */}
                  <button
                    onClick={() => setOpenPanel(isOpen ? null : panel.id)}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", gap: "1rem",
                      padding: "1.25rem 1.5rem", background: "none", border: "none", cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    {(() => { const PanelIc = PANEL_ICONS[panel.id]; return PanelIc ? <PanelIc size={28} color={panel.color}/> : null; })()}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
                        <span style={{ fontFamily: "var(--serif)", fontSize: "1.1rem", fontWeight: 600, color: "var(--ink)" }}>{panel.label}</span>
                        <span style={{ fontSize: "0.72rem", color: "var(--ink-3)", fontFamily: "var(--mono)", letterSpacing: "0.05em" }}>{panel.ages}</span>
                      </div>
                      <div style={{ fontSize: "0.85rem", color: "var(--ink-2)", marginTop: "0.15rem" }}>{panel.summary}</div>
                    </div>
                    {isOpen ? <IcChevronUp size={20} color={panel.color}/> : <IcChevronDown size={20} color={panel.color}/>}
                  </button>

                  {/* Expanded content */}
                  {isOpen && (
                    <div style={{ padding: "0 1.5rem 1.5rem", borderTop: "1px solid var(--border)" }}>
                      <p style={{ color: "var(--ink-2)", fontSize: "0.875rem", lineHeight: 1.7, margin: "1rem 0 1.25rem" }}>
                        {panel.context}
                      </p>

                      {/* Key markers */}
                      <div style={{ marginBottom: "1.25rem" }}>
                        <div style={{ fontFamily: "var(--mono)", fontSize: "0.7rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: "0.6rem" }}>
                          Marcadores principais desta fase
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                          {panel.markers.map((m) => (
                            <span key={m} style={{
                              background: `${panel.color}12`, border: `1px solid ${panel.color}30`,
                              color: panel.color, borderRadius: "999px",
                              fontSize: "0.72rem", fontWeight: 600, fontFamily: "var(--mono)",
                              padding: "0.2rem 0.6rem", letterSpacing: "0.03em",
                            }}>{m}</span>
                          ))}
                        </div>
                      </div>

                      {/* What to watch */}
                      <div style={{ marginBottom: "1.25rem" }}>
                        <div style={{ fontFamily: "var(--mono)", fontSize: "0.7rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: "0.6rem" }}>
                          O que observar
                        </div>
                        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                          {panel.watch.map((w) => (
                            <li key={w} style={{ display: "flex", gap: "0.55rem", fontSize: "0.83rem", color: "var(--ink-2)", lineHeight: 1.55, alignItems: "flex-start" }}>
                              <span style={{ marginTop: "3px", flexShrink: 0 }}><IcArrowRight size={13} color={panel.color}/></span>
                              <span>{w}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* What's missing */}
                      <div style={{
                        background: "#fffbf0", border: "1px solid #f0e0a0", borderRadius: "0.6rem",
                        padding: "0.75rem 1rem", fontSize: "0.82rem", color: "#7a5a00",
                        display: "flex", gap: "0.6rem", alignItems: "flex-start",
                      }}>
                        <span style={{ flexShrink: 0, fontWeight: 700 }}>⚠</span>
                        <div>
                          <b>Frequentemente ausente dos painéis padrão:</b> {panel.missing}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Library tab ── */}
      {tab === "library" && (
        <div>
          <input
            className="text-input search"
            placeholder="Buscar entre mais de 45 marcadores…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ marginBottom: "1.5rem" }}
          />
          {Object.entries(groups).map(([group, names]) => {
            const visible = names.filter(filter);
            if (!visible.length) return null;
            return (
              <section key={group} className="marker-group">
                <h2 className="h2">{group}</h2>
                <div className="marker-ref-grid">
                  {visible.map((n) => {
                    const info = INTERPRETATIONS[n];
                    if (!info) return null;
                    return (
                      <div key={n} className="card ref-card">
                        <div className="ref-name">{n}</div>
                        <div className="ref-measures">{info.measures}</div>
                        {info.female_context && <div className="ref-ctx"><span className="ref-ctx-l">Contexto feminino</span>{info.female_context}</div>}
                        {info.low && <div style={{ marginTop: "0.5rem", fontSize: "0.78rem" }}><span style={{ color: "#1F3A5F", fontWeight: 600 }}>Baixo: </span><span style={{ color: "var(--ink-2)" }}>{info.low}</span></div>}
                        {info.high && <div style={{ marginTop: "0.3rem", fontSize: "0.78rem" }}><span style={{ color: "#8B1A4A", fontWeight: 600 }}>Alto: </span><span style={{ color: "var(--ink-2)" }}>{info.high}</span></div>}
                        {info.evidence && <div className="ref-evidence" style={{ marginTop: "0.5rem" }}>Força da evidência: <b>{info.evidence}</b></div>}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------- Science page ----------
function SciencePage() {
  return (
    <div className="page science-page">
      <div className="page-head">
        <div className="eyebrow">Método · Transparência</div>
        <h1 className="h1">Como a Decifra funciona</h1>
        <p className="sub">O que a tecnologia faz, o que ela não pode fazer, e onde estão os limites.</p>
      </div>

      <div className="science-grid">

        <article className="card science-card wide">
          <div className="science-num">01</div>
          <div className="science-icon" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><rect x="4" y="6" width="20" height="16" rx="2" stroke="var(--primary)" strokeWidth="1.5"/><path d="M8 10h12M8 14h8M8 18h5" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round"/><circle cx="22" cy="8" r="4" fill="var(--surface)" stroke="var(--primary)" strokeWidth="1.5"/><path d="M20.5 8l1 1 2-2" stroke="var(--primary)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <details className="science-details" open>
            <summary className="h3">Passo 1: Extração</summary>
            <p>Quando você envia ou cola um laudo laboratorial, o texto é processado por um motor de extração com IA em servidor seguro. Suas credenciais de API nunca chegam ao navegador. O motor lê cada biomarcador presente no texto e devolve os valores literalmente. Nada é arredondado, estimado ou inferido.</p>
            <p className="small" style={{marginTop:8}}>Cada resultado extraído inclui o trecho original do texto de onde foi lido. Você pode conferir cada valor contra o seu laudo de origem antes de a interpretação começar.</p>
          </details>
        </article>

        <article className="card science-card">
          <div className="science-num">02</div>
          <div className="science-icon" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M14 4l8 3v7c0 5-3.5 8.5-8 10C6 22 3 18.5 3 14V7l8-3h3z" stroke="var(--primary)" strokeWidth="1.5" strokeLinejoin="round"/><path d="M9.5 14l3 3 6-6" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <details className="science-details" open>
            <summary className="h3">Confiabilidade desenhada</summary>
            <p>O pipeline de extração foi construído com redundância. Se o serviço primário de IA estiver temporariamente indisponível, uma camada de regras consegue ler marcadores comuns do seu texto. Em qualquer cenário, a mesma garantia vale: só são reportados valores explicitamente legíveis no seu texto.</p>
          </details>
        </article>

        <article className="card science-card">
          <div className="science-num">03</div>
          <div className="science-icon" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><rect x="5" y="5" width="18" height="18" rx="2" stroke="var(--primary)" strokeWidth="1.5"/><path d="M9 14l3 3 7-7" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <details className="science-details" open>
            <summary className="h3">Passo 2: Você revisa</summary>
            <p>Antes de qualquer interpretação aparecer, cada linha extraída entra em uma tabela de revisão. Cada linha é somente leitura. Você pode incluir ou excluir. O trecho-fonte do texto aparece ao lado de cada valor para você confirmar o que foi lido.</p>
            <p className="small" style={{marginTop:8}}>Nada é interpretado até você confirmar a extração.</p>
          </details>
        </article>

        <article className="card science-card">
          <div className="science-num">04</div>
          <div className="science-icon" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><circle cx="14" cy="14" r="9" stroke="var(--primary)" strokeWidth="1.5"/><path d="M14 10v5l3 2" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="14" cy="10" r="1" fill="var(--primary)"/></svg>
          </div>
          <details className="science-details" open>
            <summary className="h3">Passo 3: Interpretação</summary>
            <p>Cada marcador confirmado recebe contexto clínico estruturado: o que mede, por que importa especificamente para mulheres ao longo da vida (ciclo, fertilidade, climatério, menopausa), e o que valores fora da faixa costumam representar.</p>
            <p className="small" style={{marginTop:8}}>Nenhum diagnóstico é gerado. Nenhuma conclusão é tirada. Apenas contexto, escrito com cuidado para ser preciso, sem alarmismo, e focado na fisiologia feminina.</p>
          </details>
        </article>

        <article className="card science-card">
          <div className="science-num">05</div>
          <div className="science-icon" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M5 20l5-8 4 5 3-4 6 7" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="5" cy="20" r="1.5" fill="var(--primary)"/><circle cx="10" cy="12" r="1.5" fill="var(--primary)"/><circle cx="14" cy="17" r="1.5" fill="var(--primary)"/><circle cx="17" cy="13" r="1.5" fill="var(--primary)"/><circle cx="23" cy="20" r="1.5" fill="var(--primary)"/></svg>
          </div>
          <details className="science-details" open>
            <summary className="h3">Confiança</summary>
            <ul className="science-list">
              <li><b>Alta:</b> marcador, valor, unidade e faixa de referência todos claramente presentes no seu laudo.</li>
              <li><b>Média:</b> marcador e valor inequívocos. Unidade ou formatação da faixa um pouco imperfeitas.</li>
              <li><b>Baixa:</b> o texto está parcialmente degradado mas o valor ainda é legível diretamente.</li>
            </ul>
          </details>
        </article>

        <article className="card science-card">
          <div className="science-num">06</div>
          <div className="science-icon" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><circle cx="14" cy="14" r="9" stroke="var(--primary)" strokeWidth="1.5"/><path d="M10 10l8 8M18 10l-8 8" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </div>
          <details className="science-details" open>
            <summary className="h3">Quatro coisas que o sistema não faz</summary>
            <ul className="science-list">
              <li>Inventar um marcador que não está no seu laudo.</li>
              <li>Arredondar, modificar ou converter qualquer valor.</li>
              <li>Levar dados entre sessões ou entre laudos diferentes.</li>
              <li>Diagnosticar, sugerir um diagnóstico ou tirar conclusões clínicas.</li>
            </ul>
          </details>
        </article>

        <article className="card science-card wide">
          <div className="science-num">07</div>
          <div className="science-icon" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M14 5v2M14 21v2M5 14H3M25 14h-2M7.75 7.75l-1.4-1.4M21.65 21.65l-1.4-1.4M7.75 20.25l-1.4 1.4M21.65 6.35l-1.4 1.4" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round"/><circle cx="14" cy="14" r="5" stroke="var(--primary)" strokeWidth="1.5"/></svg>
          </div>
          <details className="science-details" open>
            <summary className="h3">Limites</summary>
            <p><b>A Decifra é uma interface educacional. Não é um dispositivo médico, não é uma ferramenta diagnóstica e não substitui consulta com profissional habilitado pelo CFM/CRM.</b></p>
            <ul className="science-list" style={{marginTop:8}}>
              <li>A precisão da extração depende da qualidade do texto-fonte. Um PDF limpo e estruturado gera resultados de alta confiança. Uma foto de baixa resolução ou um laudo manuscrito, talvez não.</li>
              <li>As faixas de referência vêm diretamente do seu laudo. Refletem os limites do seu laboratório. A Decifra não define nem altera essas faixas.</li>
              <li>O contexto clínico reflete a literatura publicada para mulheres em geral. Não considera seu histórico individual, suas medicações ou comorbidades.</li>
              <li>Qualquer valor fora da faixa ou inesperado deve ser conversado com profissional qualificado antes de qualquer ação.</li>
            </ul>
          </details>
        </article>

      </div>
    </div>
  );
}

// ---------- Device carousel with dot navigation ----------
function DeviceCarousel({ label, screens, Phone }) {
  const [active, setActive] = React.useState(0);
  const labels = { home: "Início", upload: "Enviar", results: "Resultados", marker: "Detalhe do marcador" };
  return (
    <div>
      <div className="device-group-h">{label}</div>
      <div className="device-carousel">
        <Phone screen={screens[active]} />
        <div className="device-dot-row">
          {screens.map((s, i) => (
            <button
              key={s}
              className={`device-dot${i === active ? " active" : ""}`}
              onClick={() => setActive(i)}
              aria-label={labels[s]}
            />
          ))}
        </div>
        <div className="device-dot-label">{labels[screens[active]]}</div>
      </div>
    </div>
  );
}

// ---------- Mobile page ----------
function MobilePage() {
  const screens = ["home", "upload", "results", "marker"];
  return (
    <div className="page mobile-page">
      <div className="page-head">
        <div className="eyebrow">Em breve · Android e iOS</div>
        <h1 className="h1">Decifra no celular</h1>
        <p className="sub">A mesma extração rigorosa e o mesmo contexto clínico, desenhados para usar com uma mão só no celular. Apps nativos em desenvolvimento.</p>
      </div>

      <div className="device-lab">
        <DeviceCarousel label="Android · Material 3" screens={screens} Phone={AndroidPhone} />
        <DeviceCarousel label="iOS · Nativo"          screens={screens} Phone={IOSPhone}     />
      </div>

      <div className="mobile-pwa-strip">
        <div className="mobile-pwa-icon" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 2v9M10 2l-3 3M10 2l3 3" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M4 12v4a1 1 0 001 1h10a1 1 0 001-1v-4" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round"/></svg>
        </div>
        <p className="mobile-pwa-text">
          Já está no celular? Abra <a href="https://decifra.com.br" style={{ color: "var(--primary)", fontWeight: 500 }}>decifra.com.br</a> no Safari ou Chrome e adicione à Tela de Início. Mesmo motor, sem precisar de loja de aplicativos.
        </p>
      </div>
    </div>
  );
}

// ---------- iOS screens ----------
function IOSPhone({ screen }) {
  return (
    <div className="device-frame">
      <IOSDevice width={340} height={720}>
        <IOSScreen screen={screen}/>
      </IOSDevice>
      <div className="device-label">{({home:"Home",upload:"Upload",results:"Results",marker:"Marker detail"})[screen]}</div>
    </div>
  );
}

function IOSScreen({ screen }) {
  const c = { primary: "#8B1A4A", ink: "#1E1E24", ink2: "#4A4A55", ink3: "#7A7A85", bg: "#FAF7F6", border: "#EAEAEA", serif: "'Playfair Display', Georgia, serif" };
  const wrap = { paddingTop: 56, height: "100%", background: c.bg, fontFamily: "-apple-system, Inter, system-ui", position: "relative", overflow: "hidden" };

  if (screen === "home") {
    return (
      <div style={wrap}>
        <div style={{padding: "24px 20px 16px"}}>
          <div style={{fontFamily:"ui-monospace, Menlo, monospace", fontSize:10, letterSpacing:"0.16em", textTransform:"uppercase", color:c.primary}}>Clinical intelligence</div>
          <div style={{fontFamily:c.serif, fontWeight:500, fontSize:30, lineHeight:1.05, color:c.ink, marginTop:8, letterSpacing:"-0.02em"}}>Your labs,<br/><em style={{color:c.primary, fontStyle:"italic"}}>decoded</em> for her.</div>
          <div style={{marginTop:12, fontSize:13, color:c.ink2, lineHeight:1.45}}>Strict extraction. We show only what&rsquo;s in your report.</div>
        </div>
        <div style={{padding:"0 16px 16px"}}>
          <div style={{background:c.primary, color:"#fff", padding:"14px 16px", borderRadius:12, fontSize:15, fontWeight:500, textAlign:"center"}}>Decode a report</div>
          <div style={{marginTop:8, background:"#fff", border:`1px solid ${c.border}`, padding:"14px 16px", borderRadius:12, fontSize:14, color:c.ink, textAlign:"center"}}>Try sample</div>
        </div>
        <div style={{padding:"0 16px"}}>
          <div style={{fontFamily:"ui-monospace, Menlo, monospace", fontSize:9, letterSpacing:"0.14em", textTransform:"uppercase", color:c.ink3, marginBottom:8}}>Recent</div>
          {[{n:"April 2026 routine bloods", s:"10 markers"},{n:"Jan 2026 thyroid panel", s:"2 markers"}].map((r,i)=>(
            <div key={i} style={{background:"#fff", border:`1px solid ${c.border}`, borderRadius:12, padding:"12px 14px", marginBottom:8, display:"flex", alignItems:"center", justifyContent:"space-between"}}>
              <div><div style={{fontFamily:c.serif, fontSize:14, color:c.ink}}>{r.n}</div><div style={{fontSize:11, color:c.ink3, marginTop:2}}>{r.s}</div></div>
              <IcChevronRight size={14} color={c.ink3}/>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (screen === "upload") {
    return (
      <div style={wrap}>
        <div style={{padding:"24px 20px 12px"}}>
          <div style={{fontFamily:"ui-monospace, Menlo, monospace", fontSize:10, letterSpacing:"0.16em", textTransform:"uppercase", color:c.primary}}>Step 1 of 3</div>
          <div style={{fontFamily:c.serif, fontWeight:500, fontSize:26, lineHeight:1.1, color:c.ink, marginTop:6, letterSpacing:"-0.015em"}}>Add your report</div>
        </div>
        <div style={{padding:"0 16px"}}>
          <div style={{display:"flex", background:"#fff", border:`1px solid ${c.border}`, borderRadius:10, padding:3, marginBottom:12}}>
            <div style={{flex:1, textAlign:"center", padding:"8px 0", background:c.primary, color:"#fff", borderRadius:8, fontSize:13}}>Upload</div>
            <div style={{flex:1, textAlign:"center", padding:"8px 0", color:c.ink2, fontSize:13}}>Paste text</div>
          </div>
          <div style={{border:`1.5px dashed #D8D8D8`, borderRadius:12, padding:"28px 16px", textAlign:"center", background:"#fff"}}>
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden="true"><circle cx="16" cy="16" r="14" fill={c.primary} fillOpacity=".07"/><path d="M16 9v11" stroke={c.primary} strokeWidth="1.6" strokeLinecap="round"/><path d="M11 13.5l5-5 5 5" stroke={c.primary} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M8 22v1.5a1.5 1.5 0 001.5 1.5h13a1.5 1.5 0 001.5-1.5V22" stroke={c.primary} strokeWidth="1.6" strokeLinecap="round"/></svg>
            <div style={{fontSize:13, color:c.ink, marginTop:8}}>Drop a PDF, photo, or TXT</div>
            <div style={{fontSize:11, color:c.ink3, marginTop:4}}>or tap to browse</div>
          </div>
          <div style={{marginTop:16, background:"rgba(139,26,74,0.08)", borderRadius:10, padding:12, fontSize:12, color:c.ink2, lineHeight:1.5}}>
            <span style={{fontFamily:"ui-monospace, Menlo, monospace", fontSize:10, letterSpacing:"0.14em", textTransform:"uppercase", color:c.primary, display:"block", marginBottom:4}}>What happens</span>
            Extraction → review → interpretation. Nothing is inferred.
          </div>
        </div>
      </div>
    );
  }

  if (screen === "results") {
    return (
      <div style={wrap}>
        <div style={{padding:"20px 20px 12px"}}>
          <div style={{fontFamily:"ui-monospace, Menlo, monospace", fontSize:10, letterSpacing:"0.16em", textTransform:"uppercase", color:c.primary}}>Results · 10 markers</div>
          <div style={{fontFamily:c.serif, fontWeight:500, fontSize:22, lineHeight:1.15, color:c.ink, marginTop:4}}>April 2026 routine bloods</div>
        </div>
        <div style={{padding:"0 16px"}}>
          {[
            {n:"Ferritin", v:"21", u:"ng/mL", r:"15–150", s:"low-normal", sc:"#8A5A00", sb:"#FBF4E4"},
            {n:"Vitamin D", v:"27", u:"ng/mL", r:"30–100", s:"below range", sc:"#7A2E2E", sb:"#F7EAEA"},
            {n:"TSH", v:"3.4", u:"mIU/L", r:"0.4–4.0", s:"within range", sc:c.primary, sb:"rgba(139,26,74,0.08)"},
            {n:"Estradiol", v:"110", u:"pg/mL", r:"30–400", s:"within range", sc:c.primary, sb:"rgba(139,26,74,0.08)"},
          ].map((m,i)=>(
            <div key={i} style={{background:"#fff", border:`1px solid ${c.border}`, borderRadius:12, padding:14, marginBottom:8}}>
              <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start"}}>
                <div style={{fontFamily:c.serif, fontSize:16, color:c.ink}}>{m.n}</div>
                <div style={{fontFamily:"ui-monospace, Menlo, monospace", fontSize:9, letterSpacing:"0.1em", textTransform:"uppercase", color:m.sc, background:m.sb, padding:"3px 7px", borderRadius:99}}>{m.s}</div>
              </div>
              <div style={{display:"flex", alignItems:"baseline", gap:8, marginTop:6}}>
                <div style={{fontFamily:"ui-monospace, Menlo, monospace", fontSize:22, color:c.ink}}>{m.v}</div>
                <div style={{fontFamily:"ui-monospace, Menlo, monospace", fontSize:11, color:c.ink3}}>{m.u}</div>
                <div style={{marginLeft:"auto", fontFamily:"ui-monospace, Menlo, monospace", fontSize:10, color:c.ink3}}>ref {m.r}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (screen === "marker") {
    return (
      <div style={wrap}>
        <div style={{padding:"20px 20px 12px"}}>
          <div style={{fontFamily:"ui-monospace, Menlo, monospace", fontSize:10, letterSpacing:"0.16em", textTransform:"uppercase", color:c.primary}}>Marker detail</div>
          <div style={{fontFamily:c.serif, fontWeight:500, fontSize:30, lineHeight:1.05, color:c.ink, marginTop:6}}>Ferritin</div>
          <div style={{display:"flex", alignItems:"baseline", gap:8, marginTop:12}}>
            <div style={{fontFamily:"ui-monospace, Menlo, monospace", fontSize:42, color:c.ink}}>21</div>
            <div style={{fontFamily:"ui-monospace, Menlo, monospace", fontSize:13, color:c.ink3}}>ng/mL</div>
            <div style={{marginLeft:"auto", fontFamily:"ui-monospace, Menlo, monospace", fontSize:9, letterSpacing:"0.1em", textTransform:"uppercase", color:"#8A5A00", background:"#FBF4E4", padding:"4px 8px", borderRadius:99}}>Low-normal</div>
          </div>
          <div style={{height:6, background:"#F3EFEE", borderRadius:99, marginTop:14, position:"relative"}}>
            <div style={{position:"absolute", left:"8%", right:"8%", top:0, bottom:0, background:"rgba(139,26,74,0.08)", borderRadius:99}}/>
            <div style={{position:"absolute", top:-4, left:"14%", width:14, height:14, background:c.primary, borderRadius:"50%", border:"2px solid #fff", boxShadow:`0 0 0 1px ${c.primary}`}}/>
          </div>
          <div style={{display:"flex", justifyContent:"space-between", marginTop:6, fontFamily:"ui-monospace, Menlo, monospace", fontSize:10, color:c.ink3}}><span>15</span><span>150</span></div>
        </div>
        <div style={{padding:"0 16px"}}>
          <div style={{background:"#fff", border:`1px solid ${c.border}`, borderRadius:12, padding:14, marginBottom:8}}>
            <div style={{fontFamily:"ui-monospace, Menlo, monospace", fontSize:9, letterSpacing:"0.14em", textTransform:"uppercase", color:c.primary, marginBottom:4}}>Interpretation</div>
            <div style={{fontSize:13, color:c.ink2, lineHeight:1.5}}>Stored iron, the single best indicator of iron reserves.</div>
          </div>
          <div style={{background:"#fff", border:`1px solid ${c.border}`, borderRadius:12, padding:14}}>
            <div style={{fontFamily:"ui-monospace, Menlo, monospace", fontSize:9, letterSpacing:"0.14em", textTransform:"uppercase", color:c.primary, marginBottom:4}}>Women&rsquo;s context</div>
            <div style={{fontSize:13, color:c.ink2, lineHeight:1.5}}>Menstruating women lose iron monthly; ferritin often sits low without anemia.</div>
          </div>
        </div>
      </div>
    );
  }
}

// ---------- Android screens ----------
function AndroidPhone({ screen }) {
  return (
    <div className="device-frame">
      <AndroidDevice width={340} height={720}>
        <AndroidScreen screen={screen}/>
      </AndroidDevice>
      <div className="device-label">{({home:"Home",upload:"Upload",results:"Results",marker:"Marker detail"})[screen]}</div>
    </div>
  );
}

function AndroidScreen({ screen }) {
  // Slightly different chrome, same tokens — M3-flavored Decode
  const c = { primary: "#8B1A4A", ink: "#1E1E24", ink2: "#4A4A55", ink3: "#7A7A85", bg: "#FAF7F6", border: "#EAEAEA", serif: "'Playfair Display', Georgia, serif" };
  const wrap = { height: "100%", background: c.bg, fontFamily: "Roboto, Inter, system-ui", position: "relative", overflow: "hidden" };

  // Top bar
  const AppBar = ({title}) => (
    <div style={{background:c.bg, padding:"8px 4px 0"}}>
      <div style={{height:56, display:"flex", alignItems:"center", gap:4, padding:"0 8px"}}>
        <div style={{width:40, height:40}}/>
        <div style={{flex:1, fontFamily:c.serif, fontSize:20, color:c.ink}}>{title}</div>
        <div style={{width:40, height:40, display:"flex", alignItems:"center", justifyContent:"center"}}>
          <div style={{display:"flex", flexDirection:"column", gap:3}}>{[0,1,2].map(i=><div key={i} style={{width:4, height:4, background:c.ink3, borderRadius:99}}/>)}</div>
        </div>
      </div>
    </div>
  );

  if (screen === "home") {
    return (
      <div style={wrap}>
        <AppBar title="Decode"/>
        <div style={{padding:"4px 16px 16px"}}>
          <div style={{fontFamily:c.serif, fontWeight:500, fontSize:28, lineHeight:1.1, color:c.ink, marginTop:8, letterSpacing:"-0.01em"}}>Your labs,<br/><em style={{color:c.primary, fontStyle:"italic"}}>decoded</em> for her.</div>
          <div style={{marginTop:10, fontSize:13, color:c.ink2, lineHeight:1.45}}>Strict extraction. We show only what&rsquo;s in your report.</div>
        </div>
        <div style={{padding:"0 16px 16px"}}>
          <div style={{background:c.primary, color:"#fff", padding:"14px 16px", borderRadius:999, fontSize:14, fontWeight:500, textAlign:"center", letterSpacing:"0.02em"}}>Decode a report</div>
          <div style={{marginTop:8, background:c.bg, border:`1px solid ${c.border}`, padding:"13px 16px", borderRadius:999, fontSize:14, color:c.ink, textAlign:"center"}}>Try sample</div>
        </div>
        <div style={{padding:"0 16px"}}>
          <div style={{fontFamily:"Roboto Mono, monospace", fontSize:10, letterSpacing:"0.14em", textTransform:"uppercase", color:c.ink3, marginBottom:8}}>Recent</div>
          {[{n:"April 2026 routine bloods", s:"10 markers"},{n:"Jan 2026 thyroid panel", s:"2 markers"}].map((r,i)=>(
            <div key={i} style={{background:"#fff", borderRadius:16, padding:"14px 16px", marginBottom:8, display:"flex", alignItems:"center", justifyContent:"space-between", boxShadow:"0 1px 2px rgba(0,0,0,0.04)"}}>
              <div><div style={{fontFamily:c.serif, fontSize:14, color:c.ink}}>{r.n}</div><div style={{fontSize:11, color:c.ink3, marginTop:2}}>{r.s}</div></div>
              <IcChevronRight size={14} color={c.ink3}/>
            </div>
          ))}
        </div>
        <div style={{position:"absolute", right:20, bottom:44, width:56, height:56, borderRadius:16, background:c.primary, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, boxShadow:"0 4px 12px rgba(139,26,74,0.3)"}}>+</div>
      </div>
    );
  }

  if (screen === "upload") {
    return (
      <div style={wrap}>
        <AppBar title="Decode"/>
        <div style={{padding:"0 16px 12px"}}>
          <div style={{fontFamily:"Roboto Mono, monospace", fontSize:10, letterSpacing:"0.14em", textTransform:"uppercase", color:c.primary}}>Step 1 of 3</div>
          <div style={{fontFamily:c.serif, fontWeight:500, fontSize:22, color:c.ink, marginTop:4}}>Add your report</div>
        </div>
        <div style={{padding:"0 16px"}}>
          <div style={{display:"flex", gap:8, marginBottom:12}}>
            <div style={{flex:1, textAlign:"center", padding:"10px 0", background:c.primary, color:"#fff", borderRadius:999, fontSize:13}}>Upload</div>
            <div style={{flex:1, textAlign:"center", padding:"10px 0", border:`1px solid ${c.border}`, color:c.ink2, borderRadius:999, fontSize:13}}>Paste text</div>
          </div>
          <div style={{border:`1.5px dashed #D8D8D8`, borderRadius:16, padding:"28px 16px", textAlign:"center", background:"#fff"}}>
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden="true"><circle cx="16" cy="16" r="14" fill={c.primary} fillOpacity=".07"/><path d="M16 9v11" stroke={c.primary} strokeWidth="1.6" strokeLinecap="round"/><path d="M11 13.5l5-5 5 5" stroke={c.primary} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M8 22v1.5a1.5 1.5 0 001.5 1.5h13a1.5 1.5 0 001.5-1.5V22" stroke={c.primary} strokeWidth="1.6" strokeLinecap="round"/></svg>
            <div style={{fontSize:13, color:c.ink, marginTop:8}}>Tap to choose file</div>
            <div style={{fontSize:11, color:c.ink3, marginTop:4}}>PDF, photo, or TXT</div>
          </div>
          <div style={{marginTop:16, background:"rgba(139,26,74,0.08)", borderRadius:12, padding:12, fontSize:12, color:c.ink2, lineHeight:1.5}}>
            <span style={{fontFamily:"Roboto Mono, monospace", fontSize:10, letterSpacing:"0.14em", textTransform:"uppercase", color:c.primary, display:"block", marginBottom:4}}>Pipeline</span>
            Extract → review → interpret. Nothing inferred.
          </div>
        </div>
        <div style={{position:"absolute", bottom:44, left:16, right:16}}>
          <div style={{background:c.primary, color:"#fff", padding:"14px 16px", borderRadius:999, fontSize:14, fontWeight:500, textAlign:"center"}}>Extract markers</div>
        </div>
      </div>
    );
  }

  if (screen === "results") {
    return (
      <div style={wrap}>
        <AppBar title="Results"/>
        <div style={{padding:"0 16px 8px"}}>
          <div style={{fontFamily:"Roboto Mono, monospace", fontSize:10, letterSpacing:"0.14em", textTransform:"uppercase", color:c.primary}}>10 markers · Apr 2026</div>
        </div>
        <div style={{padding:"0 16px"}}>
          {[
            {n:"Ferritin", v:"21", u:"ng/mL", r:"15–150", s:"low-normal", sc:"#8A5A00", sb:"#FBF4E4"},
            {n:"Vitamin D", v:"27", u:"ng/mL", r:"30–100", s:"below range", sc:"#7A2E2E", sb:"#F7EAEA"},
            {n:"TSH", v:"3.4", u:"mIU/L", r:"0.4–4.0", s:"within range", sc:c.primary, sb:"rgba(139,26,74,0.08)"},
            {n:"Estradiol", v:"110", u:"pg/mL", r:"30–400", s:"within range", sc:c.primary, sb:"rgba(139,26,74,0.08)"},
          ].map((m,i)=>(
            <div key={i} style={{background:"#fff", borderRadius:16, padding:14, marginBottom:8, boxShadow:"0 1px 2px rgba(0,0,0,0.04)"}}>
              <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start"}}>
                <div style={{fontFamily:c.serif, fontSize:16, color:c.ink}}>{m.n}</div>
                <div style={{fontFamily:"Roboto Mono, monospace", fontSize:9, letterSpacing:"0.1em", textTransform:"uppercase", color:m.sc, background:m.sb, padding:"3px 8px", borderRadius:99}}>{m.s}</div>
              </div>
              <div style={{display:"flex", alignItems:"baseline", gap:8, marginTop:6}}>
                <div style={{fontFamily:"Roboto Mono, monospace", fontSize:22, color:c.ink}}>{m.v}</div>
                <div style={{fontFamily:"Roboto Mono, monospace", fontSize:11, color:c.ink3}}>{m.u}</div>
                <div style={{marginLeft:"auto", fontFamily:"Roboto Mono, monospace", fontSize:10, color:c.ink3}}>ref {m.r}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (screen === "marker") {
    return (
      <div style={wrap}>
        <AppBar title=""/>
        <div style={{padding:"0 16px 12px"}}>
          <div style={{fontFamily:"Roboto Mono, monospace", fontSize:10, letterSpacing:"0.14em", textTransform:"uppercase", color:c.primary}}>Marker detail</div>
          <div style={{fontFamily:c.serif, fontWeight:500, fontSize:28, lineHeight:1.1, color:c.ink, marginTop:4}}>Ferritin</div>
          <div style={{display:"flex", alignItems:"baseline", gap:8, marginTop:12}}>
            <div style={{fontFamily:"Roboto Mono, monospace", fontSize:40, color:c.ink}}>21</div>
            <div style={{fontFamily:"Roboto Mono, monospace", fontSize:13, color:c.ink3}}>ng/mL</div>
            <div style={{marginLeft:"auto", fontFamily:"Roboto Mono, monospace", fontSize:9, letterSpacing:"0.1em", textTransform:"uppercase", color:"#8A5A00", background:"#FBF4E4", padding:"4px 8px", borderRadius:99}}>Low-normal</div>
          </div>
          <div style={{height:6, background:"#F3EFEE", borderRadius:99, marginTop:14, position:"relative"}}>
            <div style={{position:"absolute", left:"8%", right:"8%", top:0, bottom:0, background:"rgba(139,26,74,0.08)", borderRadius:99}}/>
            <div style={{position:"absolute", top:-4, left:"14%", width:14, height:14, background:c.primary, borderRadius:"50%", border:"2px solid #fff", boxShadow:`0 0 0 1px ${c.primary}`}}/>
          </div>
          <div style={{display:"flex", justifyContent:"space-between", marginTop:6, fontFamily:"Roboto Mono, monospace", fontSize:10, color:c.ink3}}><span>15</span><span>150</span></div>
        </div>
        <div style={{padding:"0 16px"}}>
          <div style={{background:"#fff", borderRadius:16, padding:14, marginBottom:8, boxShadow:"0 1px 2px rgba(0,0,0,0.04)"}}>
            <div style={{fontFamily:"Roboto Mono, monospace", fontSize:9, letterSpacing:"0.14em", textTransform:"uppercase", color:c.primary, marginBottom:4}}>Interpretation</div>
            <div style={{fontSize:13, color:c.ink2, lineHeight:1.5}}>Stored iron, the single best indicator of iron reserves.</div>
          </div>
          <div style={{background:"#fff", borderRadius:16, padding:14, boxShadow:"0 1px 2px rgba(0,0,0,0.04)"}}>
            <div style={{fontFamily:"Roboto Mono, monospace", fontSize:9, letterSpacing:"0.14em", textTransform:"uppercase", color:c.primary, marginBottom:4}}>Women&rsquo;s context</div>
            <div style={{fontSize:13, color:c.ink2, lineHeight:1.5}}>Menstruating women lose iron monthly; ferritin often reads low without anemia.</div>
          </div>
        </div>
      </div>
    );
  }
}

// ---------- Privacy page (LGPD) ----------
function PrivacyPage({ go }) {
  return (
    <div className="page" style={{ maxWidth: 720 }}>
      <div className="page-head">
        <div className="eyebrow">Jurídico · LGPD</div>
        <h1 className="h1">Política de Privacidade</h1>
        <p className="sub">Última atualização: maio de 2026 &nbsp;·&nbsp; Decifra</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--s4)", fontSize: 14, color: "var(--ink-2)", lineHeight: 1.75 }}>

        <section>
          <h2 className="h2" style={{ marginBottom: "var(--s2)" }}>Quem somos</h2>
          <p>A <strong>Decifra</strong> é um produto independente de saúde feminina (femtech) que interpreta exames laboratoriais com contexto clínico voltado à mulher. Esta política descreve como tratamos seus dados pessoais conforme a Lei Geral de Proteção de Dados (LGPD, Lei 13.709/2018) do Brasil. Contato: <a href="mailto:privacidade@decifra.com.br" style={{ color: "var(--primary)" }}>privacidade@decifra.com.br</a></p>
        </section>

        <section>
          <h2 className="h2" style={{ marginBottom: "var(--s2)" }}>Encarregada de Dados (DPO)</h2>
          <p>Em conformidade com o art. 41 da LGPD, designamos uma Encarregada pelo Tratamento de Dados Pessoais. Você pode contatá-la para qualquer questão de proteção de dados: <a href="mailto:encarregado@decifra.com.br" style={{ color: "var(--primary)" }}>encarregado@decifra.com.br</a></p>
        </section>

        <section>
          <h2 className="h2" style={{ marginBottom: "var(--s2)" }}>Quais dados coletamos</h2>
          <ul style={{ paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
            <li><strong>E-mail:</strong> coletado quando você cria uma conta (gratuita ou paga). Serve para identificar sua conta e seu plano.</li>
            <li><strong>Plano de assinatura</strong> (<code>grátis</code> ou <code>pro</code>) e data de validade: armazenados no nosso banco de dados para gerenciar o acesso.</li>
            <li><strong>Contagem de decifrações:</strong> contador mensal armazenado apenas no localStorage do seu navegador. Nunca enviado aos nossos servidores.</li>
            <li><strong>Contexto opcional da paciente:</strong> idade, momento da vida (ciclo, gestação, pós-parto, climatério, menopausa), dia do ciclo, semanas pós-parto, meses sem menstruar, notas livres. Salvo no seu navegador (localStorage) e, se você tiver conta, também sincronizado com a sua conta para uso entre dispositivos. Você pode apagar a qualquer momento.</li>
            <li><strong>Relatos de problema:</strong> se você usar o botão &ldquo;Relatar problema&rdquo; em um marcador, o motivo e a nota que você enviou ficam armazenados. Não contêm valores do seu exame.</li>
          </ul>
        </section>

        <section>
          <h2 className="h2" style={{ marginBottom: "var(--s2)" }}>O que NÃO coletamos</h2>
          <ul style={{ paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
            <li>O texto do seu exame laboratorial <strong>nunca é armazenado</strong>. Ele é enviado para a API da Anthropic apenas para extração, processado em memória e descartado imediatamente. Não é gravado em nenhum banco de dados.</li>
            <li>Valores extraídos, resultados e interpretações <strong>nunca são armazenados</strong>. Existem apenas no seu navegador durante a sessão. Quando você fecha a página, somem. Não há histórico no servidor.</li>
            <li>Não usamos cookies para rastreamento publicitário.</li>
            <li>Não compartilhamos seus dados com terceiros, exceto Stripe (processamento de pagamento), Supabase (infraestrutura de banco de dados) e Anthropic (extração por IA), conforme detalhado abaixo.</li>
          </ul>
        </section>

        <section>
          <h2 className="h2" style={{ marginBottom: "var(--s2)" }}>Base legal (LGPD)</h2>
          <p>Tratamos seu e-mail e plano de assinatura com base na <strong>execução de contrato</strong> (art. 7º, V da LGPD), pois são necessários para fornecer o serviço. Relatos de problema são tratados com base no nosso <strong>legítimo interesse</strong> (art. 7º, IX) em melhorar o produto.</p>
          <p style={{ marginTop: "var(--s2)" }}>O contexto opcional sobre a sua saúde (momento da vida, fase do ciclo, sintomas, medicamentos) constitui <strong>dado pessoal sensível</strong> sob o art. 5º, II e art. 11 da LGPD. Tratamos esses dados <strong>somente com o seu consentimento explícito</strong> e exclusivamente para a finalidade de interpretar seu exame com mais precisão. Você pode revogar o consentimento a qualquer momento, e o dado será apagado.</p>
        </section>

        <section>
          <h2 className="h2" style={{ marginBottom: "var(--s2)" }}>Seus direitos</h2>
          <p>Conforme o art. 18 da LGPD, você tem direito a:</p>
          <ul style={{ paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
            <li>Confirmação da existência de tratamento dos seus dados</li>
            <li>Acesso aos seus dados</li>
            <li>Correção de dados incompletos, inexatos ou desatualizados</li>
            <li>Anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desconformidade</li>
            <li>Portabilidade dos dados</li>
            <li>Eliminação dos dados tratados com base no seu consentimento</li>
            <li>Informação sobre as entidades públicas e privadas com as quais compartilhamos dados</li>
            <li>Informação sobre a possibilidade de não fornecer consentimento e suas consequências</li>
            <li>Revogação do consentimento</li>
          </ul>
          <p style={{ marginTop: "var(--s2)" }}>Para exercer qualquer um desses direitos, escreva para <a href="mailto:encarregado@decifra.com.br" style={{ color: "var(--primary)" }}>encarregado@decifra.com.br</a>. Responderemos em até 15 dias, conforme exigido pela ANPD.</p>
        </section>

        <section>
          <h2 className="h2" style={{ marginBottom: "var(--s2)" }}>Retenção dos dados</h2>
          <p>O registro da sua conta é mantido enquanto sua conta estiver ativa. Se você solicitar exclusão, todos os dados pessoalmente identificáveis serão removidos em até 30 dias. Estatísticas agregadas e anônimas (por exemplo, contagem total de decifrações) podem ser retidas para fins de melhoria do produto, sem associação à sua identidade.</p>
        </section>

        <section>
          <h2 className="h2" style={{ marginBottom: "var(--s2)" }}>Operadores terceirizados</h2>
          <ul style={{ paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
            <li><strong>Supabase:</strong> banco de dados (região São Paulo, sa-east-1). <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)" }}>Política de privacidade</a></li>
            <li><strong>Stripe:</strong> processamento de pagamento. Os dados do seu cartão são tratados inteiramente pela Stripe e nunca chegam à Decifra. <a href="https://stripe.com/br/privacy" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)" }}>Política de privacidade</a></li>
            <li><strong>Anthropic:</strong> extração por IA. O texto do seu exame é enviado à API da Anthropic apenas no momento da extração, conforme a <a href="https://www.anthropic.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)" }}>política de privacidade da Anthropic</a>. Sob os termos da API comercial, não é usado para treinar modelos.</li>
            <li><strong>Vercel:</strong> hospedagem da aplicação. <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)" }}>Política de privacidade</a></li>
          </ul>
        </section>

        <section>
          <h2 className="h2" style={{ marginBottom: "var(--s2)" }}>Transferência internacional</h2>
          <p>Alguns dos nossos operadores terceirizados (Anthropic, Stripe, Vercel) podem processar dados fora do território brasileiro. A transferência internacional ocorre com base em cláusulas contratuais padrão e nos requisitos do art. 33 da LGPD.</p>
        </section>

        <section>
          <h2 className="h2" style={{ marginBottom: "var(--s2)" }}>Reclamações à ANPD</h2>
          <p>Se você acreditar que seus direitos sob a LGPD foram violados, pode registrar reclamação junto à Autoridade Nacional de Proteção de Dados (ANPD) pelo site <a href="https://www.gov.br/anpd" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)" }}>gov.br/anpd</a>.</p>
        </section>

        <section>
          <h2 className="h2" style={{ marginBottom: "var(--s2)" }}>Atualizações desta política</h2>
          <p>Podemos atualizar esta política conforme o produto evoluir ou exigências regulatórias mudarem. A data da última atualização aparece no topo desta página. Mudanças relevantes serão comunicadas no produto.</p>
        </section>

      </div>

      <div style={{ marginTop: "var(--s5)" }}>
        <button className="btn btn-ghost" onClick={() => go("home")}>← Voltar para o início</button>
      </div>
    </div>
  );
}

// ---------- Footer ----------
function Footer({ go }) {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <div className="footer-brand-text">
            <span className="footer-brand-name">Decifra</span>
            <span className="footer-brand-sub">
              Interpretação de exames femininos com contexto clínico
            </span>
          </div>
        </div>
        <div className="footer-text">Apenas para fins educacionais. Não é um dispositivo médico nem ferramenta diagnóstica. Não substitui consulta com profissional habilitado pelo CFM/CRM. Sempre discuta seus resultados com um(a) médico(a) de sua confiança.</div>
        <div className="footer-meta" style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
          <span>© 2026 · decifra.com.br</span>
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <a
              href={feedbackMailto("Rodapé")}
              style={{ color: "var(--primary)", fontSize: "11px", textDecoration: "underline" }}
            >
              Relatar um problema
            </a>
            <span style={{ color: "var(--ink-3)", fontSize: "11px" }}>·</span>
            <button style={{ background: "none", border: "none", color: "var(--primary)", fontSize: "11px", cursor: "pointer", textDecoration: "underline", padding: 0 }}
              onClick={() => go("privacy")}>
              Política de Privacidade
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <ToastProvider>
    <App/>
  </ToastProvider>
);
