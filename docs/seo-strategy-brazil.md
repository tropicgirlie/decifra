# Estratégia SEO Brasil para Decifra

Estratégia para virar a referência brasileira de interpretação de exames laboratoriais femininos, com foco em capturar pacientes que recebem laudo de Fleury, DASA, Hermes Pardini, Sabin, Alta, Diagnósticos da América, e Lavoisier.

- **Status**: v1.0 (2026-05-13)
- **Horizonte**: 12 meses
- **Autor**: estratégia SEO BR aplicada à saúde da mulher
- **Objetivo numérico**: 50k visitas orgânicas/mês em 12 meses, 30% via long-tail de marcadores específicos

## Sumário executivo

A paciente brasileira que recebe um laudo e quer entender o resultado **já está googlando em pt-BR**. Hoje, quem captura esse tráfego é Tua Saúde, Minha Vida, Drauzio Varella, Manual MSD, e os próprios blogs dos laboratórios (Fleury Saúde, DASA Saúde). Esses sites têm um problema: respondem a "o que é ferritina" com 1.500 palavras genéricas, sem ferramenta para a usuária aplicar ao seu próprio laudo.

**A oportunidade da Decifra**: ser o site que responde "ferritina baixa o que significa" com (a) conteúdo de altíssima qualidade clínica em pt-BR brasileiro, (b) uma CTA óbvia para colar o laudo e ver a interpretação personalizada. Isso é defensível contra Tua Saúde porque eles não têm a ferramenta. E é defensível contra Fleury Saúde porque o Fleury não pode dar interpretação personalizada (conflito clínico, eles vendem o exame).

Caminho: três pilares de conteúdo (marcadores, condições, fases da vida) + uma rede de páginas long-tail + parcerias estratégicas com criadoras de saúde da mulher BR + estratégia técnica sólida + medição obsessiva via Search Console Brasil.

## 1. Modelo mental do usuário brasileiro buscando saúde

### Padrões de busca (Google.com.br + Google App + YouTube)

- **Busca-pânico imediata**: "ferritina baixa o que significa", "TSH 3,4 é normal", "AMH 0,8 é baixo"
- **Busca-comparação**: "diferença entre TGO e TGP", "PCR e PCR ultrassensível"
- **Busca-marca de laboratório**: "como interpretar exame Fleury", "valor de referência DASA", "Hermes Pardini ferritina"
- **Busca-sintoma**: "cabelo caindo quais exames pedir", "TPM forte exames", "cansaço extremo exames de sangue"
- **Busca-fase**: "exames pré-natais primeira consulta", "exames para mulher de 40 anos", "exames climatério SBEM"
- **Busca-condição**: "exames para SOP", "diagnóstico endometriose exames de sangue", "investigação fertilidade exames"
- **Busca-prática (dia-a-dia)**: "dia ideal para fazer progesterona", "TSH em jejum precisa", "AMH precisa jejum"

### Características da paciente BR vs paciente UK/US

| Comportamento | Brasil | Diferença chave |
|---|---|---|
| Recebe laudo via | WhatsApp do laboratório, geralmente PDF + foto | UK/US: portal de paciente do hospital |
| Compartilha laudo com | WhatsApp da mãe, da amiga, do grupo "Mulheres 30+" | UK/US: mais privado |
| Antes de marcar consulta de retorno | Googla cada valor alterado, posta no grupo | UK/US: marca com GP |
| Fonte de "segunda opinião" preferida | Instagram de médica influencer, Drauzio, podcast | UK/US: NHS Choices, WebMD |
| Tolera tela em inglês | Não | Sim, mas mal |
| Confia em site sem CRM visível | Não | Idem |

### Implicação direta para Decifra

Toda página SEO Decifra precisa ter, visivelmente acima da dobra:

1. Selo "Conteúdo revisado por ginecologista CRM-XXXX" (assim que tivermos a revisora clínica)
2. Botão grande "Cole seu laudo Fleury / DASA / Hermes Pardini" (call-out aos labs onde a usuária acabou de receber o laudo)
3. Aviso LGPD curto (dois ícones: "Seus dados ficam no seu navegador" + "Nada armazenado")
4. CTA secundária para WhatsApp (compartilhar com a amiga)

## 2. Os três pilares de conteúdo

### Pilar A: Marcadores individuais (~50 páginas)

Cada um dos 50 marcadores no `INTERPRETATIONS` vira uma página pilar. Estrutura padrão:

```
URL: /exame/[slug-do-marcador]
Title: [Marcador]: o que significa, valores de referência e quando se preocupar
Meta: Entenda seu resultado de [marcador]. Veja faixas brasileiras (Fleury, DASA),
       o que valores altos e baixos podem indicar, e como decifrar seu laudo em segundos.

H1: Ferritina: o que significa o seu resultado
H2: O que a ferritina mede
H2: Valores de referência (e por que mudam entre laboratórios brasileiros)
H2: Ferritina baixa: o que isso costuma indicar em mulheres
H2: Ferritina alta: o que isso costuma indicar
H2: Quando vale conversar com sua ginecologista
H2: Decifre seu laudo agora  ← CTA forte aqui
H2: Perguntas frequentes (FAQ schema)
```

**Cobertura prioritária (top 20 buscados)**:
1. Ferritina (~40k buscas/mês)
2. TSH (~80k/mês)
3. Vitamina D (~60k/mês)
4. Hemograma completo (~120k/mês)
5. Glicose em jejum (~50k/mês)
6. AMH / Hormônio Antimülleriano (~25k/mês)
7. FSH (~20k/mês)
8. Estradiol (~15k/mês)
9. Progesterona (~18k/mês)
10. Testosterona (~30k/mês)
11. Hemoglobina (~70k/mês)
12. Colesterol total (~45k/mês)
13. HDL / LDL (~35k/mês)
14. Triglicérides (~28k/mês)
15. T4 livre (~22k/mês)
16. Anti-TPO (~12k/mês)
17. PCR-us (~8k/mês)
18. HbA1c (~32k/mês)
19. SDHEA (DHEA-S) (~6k/mês)
20. Prolactina (~15k/mês)

Cada página precisa:
- ~1.500 a 2.500 palavras
- Schema.org `MedicalCondition` + `Question`/`Answer` para FAQ
- Imagens com `alt` específico ("Faixa de referência de ferritina em laboratório brasileiro")
- Tabela de valores de referência específica para Fleury, DASA, Hermes Pardini (essas tabelas geram backlinks)
- Internal links para os pilares B (condições) e C (fases da vida) que mencionam aquele marcador
- CTA "Cole seu laudo aqui" sticky no scroll

### Pilar B: Condições e fases (6 páginas pilar + 12 sub-páginas)

Já existe scaffolding mental no `CLINICAL_PANELS`. As 6 páginas hub:

1. `/sop-interpretacao-exames` — SOP (Síndrome dos Ovários Policísticos)
2. `/endometriose-exames` — Endometriose
3. `/fertilidade-exames-hormonais` — Investigação de fertilidade
4. `/climaterio-exames` — Climatério
5. `/menopausa-exames` — Menopausa
6. `/exames-femininos-essenciais` — Anos férteis / check-up feminino básico

Cada uma é uma "ultimate guide" de 4.000 a 6.000 palavras, com:
- Quais marcadores pedir (linka para Pilar A)
- Como o laudo da Fleury vs DASA difere para essa condição
- Em que dia do ciclo fazer cada exame
- Como conversar com a ginecologista depois
- 3 a 5 estudos de caso fictícios mas plausíveis (interpretação modelo)
- FAQ com Schema.org

Cada uma puxa 12 sub-páginas long-tail:

- `/sop-amh-alto-significado`
- `/sop-insulina-jejum-elevada`
- `/climaterio-fsh-elevado-quando-preocupar`
- `/endometriose-ca-125-elevado-mas-normal`
- `/fertilidade-amh-baixo-tratamento`
- etc.

### Pilar C: Sintomas → exames (15 a 20 páginas long-tail de alta intenção)

A paciente brasileira raramente busca "quero fazer exame X". Ela busca "**sintoma + exames**". Captura é massiva.

| Página | Sintoma queixa | Marcadores a abordar |
|---|---|---|
| `/queda-de-cabelo-exames` | "cabelo caindo o que pedir" | Ferritina, ferro, TSH, Vit D, Zinco |
| `/cansaço-extremo-exames` | "cansaço crônico" | Ferritina, Vit B12, TSH, T4 livre, cortisol |
| `/tpm-forte-exames` | "TPM intensa" | Estradiol, Progesterona, B6, Magnésio, Vit D |
| `/dor-pélvica-cronica-exames` | "cólica forte sempre" | CA-125, PCR-us, Ferritina, Estradiol |
| `/ciclo-irregular-exames` | "menstruação atrasada" | FSH, LH, AMH, Prolactina, TSH |
| `/sintomas-tireoide-exames` | "frio, cansaço, peso" | TSH, T4 livre, T3 livre, Anti-TPO |
| `/tentando-engravidar-exames` | "exames pré-concepcionais" | AMH, FSH, Progesterona dia 21, TSH, Anti-TPO |
| `/pós-parto-exames` | "exames após o parto" | Ferritina, TSH (pós-parto), B12, Hemograma |
| `/calorão-noturno-exames` | "calor à noite o que é" | FSH, Estradiol, TSH, Glicose |
| `/falta-de-libido-exames` | "libido baixa exames" | Testosterona, SHBG, DHEA-S, TSH |
| `/ganho-de-peso-sem-explicação-exames` | "engordando sem motivo" | TSH, Insulina, Cortisol, Vit D |
| `/insônia-mulher-exames` | "não consigo dormir" | Cortisol, Magnésio, Vit D, Progesterona |
| `/dor-de-cabeça-cíclica-exames` | "enxaqueca menstrual" | Estradiol, Progesterona, Magnésio, B6 |
| `/ansiedade-pms-exames` | "ansiedade antes da menstruação" | Progesterona, Magnésio, B6, Vit D |
| `/check-up-feminino-40-anos` | "check-up dos 40" | Painel completo + foco climatério |

Cada uma: 1.500 a 2.500 palavras, mesmo padrão de tabelas e CTAs.

## 3. Páginas comparativas com laboratórios (a arma secreta)

A brasileira **chega no Google com o laudo aberto na mão**. Ela já sabe qual laboratório fez o exame, e quer saber se o valor que ela viu "é normal" naquele laboratório específico.

Páginas a criar:

| URL | Conteúdo |
|---|---|
| `/como-interpretar-laudo-fleury` | Estrutura do laudo Fleury (cabeçalho, valor, faixa, observações), códigos comuns, abreviações específicas. CTA: "Cole seu laudo Fleury aqui". |
| `/como-interpretar-laudo-dasa` | Idem DASA. |
| `/como-interpretar-laudo-hermes-pardini` | Idem. |
| `/como-interpretar-laudo-sabin` | Idem (Brasília + Goiás). |
| `/como-interpretar-laudo-alta-diagnosticos` | Idem (São Paulo). |
| `/como-interpretar-laudo-lavoisier` | Idem (Rio + SP). |
| `/diferenças-fleury-dasa-hermes-pardini` | Comparação institucional. Faixas que diferem, terminologia específica. Quando uma paciente leva o laudo a um médico que prefere outro laboratório. |
| `/laudo-fleury-em-pdf-como-baixar` | Operacional ("como tirar o laudo do app Fleury"), captura o tráfego de mulheres que estão literalmente abrindo o app naquele momento. CTA: "Já está com o PDF? Cole aqui". |

Essas páginas têm volume menor mas **intenção altíssima**. Conversão Free→Pro nessas páginas costuma ser 3 a 5x acima do volume genérico, porque a usuária está literalmente com o laudo na mão.

**Cuidado jurídico**: não usar logo nem trade dress dos laboratórios. Mencionar pelo nome (fair use de menção descritiva) é OK. Não dar a entender parceria.

## 4. Palavras-chave de cauda longa (cluster por marcador)

Exemplo prático para "ferritina":

| Query | Volume estimado BR | Intenção |
|---|---|---|
| ferritina baixa | 18.000/mês | sintoma |
| ferritina alta | 8.000/mês | sintoma |
| ferritina 10 | 1.200/mês | resultado específico |
| ferritina 20 mulher | 800/mês | resultado + perfil |
| ferritina baixa cabelo caindo | 1.500/mês | sintoma + queixa |
| ferritina valores de referência fleury | 600/mês | branded |
| ferritina hermes pardini | 500/mês | branded |
| ferritina baixa gestação | 1.800/mês | fase + sintoma |
| ferritina baixa pós parto | 1.400/mês | fase + sintoma |
| ferritina baixa sintomas | 4.500/mês | sintoma |
| como aumentar ferritina | 6.000/mês | tratamento (não respondemos diretamente; redireciona à médica) |

Cada cluster precisa de uma página principal + FAQ rica que ataca as variantes de cauda longa.

Ferramentas para validar volumes:
- **SEMrush BR** ou **Ahrefs BR** (R$ 600-2000/mês, vale para mapeamento inicial)
- **Google Keyword Planner** com filtro Brasil + pt-BR
- **AnswerThePublic** com filtro BR
- **Ubersuggest BR** (Neil Patel, mais barato)
- **Google Trends BR** para sazonalidade

## 5. SEO técnico

### Configuração Vercel + Next-like (apesar de Decifra ser vanilla React)

Como Decifra usa Babel-in-browser, **as páginas SEO precisam ser HTML estático pré-renderizado**, não React puro. Crawling de páginas React puras pelo Googlebot funciona mas com indexação mais lenta e instável.

Recomendação: cada uma das ~80 páginas SEO acima é uma **`.html` estática** servida pela Vercel, gerada a partir de templates que injetam o conteúdo. O `app.jsx` SPA continua sendo a aplicação dinâmica para o fluxo de decifração. As páginas SEO viram conteúdo institucional fora do SPA.

Estrutura sugerida:

```
/index.html                                   (já é HTML, aponta para o SPA)
/exame/ferritina.html                         (página SEO)
/exame/tsh.html
/condicao/sop.html
/condicao/climaterio.html
/sintoma/queda-de-cabelo.html
/laudo/fleury.html
/laudo/dasa.html
... etc
```

Cada `.html` tem dentro:
- `<title>` único e otimizado
- `<meta description>` única
- `<link rel="canonical">` apontando para si mesma
- `<link rel="alternate" hreflang="pt-BR">` apontando para si mesma
- JSON-LD com `MedicalCondition`, `MedicalTest`, `FAQPage`, `Article` conforme aplicável
- Open Graph completo (image, title, description)
- Twitter Card
- Schema.org `BreadcrumbList`
- Imagens otimizadas (WebP, lazy load, alt descritivo)
- CSS crítico inline
- Footer com link para o SPA (para conversão)

### Sitemap

```
sitemap.xml na raiz
  - index page
  - 50 marker pages
  - 6 condition hubs
  - 12 condition long-tail
  - 15 symptom pages
  - 8 lab interpretation pages
  - blog / news (se houver)
```

Submeter no Google Search Console BR. Verificar Bing também (15% do tráfego BR de saúde vem de Bing).

### Core Web Vitals

Brasil tem conexão móvel pior que UK/US. O alvo é:

| Métrica | Alvo BR |
|---|---|
| LCP | <2,0s em 4G médio |
| INP | <150ms |
| CLS | <0,05 |
| Mobile score Lighthouse | >90 |

Significa: páginas estáticas, imagens otimizadas, fonts subset, sem JavaScript pesado nas páginas de conteúdo (SPA fica só na rota `/decifrar`).

### Schema.org prioritários

```json
{
  "@context": "https://schema.org",
  "@type": "MedicalWebPage",
  "name": "Ferritina: o que significa o seu resultado",
  "about": {
    "@type": "MedicalTest",
    "name": "Ferritina sérica",
    "code": { "@type": "MedicalCode", "code": "LP19161-2", "codingSystem": "LOINC" }
  },
  "audience": { "@type": "MedicalAudience", "audienceType": "Patient" },
  "lastReviewed": "2026-05-13",
  "reviewedBy": { "@type": "Physician", "name": "Dra. [Nome]", "identifier": "CRM/SP 123456" },
  "inLanguage": "pt-BR"
}
```

`reviewedBy` é o que faz o Google levar a sério páginas de saúde. Sem a revisora clínica nomeada, perdemos 40 a 60% do ranking potencial em queries YMYL.

## 6. Estratégia de backlinks

### Categoria 1: Sites brasileiros de saúde gerais (DR alto)

Pitch de guest post / menção / link earned:

| Site | Pitch |
|---|---|
| **Drauzio Varella** | Conteúdo de interpretação feminina; entrevista da fundadora sobre IA + saúde da mulher. |
| **Tua Saúde** | Eles já têm "ferritina baixa o que significa" rankeando. Pitch como ferramenta complementar, link como "para interpretar seu laudo pessoal". |
| **Minha Vida** | Idem. |
| **Manual MSD pt-BR** | Mais difícil, mas se conseguir é selo de qualidade. |
| **UOL VivaBem** | Pitch como ferramenta inovadora BR feita por brasileira (ângulo nacional). |
| **G1 / Globo Saúde** | Ângulo de "founder brasileira lança ferramenta de IA para saúde da mulher". |
| **AzMina** | Saúde feminina + tech. Parceria editorial. |
| **Marie Claire Brasil** | Casamento perfeito de tema. |
| **Vogue Brasil saúde** | Aspirational, mas se entrar gera muito backlink. |

### Categoria 2: Criadoras de saúde da mulher BR (Instagram/TikTok/YouTube)

Lista de pitch (verificar handles atuais antes de mandar):

- **@dra.thais.de.souza** (ginecologista, ~500k seguidores)
- **@drsanitamacedo** (climatério, fertilidade)
- **@drabarbarataub** (endocrinologia feminina)
- **@drahalanagrota** (saúde da mulher integrativa)
- **@drahelenadalt** (ginecologia integrativa)
- **@drhelenahenker** (saúde íntima)
- **@drmichelleflorentino** (climatério)
- **@drmarinaludovice** (endometriose)
- **@portalsop** (comunidade SOP, comunidade prática)
- **@endometriose_brasil** (comunidade)
- **@maesquetrabalham** (públicas mães)

Modelo do pitch: oferecer **uso gratuito vitalício** + co-marketing (post conjunto) + créditos de "ferramenta utilizada pela Dra. X" no site Decifra. Não pedir cashback.

### Categoria 3: Comunidades e grupos

- **SOP Brasil** (Facebook ~80k membros, Telegram, WhatsApp)
- **Endometriose Brasil** (vários grupos regionais)
- **Climatério sem Mistério** (comunidade Telegram)
- **Mulheres 40+** (grupos Facebook)
- **Mães que amam** (grupo de gestantes/pós-parto)
- **r/BrasilMulher** (Reddit BR feminino)
- **r/Brasil** seção saúde

Compartilhar de forma genuína. Postar uma vez como ferramenta, depois engajar nas conversas normalmente.

### Categoria 4: Citação por laboratórios (alvo aspiracional)

Os blogs próprios dos labs publicam conteúdo educacional. Eles **não vão linkar competitor direto**, mas podem citar a Decifra como ferramenta complementar de paciente se posicionarmos certo:

- **Fleury Saúde** (saude.fleury.com.br) — pitch como "ferramenta utilizada por pacientes para acompanhar tendências entre laudos"
- **DASA Saúde** (dasa.com.br/saude) — idem
- **Hermes Pardini** (hermespardini.com.br/blog)
- **Sabin Saúde** (sabin.com.br/saude)

Caminho realista: começar como **convidada em podcast ou webinar** de educação do laboratório. Eles têm canais de marketing para pacientes. Decifra entra como "case de saúde digital feminina brasileira" sem disputar mercado direto.

## 7. Distribuição e amplificação por canal

### Pinterest BR (subestimado, especialmente saúde da mulher)

Brasil tem 50M de usuárias Pinterest, 78% mulheres, e saúde feminina é um dos top 5 verticals. Pinterest gera tráfego SEO de longo prazo (pins ranqueiam por meses).

**Estratégia Pinterest**:
- 1 board por marcador (50 boards) com pins linkando para a página SEO
- Infográficos das faixas de referência por laboratório (esses viralizam)
- Pins verticais 1000×1500px, com texto em pt-BR overlay
- Frequência: 5-10 pins por dia inicialmente, automatizado via Tailwind ou Pinterest Schedule

### TikTok BR

Saúde da mulher BR é um nicho explosivo no TikTok. Conteúdo educativo de 30-60s.

Frequência: 3 a 5 vídeos por semana, ângulos:
- "Ferritina baixa: 3 sinais que aparecem antes da anemia"
- "Como ler o seu laudo Fleury em 30 segundos"
- "Por que o ginecologista pediu TSH e você nem sabe o que é"
- "PMS forte? Esses 4 exames podem te dar resposta"

Cada vídeo termina com "link na bio" para a página específica.

### YouTube BR (long-form)

10 a 12 minutos por vídeo, modelo "explainer". Ranqueia em buscas YouTube + Google.

Tópicos prioritários:
- "Como interpretar seu primeiro laudo de hormônios femininos"
- "Os 5 exames que toda mulher de 40+ deveria fazer (segundo a FEBRASGO)"
- "TSH alterado: o que significa para mulheres"
- "AMH: o exame que toda mulher tentando engravidar deveria conhecer"

YouTube tem o bonus de gerar backlinks (via descrição) + impressões em "vídeos em destaque" do Google.

### Instagram

Não tentar viralizar. Manter como "trust signal" durante a jornada de conversão:
- Posts educacionais 2 a 3 vezes por semana
- Stories diários com mini-explicações
- Reels recortando o conteúdo do TikTok
- Bio com link para uma página de captura (não para o site inteiro)

### Newsletter

Newsletter quinzenal "Decifrações da semana": 1 marcador em foco, 1 dúvida real de paciente, 1 link de leitura. Public-friendly, gentil. Substack Brasil ou ConvertKit. Cresce com a base.

### Podcasts de saúde da mulher BR (aparecer como convidada)

- **Café com a Médica** (Dra. Carolina Reis)
- **Em Pauta com Médicas** (Dra. Beatriz Bernardes)
- **Mulheres que Brilham**
- **Maternidade às Avessas**
- **Pílulas da Médica** (vários)

Cada aparição vale 2 a 5 backlinks editoriais + leads orgânicos por semanas.

## 8. Conteúdo institucional para autoridade

Além das páginas de marcadores e condições, três peças institucionais:

1. **`/sobre`** — quem é Luana, formação, certificação em localização, missão Decifra. Foto humana, CRM se for médica (não é), parcerias clínicas se houver. Essa página converte trust diretamente.
2. **`/metodo`** — versão pública da ADR 0001 + science page. Como a tecnologia funciona, quais modelos, por que dois passos (Sonnet + Sabiá). Brasileira informada respeita transparência.
3. **`/imprensa`** — kit de imprensa com foto, bio, números, screenshots, links para reportagens. Facilita aparições em mídia.

## 9. Métricas e revisão trimestral

### KPIs a acompanhar (Google Search Console + Google Analytics 4)

| KPI | Mês 3 | Mês 6 | Mês 12 |
|---|---|---|---|
| Visitas orgânicas mensais | 3k | 15k | 50k |
| Páginas indexadas | 50 | 80 | 100+ |
| Posição média top 10 queries | 30 | 15 | 8 |
| Clicks "Decifre seu laudo" do orgânico | 200/mês | 1.500/mês | 5.000/mês |
| Conversão orgânico → free signup | 4% | 6% | 8% |
| Conversão free → Pro | 3% | 5% | 6% |
| Backlinks DR>40 | 5 | 15 | 40 |
| Páginas no top 3 (qualquer query) | 5 | 30 | 100 |

### Revisão trimestral obrigatória

A cada 3 meses, revisar:
- Mudanças em diretrizes FEBRASGO/SBEM (afetam conteúdo clínico)
- Atualizações dos labs (Fleury muda faixa de referência ocasionalmente; precisamos refletir)
- Concorrentes novos
- Decisões do Google sobre páginas YMYL (Your Money Your Life), categoria onde saúde está

## 10. Roadmap de execução

### Mês 1
- Configurar Search Console BR + GA4 + Bing Webmaster
- Definir revisora clínica nomeada (pré-requisito YMYL)
- Criar template HTML estático para páginas de marcador
- Publicar 10 páginas de marcador (top 10 mais buscados)
- Submeter sitemap

### Mês 2
- 20 páginas adicionais de marcador (top 11 a 30)
- 3 páginas de condição hub (SOP, Climatério, Fertilidade)
- 5 páginas de sintoma
- 3 páginas de laboratório (Fleury, DASA, Hermes Pardini)
- Lançar Pinterest com 50 pins iniciais
- Pitches a 5 criadoras de Instagram

### Mês 3
- Completar 50 marcadores
- 3 últimas condições hub
- 10 páginas de sintoma adicionais
- Publicar página `/sobre` e `/metodo`
- 4 vídeos TikTok / semana
- 1 vídeo YouTube / mês
- Primeira apariçao em podcast

### Mês 4 a 6
- 12 sub-páginas long-tail por condição
- 8 a 10 páginas de laboratórios (cobrir os 6 grandes + sub-regionais)
- 2 a 3 guest posts em sites de saúde gerais
- 5 a 7 parcerias com criadoras
- Lançar newsletter

### Mês 7 a 12
- Iteração baseada em data: dobrar nas páginas que ranqueiam, fundir as que não estão indo
- Expandir para vídeo (YouTube weekly)
- Buscar 1 a 2 aparições em mídia BR (Marie Claire, UOL, Folha)
- Pitch a pelo menos um laboratório para featuring

## 11. Orçamento estimado (rough)

| Item | Custo BR/ano |
|---|---|
| Ferramenta SEO (SEMrush ou Ahrefs) | R$ 10.000 |
| Revisora clínica (R$ 800-1.500/revisão, 12 revisões/ano) | R$ 12.000 a R$ 18.000 |
| Criação de conteúdo (50 páginas × R$ 300-500 ghostwriter brasileiro + edição) | R$ 15.000 a R$ 25.000 |
| Design infográficos (~50 × R$ 80) | R$ 4.000 |
| Editor de vídeo TikTok/YouTube freelance | R$ 1.500/mês × 12 = R$ 18.000 |
| Boost pago pontual (Pinterest, Instagram para validar) | R$ 5.000 |
| Pitches a podcasts (PR boutique BR pequena) | R$ 8.000 |
| **Total estimado ano 1** | **R$ 72.000 a R$ 88.000** |

Comparado ao CAC (Custo de Aquisição de Cliente) de um app de saúde BR pago via Meta Ads (R$ 80-150 por usuário, R$ 200-400 por Pro), 50k visitas orgânicas/mês ao final do ano 1 representam 3.000+ Pro signups a CAC efetivo muito mais baixo. Economicamente racional.

## 12. Decisões pendentes suas

1. **Quanto investir no ano 1?** R$ 72k (essencial) ou R$ 88k (com PR boutique)?
2. **Quem escreve as 80 páginas?** Você sozinha + IA, ou ghostwriters brasileiros direcionados? Recomendo modelo híbrido: você + IA fazem o draft, revisora clínica valida, ghostwriter polish para tom.
3. **Pinterest e TikTok**: você executa pessoalmente (fundadora rosto), ou contrata creator BR?
4. **Newsletter desde já ou esperar 3 meses?** Recomendo desde o mês 1, mesmo com 50 inscritas. Cresce orgânicamente.
5. **Aparições em mídia**: prefere alta-cultura (Marie Claire, Vogue) ou alcance puro (Drauzio, Tua Saúde)? Têm trade-offs diferentes.
