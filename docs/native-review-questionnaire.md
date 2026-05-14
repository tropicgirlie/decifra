# Revisão nativa pt-BR — Questionário para a revisora

Documento para enviar a uma profissional brasileira nativa antes do soft-launch beta do Decifra. Estruturado por seção, com perguntas específicas e referências aos arquivos.

- **Versão**: 1.0 (2026-05-13)
- **Idioma de trabalho**: revisora responde em pt-BR
- **Tempo estimado**: 8 a 12 horas de leitura ativa
- **Honorário sugerido**: R$ 1.200 a R$ 2.000, dependendo do perfil

## Contexto curto sobre a Decifra

A Decifra é uma plataforma web brasileira que ajuda mulheres a entender seus exames laboratoriais com contexto de fisiologia feminina. A usuária envia ou cola o laudo, confirma os marcadores extraídos, descreve sua fase da vida (ciclo, gestação, pós-parto, climatério, menopausa) e recebe uma interpretação personalizada por IA.

**Não diagnostica. Não trata. Não substitui consulta médica.** É educacional, com tom de boa GP/clínica geral brasileira.

A plataforma foi adaptada do produto irmão em inglês ("Decode"). Toda a UI foi traduzida e localizada para o Brasil. Esta revisão é o último passo antes de lançar a beta pública.

## Quem é a revisora ideal

Diferentes seções pedem perfis diferentes. Se possível, divida:

| Seção | Perfil ideal |
|---|---|
| 2, 3, 4, 6 (voz, glossário, encaminhamento, disclaimer) | Brasileira nativa, escolaridade alta, idealmente com experiência em copywriting de saúde ou jornalismo médico |
| 5, 7, 8 (INTERPRETATIONS, CLINICAL_PANELS, prompts) | Médica brasileira, idealmente ginecologista ou endocrinologista, ou enfermeira obstetra com prática clínica |
| 9 (LGPD) | Advogada com experiência em LGPD e saúde (opcional, ideal pré-lançamento) |

Se houver apenas uma revisora, priorize as seções 5, 7 e 8 (clínicas), depois 2 a 4 (voz e glossário).

## Como reportar feedback

Para cada pergunta de "sim/não", responda **OK**, **Não**, ou **Depende** (com nota). Para pergunta aberta, frase curta basta. Sinalize qualquer string que soe mal, mesmo que não esteja em pergunta direta.

Se preferir, marque diretamente o trecho no app rodando localmente (URL será fornecida) ou imprima esta lista e anote à mão.

---

## Seção 1 — Voz e tom

A Decifra deve soar como **uma boa ginecologista brasileira escrevendo para sua paciente**. Calorosa, cuidadosa, sem pressa. Direta, mas não fria. Sem alarme, sem infantilizar.

### Princípios escolhidos

| Eixo | Decisão |
|---|---|
| Pessoa | "Você" sempre. Nunca "tu" nem "a senhora". |
| Gênero | Feminino default (paciente, médica, ginecologista, usuária). |
| Hedging | "Pode indicar", "sugere", "costuma", "vale acompanhar". Nunca "indica certamente". |
| Travessões | Proibidos. Vírgula ou ponto. |
| Tom emocional | Acolhedor sem ser íntimo demais. |

### Perguntas

1. Lendo a página inicial (Home) e o rodapé, a voz soa **natural e brasileira**, sem travessões e sem cheirar a "tradução do inglês"?
2. O uso exclusivo de feminino ("paciente", "médica", "ginecologista", "usuária") soa correto e bem-vindo em um produto para mulheres, ou em algum lugar parece forçado?
3. O hedging ("pode indicar", "vale acompanhar") soa natural ou cauteloso demais? Conte se algum trecho específico cruzou a linha.
4. Há alguma frase que soa **infantilizante**, **clínica fria demais**, ou **alarmista**?
5. Se uma amiga sua, com pouca alfabetização em saúde, lesse a interpretação, ela se sentiria respeitada e informada, ou perdida?

### Onde checar

- Home (app.jsx, função `Home`, linhas 2235-2310)
- Rodapé (app.jsx, função Footer, linhas 4485-4515)
- Resultados (`function Results`, linhas 3055-3200)
- Toasts e mensagens curtas espalhadas

---

## Seção 2 — Glossário canônico

O arquivo `docs/glossary.md` lista todas as decisões de termo. Algumas têm trade-offs que pedem confirmação nativa.

### Perguntas críticas (sim/não/depende)

1. **"Climatério" no lugar de "perimenopausa"** em todo o app. Soa certo para o público-alvo (mulheres 35 a 60, escolaridade variada), ou "perimenopausa" também deveria aparecer?
2. **"SOP"** sempre, em vez de "PCOS", incluindo em CTAs e marketing. Toda mulher brasileira hoje entende "SOP" sem precisar do nome completo?
3. **"Laudo"** em vez de "relatório" para o documento laboratorial. Soa formal demais para o tom da Decifra, ou está certo?
4. **"HAM"** (Hormônio Antimülleriano) na prosa, em vez de "AMH". Laudos Fleury/DASA/Hermes Pardini usam HAM ou AMH com mais frequência?
5. **"Gestação" + "gestante"** (formal) versus **"gravidez" + "grávida"** (coloquial). Em uma plataforma de saúde da mulher, qual registro a gente deveria usar como default? Eu escolhi "gestação", mas em copy de UI ("Estou grávida") "gravidez" soa mais humano.
6. **"TGO/TGP"** em vez de "AST/ALT". É realmente universal entre laboratórios BR, ou alguns laudos modernos já usam AST/ALT primário?
7. **"PCR-us"** (PCR ultrassensível) em vez de "hsCRP". Idem: universal ou ainda em transição?
8. **"DRC"** (Doença Renal Crônica) em vez de "CKD". Pacientes leigas entendem DRC, ou é jargão demais?
9. **"DHGNA"** (Doença Hepática Gordurosa Não Alcoólica) versus apenas "esteatose hepática" mais coloquial.
10. **"Encarregada de Dados"** versus "DPO" no rodapé legal. LGPD usa "Encarregado" no Art. 41. Tudo bem usar a forma feminina?

### Pergunta aberta

Há algum termo, no `glossary.md`, onde minha escolha soaria **errada ou estranha** para uma mulher brasileira urbana média?

---

## Seção 3 — Encaminhamentos clínicos (CTAs de "discuss with GP")

A Decifra encaminha repetidamente para conversar com a médica. Escolhemos:

- "Converse com sua ginecologista" (default em saúde feminina)
- "Leve esse laudo à sua médica" (genérico)
- "Considere um endocrinologista" / "uma endocrinologista" (especialidade)
- "Médica do convênio ou SUS" (acessibilidade)

### Perguntas

1. "Converse com sua **ginecologista**" como default funciona para o público amplo, ou alterna com "**clínica geral**" deveria aparecer com mais frequência?
2. Em copy gerada pela IA no resumo, a frase "converse com sua médica" repete-se. Soa redundante, ou natural como num conselho de boa médica?
3. "**Médica do convênio ou SUS**" — esse parêntese soa inclusivo (não pressupõe particular) ou estranho/contábil?
4. O termo "**especialista**" sem qualificar (em vez de "endocrinologista" ou "ginecologista") aparece em alguns lugares. Vale sempre nomear a especialidade, ou "especialista" basta?

### Onde checar

- Resultados de exemplo, especialmente `discuss_with_gp` e `next_steps` (campos no JSON do resumo)
- CLINICAL_PANELS (`app.jsx` linha 3772-3862), campos `watch` e `missing`
- Frases canônicas em `docs/glossary.md` seção 8

---

## Seção 4 — Voz da marca em momentos críticos

### Hero (`Home` em app.jsx ~linha 2230)

```
"Seus exames, decifrados para ela."
"A Decifra extrai os biomarcadores que estão de fato no seu exame e os coloca no contexto do ciclo menstrual, da fertilidade, do climatério e da menopausa. Sem diagnósticos. Apenas o que o laboratório registrou, interpretado com cuidado."
```

**Perguntas**:
1. "Decifrados para ela" — natural ou clichê?
2. "Sem diagnósticos. Apenas o que o laboratório registrou, interpretado com cuidado." — passa confiança ou soa defensivo?
3. Sugere uma reescrita do parágrafo que soaria mais brasileiro, sem perder o significado clínico?

### Rodapé / disclaimer (`app.jsx` ~linha 4485)

```
"Apenas para fins educacionais. Não é um dispositivo médico nem ferramenta diagnóstica. Não substitui consulta com profissional habilitado pelo CFM/CRM. Sempre discuta seus resultados com um(a) médico(a) de sua confiança."
```

**Perguntas**:
1. "Não substitui consulta com profissional habilitado pelo CFM/CRM" — formulação brasileira correta? Algum advogado de saúde sugeriria adicionar algo?
2. "Sempre discuta" — verbo "discutir" tem leve conotação de "brigar". Trocar por "Sempre converse"?
3. "Médico(a) de sua confiança" — soa natural ou redundante?

### Toasts / microcopy

- "Pronto." (em vez de "Salvo com sucesso")
- "Tentar de novo." (em vez de "Tentar novamente" — escolhi a forma mais curta)
- "Um instante…" (loading)
- "Pro liberado! Decifrações ilimitadas ativadas."

**Pergunta**: Algum desses soa robótico ou estranho?

---

## Seção 5 — INTERPRETATIONS dictionary (50 marcadores)

O arquivo `app.jsx` linhas 467-764 tem o dicionário de marcadores. Cada um tem 5 campos: `measures`, `female_context`, `low`, `high`, `evidence`.

### O que pedimos da revisora médica

Leia o dicionário inteiro. Para cada marcador, marque com:

- ✓ se o texto está clinicamente correto e em pt-BR natural
- ✗ se há erro clínico ou tradução estranha (descrever em 1 linha)
- ? se algo soa fora do padrão brasileiro (descrever)

### Pontos específicos a verificar

1. **Unidades convertidas**: muitos valores estavam em mmol/L no original em inglês. Convertemos para mg/dL (Brasil). Confira se os limites batem com as faixas que sua paciente vê em laudos Fleury, DASA, Hermes Pardini ou Sabin:
   - Colesterol total: limite de 200 mg/dL (era 5,2 mmol/L)
   - LDL: ideal abaixo de 70, elevado acima de 115, alto acima de 155
   - HDL: baixo abaixo de 40, protetor acima de 60
   - Triglicérides: ideal abaixo de 80, elevado acima de 150
   - Glicose em jejum: pré-diabetes 100-125, diabetes ≥126
   - Cálcio: hipo abaixo de 8,8, hiper acima de 10,4
   - Fósforo: baixo abaixo de 2,5, alto acima de 4,7
   - Magnésio: deficiência abaixo de 1,7, alto acima de 2,7
   - Hemoglobina: anemia abaixo de 12 g/dL em mulher
   - Zinco: deficiência abaixo de 65 µg/dL

2. **Terminologia clínica**: confira se os termos abaixo são usados como a maioria dos médicos brasileiros usaria:
   - "hipotireoidismo central" (em FREE T4)
   - "tireoidite de Hashimoto" (em ANTI-TPO)
   - "tireoidite pós-parto"
   - "perda gestacional" (em vez de "aborto espontâneo")
   - "fase lútea curta"
   - "amenorreia hipotalâmica"
   - "trombocitopenia gestacional"
   - "anemia ferropriva"

3. **Frase específica para checar**:
   - **VITAMIN D**: "Vitamina D baixa está associada à intensidade da TPM, a características metabólicas da SOP, e à aceleração da perda óssea no climatério."
   - **HSCRP**: "O risco cardiovascular dobra em mulheres na menopausa com PCR-us acima de 3 mg/L."
   - **HOMOCYSTEINE**: "Causada por B12, B6 e folato baixos, e por variantes do gene MTHFR."
   - **CA-125**: "CA-125 não é diagnóstico isolado para endometriose."
   - **FERRITIN**: "Queda de cabelo e fadiga ao exercício aparecem bem antes de a hemoglobina cair."

   Para cada uma: a frase está clinicamente correta E soa como uma médica brasileira escreveria?

4. **Faixas de referência específicas do Brasil**: alguns marcadores podem ter faixas de referência brasileiras diferentes das internacionais. Por exemplo:
   - **TSH**: usamos a sugestão "entre 2,5 e 4,0 mUI/L pode ser sintomático mesmo dentro da faixa" — isso é alinhado com SBEM ou conservador demais?
   - **Anti-TPO**: usamos "abaixo de 35 UI/mL" — bate com laudos BR?
   - **Anti-TG**: usamos "abaixo de 40 UI/mL" — bate?

---

## Seção 6 — CLINICAL_PANELS (6 painéis clínicos)

`app.jsx` linhas 3772-3862. Seis painéis: Anos férteis, SOP, Endometriose, Investigação de fertilidade, Climatério, Menopausa. Cada um com `label`, `summary`, `context`, `watch[]`, `missing`.

### Perguntas para cada painel

1. O texto **context** (parágrafo longo de introdução) está clinicamente correto e atualizado para 2026?
2. Os marcadores listados em `markers` cobrem o que você pediria em consulta para essa fase/condição? Falta algum, sobra algum?
3. Os pontos de `watch` (alertas clínicos) estão precisos? Algum number está desatualizado?
4. O texto de `missing` (o que não vem nos painéis padrão) reflete o que VOCÊ vê em laudos brasileiros, ou é uma observação que vem de literatura US/UK?

### Painéis específicos a checar com extra cuidado

**SOP**:
- "70 a 80% das mulheres com SOP têm resistência à insulina, inclusive nas magras." — número confere?
- Critérios diagnósticos: "dois de três" (ciclos irregulares, hiperandrogenismo, morfologia ovariana policística). Confere com o consenso brasileiro atual (FEBRASGO 2025)?

**Endometriose**:
- "1 em cada 10 mulheres", "7 a 10 anos para ser identificada" — números brasileiros ou globais?
- "Não existe exame de sangue definitivo, a confirmação é cirúrgica" — formulação correta sem ser alarmista?

**Climatério**:
- A faixa etária "40 a 52" cobre a realidade brasileira? FEBRASGO usa outra?
- "FSH acima de 10 mUI/mL em dois exames separados (idealmente nos dias 2 a 5 do ciclo)" — limites e dias corretos?

**Menopausa**:
- "FSH acima de 40 mUI/mL com estradiol abaixo de 20 pg/mL é o padrão laboratorial da menopausa" — formulação correta? Evitamos a palavra "diagnóstico" porque a Decifra não diagnostica. Funciona?

---

## Seção 7 — Prompts de API (Sonnet e Sabiá)

Esses são os prompts que pilotam a IA. A revisora não precisa entender o código, só ler os prompts em pt-BR como se fossem instruções para uma estagiária médica.

### `api/extract.js` (linhas 90-108)

Prompt em pt-BR que pede para extrair marcadores de laudos brasileiros (Fleury, DASA, Hermes Pardini, Sabin, Alta, Lavoisier).

**Perguntas**:
1. As instruções são claras e profissionais, sem ambiguidade?
2. Falta algum laboratório brasileiro importante na lista de exemplos?
3. A regra "preserve a vírgula como separador decimal" está bem articulada?

### `api/summary.js` (system prompt do passo de raciocínio em INGLÊS)

Esse prompt instrui Claude Sonnet 4.5 a raciocinar clinicamente em inglês. A revisora pode pular se não estiver à vontade em inglês.

### `api/summary.js` (system prompt do passo de tradução para pt-BR — Sabiá-3)

Esse é o prompt que pede ao Sabiá-3 para traduzir o JSON em inglês para português brasileiro nativo, mantendo a estrutura. Veja a função `translateWithSabia`.

**Perguntas**:
1. As instruções de localização ("converse com sua ginecologista", "convênio ou SUS", "climatério", "SOP") estão completas e bem articuladas?
2. Falta alguma convenção brasileira que o tradutor deveria saber?
3. O tom pedido ("clara, cientificamente cuidadosa, calorosa") corresponde à voz que a Decifra quer projetar?

---

## Seção 8 — Disclaimer, política de privacidade, consentimento

### Disclaimer no rodapé

```
"Apenas para fins educacionais. Não é um dispositivo médico nem ferramenta diagnóstica. Não substitui consulta com profissional habilitado pelo CFM/CRM. Sempre discuta seus resultados com um(a) médico(a) de sua confiança."
```

**Perguntas**:
1. Cobre o necessário do ponto de vista regulatório do CFM?
2. Deveria mencionar explicitamente "Resolução CFM 2.314/2022" (telemedicina)?
3. Falta alguma referência a ANVISA, dispositivo médico, ou software como dispositivo médico (SaMD)?

### Consentimento na criação de conta (PreviewGate)

```
"Concordo com a Política de Privacidade. A Decifra armazena apenas seu e-mail e o plano da assinatura. Nenhum dado de exame é guardado."
```

**Perguntas**:
1. Para uma plataforma que processa dados sensíveis de saúde (mesmo que não os armazene), esse texto basta no checkbox?
2. Sob LGPD Art. 11 (dados pessoais sensíveis), faz sentido adicionar uma frase de consentimento explícito tipo: "Autorizo o processamento dos meus dados de saúde para fins de interpretação clínica"?
3. Termos como "armazena" versus "trata" versus "processa" — qual é o correto sob LGPD?

### Política de Privacidade completa

Localizada na rota `/privacy` na página de Política (no app rodando). A revisora deve abrir e ler integralmente.

**Perguntas**:
1. Cobre Art. 7 (bases legais para dados pessoais comuns), Art. 11 (sensíveis), Art. 18 (direitos do titular)?
2. Nomeia a Encarregada (e-mail `encarregado@decifra.com.br`)?
3. Nomeia operadores terceirizados (Anthropic, Maritaca, Supabase, Vercel)?
4. Menciona prazo de resposta a solicitações (15 dias úteis sob LGPD)?
5. Menciona a ANPD como autoridade?
6. Tom: jurídico-rígido, ou claro o suficiente para uma paciente leiga ler?

---

## Seção 9 — Convenções de números, datas e unidades

A revisora deve confirmar:

1. **Separador decimal**: vírgula (1,2) está em todos os lugares apropriados, sem ponto inglês remanescente.
2. **Datas**: formato DD/MM/AAAA na UI.
3. **Hora**: 24h sem AM/PM em qualquer lugar.
4. **mUI/L** para TSH/FSH/LH (não mIU/mL): aplicado de forma consistente?
5. **µUI/mL** para insulina: aplicado consistentemente?
6. **ng/mL, pg/mL, mg/dL**: usado conforme o que aparece em laudos brasileiros típicos?

Em qualquer lugar que a revisora veja "mIU/L" ou "1.2" ou "AM/PM" deve sinalizar.

---

## Seção 10 — Lista aberta: o que mais?

Pergunta aberta no fim:

1. Algum conceito clínico ou cultural importante para a saúde da mulher brasileira que **não aparece** no produto e deveria?
2. Algum termo que aparece e que uma brasileira simplesmente **não usaria**?
3. Algum padrão regional (BA, RS, SP, NE) onde um termo específico **funciona ou não funciona**?
4. Se você tivesse 30 minutos com a fundadora, que mudança você priorizaria antes do lançamento?

---

## Entregáveis esperados da revisora

1. Esta lista de volta, com cada pergunta marcada (OK / Não / Depende + nota curta).
2. Lista separada de **bugs de tradução** (string + sugestão de reescrita).
3. Lista separada de **erros clínicos** (marcador + correção).
4. Recomendações abertas (3 a 5 itens prioritários).

## Tempo realista

- Leitora de tom (seções 1 a 4, 8 a 10): 3 a 4 horas
- Médica clínica (seções 5 a 7): 4 a 6 horas
- Advogada LGPD (seção 8): 1 a 2 horas

Total se uma pessoa fizer tudo: **8 a 12 horas**. Dividir entre 2 ou 3 revisoras é o ideal.

## Como o Decifra recebe o feedback

Salve essa lista como documento, marque diretamente, ou envie por e-mail para `luana@decifra.com.br`. Ajustes serão feitos no mesmo PR antes do soft-launch.

---

**Mantenedora**: Luana Micheau
**Data desta versão**: 2026-05-13
**Próxima revisão**: após o primeiro ciclo de feedback nativo
