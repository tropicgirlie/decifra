// /api/summary — resumo conciso voltado à paciente, a partir dos exames extraídos
// Variável de ambiente necessária: ANTHROPIC_API_KEY

const https = require("https");

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

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "https://decifra.com.br");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

  const apiKey = (process.env.ANTHROPIC_API_KEY || "").trim();
  if (!apiKey) return res.status(503).json({ error: "Resumo temporariamente indisponível" });

  const tests = Array.isArray(req.body?.markers) ? req.body.markers : [];
  if (!tests.length) return res.status(400).json({ error: "Marcadores ausentes" });

  const safeRows = tests.slice(0, 80).map((m) => ({
    marker: String(m.marker || "").slice(0, 80),
    value: String(m.value || "").slice(0, 32),
    unit: String(m.unit || "").slice(0, 24),
    reference_range: String(m.reference_range || "").slice(0, 40),
  }));

  // ── Contexto opcional fornecido pela usuária (peso alto na interpretação) ──
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

  const contextLine = safeCtx ? (() => {
    const parts = [];
    if (safeCtx.age) parts.push(`${safeCtx.age} anos`);
    const stageLabel = ({
      cycle: "menstruando atualmente (ciclo pré-menopáusico)",
      pregnancy: "gestante",
      postpartum: "pós-parto",
      perimenopause: "climatério",
      menopause: "pós-menopausa",
      other: "fase da vida não especificada",
    })[safeCtx.lifeStage] || null;
    if (stageLabel) parts.push(stageLabel);
    if (safeCtx.cycleDay) parts.push(`aproximadamente dia ${safeCtx.cycleDay} do ciclo`);
    if (safeCtx.postpartumWeeks != null) parts.push(`${safeCtx.postpartumWeeks} semanas pós-parto`);
    if (safeCtx.monthsSincePeriod != null) parts.push(`${safeCtx.monthsSincePeriod} meses desde a última menstruação`);
    let line = parts.length ? `Contexto da paciente: ${parts.join(", ")}.` : "";
    if (safeCtx.notes) line += ` Notas da paciente: ${safeCtx.notes}`;
    return line.trim();
  })() : "";

  const system = [
    "Você é um(a) explicador(a) cuidadoso(a) de exames laboratoriais femininos, no estilo de uma boa GP/clínica geral brasileira.",
    "Use apenas os exames e valores fornecidos. Não invente exames, marcadores nem diagnósticos.",
    "Quando houver contexto da paciente (idade, momento da vida, fase do ciclo, pós-parto, climatério, notas), interprete CADA valor à luz desse contexto. O mesmo número pode significar coisas muito diferentes em estados diferentes (ex.: ferritina baixa no pós-parto, prolactina elevada na gestação, FSH no climatério).",
    "Quando o contexto for fornecido, mencione-o explicitamente no headline e nos key_points (ex.: 'Aos 32 anos, com 3 semanas de pós-parto, ferritina de 18 indica recuperação esperada da perda sanguínea, não deficiência crônica').",
    "Quando o contexto estiver ausente, faça uma interpretação geral de fisiologia feminina, mas sinalize que contexto (fase do ciclo, momento da vida) refinaria a leitura.",
    "Retorne SOMENTE JSON válido, com as chaves: full_summary e women_focus_summary.",
    "Cada objeto de resumo deve conter as chaves: headline, key_points (máx. 4), discuss_with_gp (máx. 4), next_steps (máx. 4), reassurance.",
    "Use unidades e convenções brasileiras quando referenciar valores (mUI/L em vez de mIU/L, vírgula como separador decimal, mg/dL, ng/mL conforme padrão dos laboratórios brasileiros como Fleury, DASA, Hermes Pardini).",
    "Quando sugerir conversas com profissional de saúde, use linguagem brasileira: 'converse com sua ginecologista', 'leve ao seu médico do convênio ou SUS', 'considere um endocrinologista'.",
    "women_focus_summary deve destacar explicitamente os exames mais relevantes para a saúde feminina dos dados fornecidos, ponderados pela fase da vida quando conhecida.",
    "Tom: linguagem clara para a paciente, cientificamente cautelosa, orientada à ação. TODO O TEXTO EM PORTUGUÊS DO BRASIL.",
  ].join("\n");

  try {
    const { status, text } = await post(
      "https://api.anthropic.com/v1/messages",
      {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      {
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 900,
        system,
        messages: [
          {
            role: "user",
            content: [
              contextLine ? contextLine : "Contexto da paciente: não informado.",
              "",
              "Resuma este exame para a paciente, em português do Brasil:",
              JSON.stringify(safeRows),
            ].join("\n"),
          },
        ],
      }
    );
    if (status !== 200) return res.status(502).json({ error: "Erro no provedor de resumo" });
    const raw = JSON.parse(text).content?.[0]?.text || "{}";
    const clean = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    const parsed = JSON.parse(clean);
    return res.status(200).json({ summary: parsed });
  } catch {
    return res.status(502).json({ error: "Resumo indisponível" });
  }
};
