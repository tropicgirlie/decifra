# Localising my own product: notes from De-coding Decode into Decifra

*A founder, a localisation course, and a Brazilian sister product. What AI did, what I did, what I am paying humans to do. And the question I keep circling: is localisation another role AI will make disappear?*

By Luana Micheau · May 2026

---

## English version

### The starting point

I shipped Decode (decode.femhealth.science) earlier this year. It is a women's-health interpreter for lab reports, with female-specific clinical context on every marker, life-stage awareness, and a strict "we only show what is in your report" rule. Beta users in the UK liked it. A LinkedIn post about the life-stage context feature went around.

Then a question started showing up in my own head and in DMs from Brazilian friends: when does this come to Brazil?

The honest answer was that Decode could not just be translated. Brazilian lab panels emphasise different markers. The dominant labs (Fleury, DASA, Hermes Pardini, Sabin) print laudos in their own conventions. The legal regime is LGPD, not GDPR, with stricter rules for sensitive health data. And the brand voice would not survive a literal translation. "Discuss with your GP" lands flat in pt-BR. The GP does not exist in Brazil. "Converse com sua ginecologista" does the same work and sounds like a real Brazilian doctor.

So I forked the repo. New brand: Decifra (the verb "to decipher", with the same "D" mark in the favicon). New Supabase project in São Paulo for LGPD data residency. New domain at registro.br. Then I sat down to do the work.

### What I did myself

I have a localisation certificate from a previous life, plus the obvious advantage of being Brazilian. That meant the strategic and cultural layer was mine to lead.

I made the brand call. "Decifra" beat "Lúcida", "Clara", and "Nítida" because it preserves the action-verb energy of "Decode" while sounding native, and the "D" favicon system carried over with zero design rework. I checked domain availability at registro.br before locking it in.

I made the voice decisions. "Climatério" instead of "perimenopausa", because FEBRASGO and Brazilian endocrinologists use climatério. "SOP" universally instead of "PCOS", because no Brazilian woman thinks "PCOS" first. "Laudo" for the lab document, never "relatório", because relatório is what an HR person produces, not a laboratory. "Converse com sua ginecologista" instead of any of the GP-flavoured English referrals. "Gestação" and "gestante" in formal copy, "grávida" only when we needed colloquial warmth.

I made the architecture call that changed everything. The first version used Maritaca's Sabiá-3 (a Brazilian-trained LLM) as the primary interpretation model. After staring at the outputs I asked myself: is Sabiá really doing the clinical reasoning here, or is it just sounding fluent in Portuguese? The honest answer was the second. So I redesigned the pipeline. Claude Sonnet 4.5 reasons clinically in English. Sabiá-3 translates the English JSON into native Brazilian Portuguese with a doctor's voice. Best tool for each job. I wrote an ADR documenting the decision so future-me does not undo it on a tired Tuesday.

I caught the cultural blind spots. Brazilian women send lab results as WhatsApp photos. The English Decode only accepted PDFs and text. So I added image upload (JPG, PNG, max 5 images per request) using Claude Haiku 4.5 vision. The lab report your tia just photographed on her kitchen table goes straight to the AI.

### What AI did

AI, mostly Claude in Cursor and Claude Code, did the labour I would not have time to do alone.

First-pass translation of about 700 strings across `app.jsx`, `index.html`, `manifest.json`, the API prompts in `api/extract.js` and `api/summary.js`, and the marketing OG renderer. Not perfect. The first pass missed ~30 strings (paywall modal, signup page, error states, upload hints). A second pass with grep found them. A third pass to enforce the no-em-dash rule.

Polish passes against the glossary I wrote. When I decided "climatério" was canonical, the AI applied that decision across every file in seconds. When I added a rule that "diagnóstico" cannot appear in user-facing copy (Decifra does not diagnose; legally and ethically), the AI swept the codebase. When I converted mmol/L thresholds to mg/dL for Brazilian lab conventions in 50 marker entries, the AI did the conversion arithmetic and the rewrite.

Architecture documentation. Glossary. ADR. A native-reviewer questionnaire I would have procrastinated for months. Three living docs in `docs/` that capture the why, not just the what, for whoever comes after me.

This is the part the productivity tweets get right. The brute labour of localisation is gone. What used to take a junior translator two weeks now takes me an afternoon of directed work.

### What I am outsourcing

Three things, paid, before public soft-launch:

**Clinical review by a Brazilian gynecologist or endocrinologist.** The marker dictionary has 50 entries with 5 fields each. AI translated them and applied my unit conversions. But "is this clinically correct in 2026 Brazil" is a human question. FEBRASGO updates guidelines. The PCOS terminology was apparently revised this week (I am still confirming what changed). A real doctor reads the dictionary and the clinical panels, flags errors, suggests Brazilian-specific framing.

**LGPD legal review.** Privacy policy, consent strings, sensitive-data clauses. I wrote it referencing Art. 7, 11, 18, 41 of the Lei Geral de Proteção de Dados. A lawyer with health-sector LGPD experience signs off, or I do not launch.

**Native reader testing.** Eventually, real Brazilian women from the target audience reading the app and telling me what feels translated, what feels foreign, what they would never say. Not via formal usability study. Just three or four women I trust, with WhatsApp voice notes coming back.

### So, is localisation a role AI will make disappear?

The role does not disappear. The shape of the role changes.

What disappears or shrinks dramatically:
- The cheap-and-fast translation gig market. "Here is a 5-page document, give me a quote." That work is now a few API calls.
- The fully entry-level translator job. The intern who does 90% words and 10% judgment. AI does the 90% better and faster.
- The agency layer that adds 30% margin on bulk translation work without adding linguistic insight.

What stays, or grows:
- Strategic decisions about voice, tone, register, glossary. AI cannot tell me whether climatério or perimenopausa lands better with a 45-year-old paulistana, because it has not been her. I can.
- Cultural fluency. AI did not suggest image upload for WhatsApp lab photos. AI did not know that Brazilian patients photograph rather than export PDFs. That came from being from there.
- Architecture-of-AI decisions. Choosing Claude Sonnet for reasoning and Sabiá-3 for translation in a two-step pipeline was a human strategic call. AI helped me execute it, but the design was mine.
- Domain expertise as a gate. Brazilian medical terminology. LGPD. CFM Resolution 2.314. A non-domain-expert can ship something that reads fluent but is clinically wrong or legally exposed. The senior localizer becomes a domain-PM.
- QA and review orchestration. Writing the questionnaire for the native reviewer, designing the multi-pass review, managing the glossary as a living artefact: this is project management work that absorbed about a third of my localisation time.

The localizer of 2030 is closer to a localisation product manager than to a translator. She owns voice, glossary, cultural fit, AI pipeline design, vendor management of specialist reviewers (medical, legal), and QA. She writes very little raw translation. She makes a lot of decisions.

My localisation certificate from years ago is not obsolete. The methodology, the awareness of register, the discipline of glossaries, the understanding that translation is the smallest part of localisation: those carried me through this project. If anything, the certificate is more valuable now, because the people who only know how to translate words have a shrinking moat, and the people who understand the whole craft have a growing one.

If you are thinking about getting into localisation in 2026, do not learn to translate. Learn to direct AI translation, build glossaries, run native review programs, make architecture decisions about which model does which job, and understand the cultural and regulatory context of your target market. That role is not going anywhere.

---

## Versão em português

### O ponto de partida

Lancei a Decode (decode.femhealth.science) no começo deste ano. É uma interpretadora de exames laboratoriais voltada para a saúde feminina, com contexto clínico específico para mulheres em cada marcador, sensibilidade à fase da vida, e a regra rígida de "só mostramos o que está no seu exame". Usuárias da beta no Reino Unido gostaram. Um post no LinkedIn sobre a função de contexto por fase da vida circulou.

Aí uma pergunta começou a aparecer na minha cabeça e nas mensagens de amigas brasileiras: quando isso chega no Brasil?

A resposta honesta era que a Decode não podia ser apenas traduzida. Os painéis laboratoriais brasileiros enfatizam marcadores diferentes. Os laboratórios dominantes (Fleury, DASA, Hermes Pardini, Sabin) emitem laudos com suas próprias convenções. O regime legal é a LGPD, não a GDPR, com regras mais rígidas para dados sensíveis de saúde. E a voz da marca não sobreviveria a uma tradução literal. "Discuss with your GP" não funciona em pt-BR. O GP nem existe no Brasil. "Converse com sua ginecologista" faz o mesmo trabalho e soa como uma médica brasileira de verdade.

Então forkei o repositório. Marca nova: Decifra (do verbo decifrar, com o mesmo "D" no favicon). Novo projeto Supabase em São Paulo para residência de dados sob a LGPD. Domínio novo no registro.br. Aí sentei para fazer o trabalho.

### O que fiz eu mesma

Tenho um certificado de localização de uma vida anterior, mais a vantagem óbvia de ser brasileira. Isso significou que a camada estratégica e cultural era minha para liderar.

Tomei a decisão de marca. "Decifra" ganhou de "Lúcida", "Clara" e "Nítida" porque preserva a energia de verbo-de-ação da "Decode" enquanto soa nativo, e o sistema de favicon com a letra "D" foi reaproveitado sem retrabalho de design. Confirmei a disponibilidade do domínio no registro.br antes de fechar a escolha.

Tomei as decisões de voz. "Climatério" em vez de "perimenopausa", porque a FEBRASGO e a endocrinologia brasileira usam climatério. "SOP" universalmente em vez de "PCOS", porque nenhuma brasileira pensa "PCOS" primeiro. "Laudo" para o documento laboratorial, nunca "relatório", porque relatório é o que um RH produz, não um laboratório. "Converse com sua ginecologista" no lugar de qualquer encaminhamento com sabor de GP inglês. "Gestação" e "gestante" em copy formal, "grávida" só quando a gente precisava de calor coloquial.

Tomei a decisão de arquitetura que mudou tudo. A primeira versão usava o Sabiá-3 (LLM treinado no Brasil pela Maritaca) como modelo primário de interpretação. Depois de olhar as saídas eu me perguntei: o Sabiá está fazendo o raciocínio clínico aqui, ou está apenas soando fluente em português? A resposta honesta era a segunda. Então redesenhei o pipeline. Claude Sonnet 4.5 raciocina clinicamente em inglês. Sabiá-3 traduz o JSON em inglês para português brasileiro nativo, com voz de médica. Ferramenta certa para cada função. Escrevi um ADR documentando a decisão para que a Luana-do-futuro não desfaça numa terça-feira cansada.

Identifiquei os pontos cegos culturais. Brasileiras mandam resultados de exames como foto no WhatsApp. A Decode em inglês só aceitava PDF e texto. Então adicionei upload de imagem (JPG, PNG, máximo 5 fotos por requisição) usando o Claude Haiku 4.5 com visão. A foto que sua tia tirou do laudo na mesa da cozinha vai direto para a IA.

### O que a IA fez

A IA, principalmente Claude no Cursor e no Claude Code, fez o trabalho braçal que eu não teria tempo de fazer sozinha.

Tradução de primeira passada de cerca de 700 strings em `app.jsx`, `index.html`, `manifest.json`, nos prompts das APIs em `api/extract.js` e `api/summary.js`, e no renderizador de OG do marketing. Não perfeita. A primeira passada deixou escapar uns 30 strings (modal do paywall, página de cadastro, estados de erro, dicas de upload). Uma segunda passada com grep encontrou tudo. Uma terceira passada para garantir a regra de zero travessões.

Passadas de polimento contra o glossário que escrevi. Quando decidi que "climatério" era canônico, a IA aplicou a decisão em todos os arquivos em segundos. Quando adicionei a regra de que "diagnóstico" não pode aparecer em copy de usuária (a Decifra não diagnostica, legal e eticamente), a IA varreu o código. Quando converti os limites de mmol/L para mg/dL nas 50 entradas do dicionário de marcadores, a IA fez a aritmética da conversão e a reescrita.

Documentação de arquitetura. Glossário. ADR. Um questionário para revisora nativa que eu adiaria por meses. Três documentos vivos em `docs/` que capturam o porquê, não apenas o quê, para quem vier depois de mim.

Essa é a parte que os tweets sobre produtividade acertam. O trabalho braçal da localização sumiu. O que antes levava duas semanas de uma tradutora júnior agora leva uma tarde de trabalho dirigido.

### O que vou contratar

Três coisas, pagas, antes do soft-launch público:

**Revisão clínica por uma ginecologista ou endocrinologista brasileira.** O dicionário de marcadores tem 50 entradas com 5 campos cada. A IA traduziu e aplicou minhas conversões de unidade. Mas "isso está clinicamente correto no Brasil de 2026" é pergunta humana. A FEBRASGO atualiza diretrizes. A nomenclatura da SOP aparentemente foi revista esta semana (ainda estou confirmando o que mudou). Uma médica real lê o dicionário e os painéis clínicos, sinaliza erros, sugere enquadramento brasileiro.

**Revisão jurídica de LGPD.** Política de privacidade, strings de consentimento, cláusulas de dados sensíveis. Escrevi referenciando os artigos 7, 11, 18 e 41 da Lei Geral de Proteção de Dados. Uma advogada com experiência em LGPD no setor de saúde assina embaixo, ou eu não lanço.

**Teste com leitoras nativas.** Mais para frente, brasileiras reais do público-alvo lendo o app e me dizendo o que parece traduzido, o que soa estrangeiro, o que elas nunca falariam. Não via estudo de usabilidade formal. Apenas três ou quatro mulheres em quem eu confio, com áudios de WhatsApp voltando.

### Então, localização é mais um papel que a IA vai fazer desaparecer?

O papel não desaparece. A forma do papel muda.

O que desaparece ou encolhe drasticamente:
- O mercado de tradução barata e rápida. "Aqui está um documento de 5 páginas, me dá um orçamento." Esse trabalho são algumas chamadas de API agora.
- O cargo totalmente entry-level de tradutora. A estagiária que faz 90% palavras e 10% julgamento. A IA faz os 90% melhor e mais rápido.
- A camada de agência que adicionava 30% de margem em trabalho de tradução em volume sem adicionar insight linguístico.

O que fica, ou cresce:
- Decisões estratégicas sobre voz, tom, registro, glossário. A IA não consegue me dizer se "climatério" ou "perimenopausa" cai melhor com uma paulistana de 45 anos, porque ela nunca foi essa mulher. Eu fui.
- Fluência cultural. A IA não sugeriu upload de imagem para fotos de WhatsApp. A IA não sabia que pacientes brasileiras fotografam em vez de exportar PDFs. Isso veio de ser de lá.
- Decisões de arquitetura de IA. Escolher Claude Sonnet para raciocínio e Sabiá-3 para tradução em um pipeline de dois passos foi uma decisão estratégica humana. A IA me ajudou a executar, mas o desenho foi meu.
- Expertise de domínio como filtro. Terminologia médica brasileira. LGPD. Resolução CFM 2.314. Quem não é especialista de domínio pode lançar algo que soa fluente mas é clinicamente errado ou juridicamente exposto. A localizadora sênior vira uma espécie de PM de domínio.
- Orquestração de QA e revisão. Escrever o questionário para a revisora nativa, desenhar a revisão em várias passadas, gerir o glossário como artefato vivo: isso é trabalho de gestão de projeto que absorveu uns 30% do meu tempo de localização.

A localizadora de 2030 é mais próxima de uma PM de localização do que de uma tradutora. Ela é dona da voz, do glossário, do encaixe cultural, do desenho do pipeline de IA, da gestão de fornecedoras especialistas (médica, jurídica), e do QA. Ela escreve pouquíssima tradução crua. Toma muitas decisões.

Meu certificado de localização de anos atrás não está obsoleto. A metodologia, a consciência de registro, a disciplina do glossário, o entendimento de que tradução é a menor parte da localização: foi isso que me carregou neste projeto. Se algo, o certificado vale mais agora, porque quem só sabe traduzir palavras tem um diferencial cada vez menor, e quem entende o ofício inteiro tem um diferencial cada vez maior.

Se você está pensando em entrar em localização em 2026, não aprenda a traduzir. Aprenda a dirigir tradução por IA, a construir glossários, a rodar programas de revisão nativa, a tomar decisões de arquitetura sobre qual modelo faz qual trabalho, e a entender o contexto cultural e regulatório do seu mercado-alvo. Esse papel não está indo a lugar nenhum.

---

*Decifra está em beta privada. Brasileiras interessadas em testar: contato@decifra.com.br.*

*Decifra is in private beta. Brazilian women interested in testing: contato@decifra.com.br.*
