# Decifra

Interpretação de exames laboratoriais femininos com contexto clínico, para o mercado brasileiro. Produto irmão da Decode (decode.femhealth.science), adaptado linguisticamente, clinicamente e regulatoriamente para o Brasil.

## Stack

Idêntico ao Decode, com uma diferença no modelo de interpretação:

- Vanilla React via Babel no navegador, single-file `app.jsx`, sem build step
- HTML/CSS estático
- Vercel para hospedagem (`/api` rotas Node serverless)
- **Anthropic Claude Haiku 4.5** para extração de marcadores em `api/extract.js` (suporta texto, PDF e fotos do laudo via JPG/PNG)
- **Pipeline de dois passos para interpretação clínica** em `api/summary.js` (ver [ADR 0001](docs/adr/0001-summary-model-pipeline.md)):
  1. **Claude Sonnet 4.5** raciocina sobre os marcadores e o contexto da paciente, produzindo o JSON da interpretação em inglês.
  2. **Maritaca Sabiá-3** traduz o JSON para português brasileiro nativo, com voz clínica brasileira e convenções locais (mUI/L, vírgula decimal, convênio/SUS, CFM/CRM).
  Se Sabiá-3 falhar, o próprio Claude faz a tradução em uma chamada de fallback. Se tudo falhar, devolvemos o inglês com flag.
- Supabase para persistência de conta + contexto (projeto separado em São Paulo)
- Stripe para pagamento (BRL, com PIX opcional. Deferido para pós-MVP.)

## Diferenças em relação ao Decode (EN)

| Área | Decifra |
|---|---|
| Idioma | Português do Brasil (pt-BR) em toda a UI, prompts e meta tags |
| Marca | "Decifra" (mesmo "D" no favicon, mesmo sistema de cores burgundy/copper) |
| Domínio | `decifra.com.br` (registrar via Registro.br) |
| Sample report | Formato brasileiro (vírgula decimal, mUI/L, "ng/mL", inclui hemograma) |
| Marcadores | `markerSystem()` e `ABSENT_SUBTITLES` aceitam tanto inglês quanto português (FERRITINA / FERRITIN, GLICOSE / GLUCOSE, etc.) |
| Contexto da paciente | Mesmas 6 opções, com "Climatério" (termo brasileiro padrão) em vez de "Perimenopause" |
| Política de privacidade | Reescrita para LGPD (art. 7º, 11, 18, 33). DPO designada: `encarregado@decifra.com.br` |
| API prompts | Instruem o modelo a produzir saída em pt-BR, com unidades brasileiras e referências culturais (CFM/CRM, SUS, convênio, Fleury, DASA) |
| Supabase | Projeto separado em região `sa-east-1` (São Paulo) para residência de dados LGPD |
| OG image | Texto em português, mesma ilustração de células sobrepostas |

## Passos de lançamento (executar manualmente)

### 1. Registrar o domínio

Acesse [registro.br](https://registro.br) e registre `decifra.com.br`. Requer CPF (pessoa física) ou CNPJ (pessoa jurídica). Custo aproximado: R$ 40/ano.

Se `decifra.com.br` estiver indisponível, alternativas: `decifra.app.br`, `decifrasaude.com.br`, ou rebrandear (veja `Brand options` no plano).

### 2. Criar projeto Supabase

1. Acesse [supabase.com/dashboard](https://supabase.com/dashboard) e clique em **New project**.
2. Configurações:
   - Name: `decifra-prod`
   - Region: **South America (São Paulo) — sa-east-1** (crítico para LGPD)
   - Database password: gere forte e guarde
3. Após criação, vá em **Settings → API** e copie:
   - `URL` (cole no app.jsx em `SUPABASE_URL`)
   - `anon public` key (cole em `SUPABASE_ANON_KEY`)
4. Abra **SQL Editor** e rode:
   ```sql
   create table femdecode_users (
     email text primary key,
     tier text default 'free',
     pro_expires_at timestamptz,
     context jsonb,
     created_at timestamptz default now()
   );

   create table decode_reports (
     id uuid default gen_random_uuid() primary key,
     marker text,
     value text,
     unit text,
     reference_range text,
     issue_type text,
     note text,
     report_name text,
     user_email text,
     created_at timestamptz default now()
   );
   ```
5. Habilite RLS conforme política da Decode original (acesso anon apenas para insert em `decode_reports`).

### 3. Criar projeto Vercel

1. Crie repositório no GitHub: `tropicgirlie/decifra`.
2. Push do conteúdo deste diretório:
   ```bash
   cd /Users/Dublin-Osx/code/Decifra
   git init
   git add .
   git commit -m "Initial commit: Decifra fork from Decode EN"
   git remote add origin git@github.com:tropicgirlie/decifra.git
   git push -u origin main
   ```
3. Em [vercel.com](https://vercel.com), **Import Project** → escolha o repositório.
4. Configure variáveis de ambiente:
   - `ANTHROPIC_API_KEY` (extração de marcadores em `api/extract.js`, e fallback de interpretação em `api/summary.js`)
   - `MARITACA_API_KEY` (modelo primário de interpretação Sabiá-3 em `api/summary.js`. Veja passo 5b)
   - `SUPABASE_URL` (do passo 2)
   - `SUPABASE_ANON_KEY` (do passo 2)
   - `JWT_SECRET` (gerar com `openssl rand -base64 32`)
   - `STRIPE_SECRET_KEY` e `STRIPE_WEBHOOK_SECRET` (quando ativar pagamentos, ainda BRL via Stripe BR)
5. Em **Domains**, adicione `decifra.com.br` e `www.decifra.com.br`. Aponte os DNS no Registro.br conforme as instruções da Vercel.

### 4. Atualizar `SUPABASE_URL` e `SUPABASE_ANON_KEY` no código

Edite `app.jsx` linhas 4-5 com as credenciais do projeto Decifra (atualmente apontam para o Supabase da Decode EN):

```js
const SUPABASE_URL = "https://SEU_PROJETO_DECIFRA.supabase.co";
const SUPABASE_ANON_KEY = "SEU_ANON_KEY";
```

### 5. Configurar conta Anthropic e crédito

- Use a mesma chave da Decode EN ou crie chave separada em [console.anthropic.com](https://console.anthropic.com/) para isolar o faturamento.
- Adicione crédito (R$ 100 / US$ 20 cobre os primeiros 100 a 200 decifrações).
- Configure alerta de saldo baixo.
- Anthropic continua sendo usada em `api/extract.js` (Haiku 4.5 para extração de texto e visão).

### 5b. Configurar conta Maritaca (Sabiá-3) para a localização da interpretação

- Crie conta em [plataforma.maritaca.ai](https://plataforma.maritaca.ai/) e gere uma chave em "Criar nova chave".
- Adicione `MARITACA_API_KEY` às variáveis de ambiente da Vercel (Production + Preview + Development) e ao `.env.local` para desenvolvimento.
- **Papel da Sabiá-3**: traduzir e localizar para português brasileiro nativo o JSON em inglês que Claude Sonnet 4.5 produz no passo 1. Não é responsável pelo raciocínio clínico. Veja [ADR 0001](docs/adr/0001-summary-model-pipeline.md) para o porquê dessa separação.
- Se a Maritaca ficar indisponível ou retornar JSON com forma inválida, `api/summary.js` chama Claude novamente para traduzir. Em último caso, devolve o inglês com `_translation_status: "failed_en"` para o cliente lidar.
- `ANTHROPIC_API_KEY` é obrigatória em produção (raciocínio + fallback). `MARITACA_API_KEY` é fortemente recomendada mas opcional.
- Faturamento Maritaca é em BRL, separado do Anthropic. Monitore os dois.

### 6. Designar Encarregada de Dados (DPO)

A LGPD exige (art. 41) que o controlador indique uma Encarregada. Pode ser a própria fundadora numa fase inicial. Crie alias `encarregado@decifra.com.br` que encaminha para seu e-mail pessoal. Atualize qualquer documentação interna com o nome dela.

### 7. Revisar copy com falante nativo

Toda a UI foi traduzida com cuidado, mas:

- Mande para uma brasileira nativa revisar tom e termos (especialmente os SCAN_TIDBITS clínicos e os labels de SYSTEM_ORDER)
- Confirme que termos como "climatério" vs "perimenopausa" soam certos para o público-alvo
- A Política de Privacidade deve ser revisada por advogado(a) com experiência em LGPD antes de produção

### 8. Soft-launch beta

- Mantenha `BETA_FREE_MODE = true` para os primeiros usuários
- Promova em redes brasileiras (grupos de mulheres, médicas, doulas, mães), Instagram, LinkedIn
- Configure o e-mail `contato@decifra.com.br` para receber feedback (encaminhe para o pessoal)
- Pico de testes esperado nos primeiros 2 dias após divulgação

## Estrutura do código

Idêntica à Decode EN. Arquivos críticos:

```
/Users/Dublin-Osx/code/Decifra/
├── app.jsx                                    Componentes React (~232 KB)
├── index.html                                 Entry point, meta tags pt-BR
├── manifest.json                              PWA pt-BR
├── styles.css                                 Estilos (sem mudanças vs EN)
├── illustrations/                             23 ilustrações orgânicas (reaproveitadas, agnósticas de idioma)
├── icons/                                     Favicon "D" + ícones PWA (regenerados via scripts/render-icons.mjs)
├── og.png                                     OG image em pt-BR (regenerada via scripts/render-og.mjs)
├── api/
│   ├── extract.js                             Prompt traduzido + lista de labs brasileiros
│   ├── summary.js                             Prompt traduzido, contexto pt-BR, saída pt-BR
│   ├── checkout.js                            Stripe (deferido)
│   ├── webhook.js                             Stripe webhook (deferido)
│   ├── verify-payment.js                      Stripe (deferido)
│   └── migrations/
│       └── 2026-05-08-context-column.sql      Migração para coluna context em femdecode_users
└── scripts/
    ├── render-og.mjs                          Gera og.png a partir de canvas + HTML overlay
    └── render-icons.mjs                       Gera favicons + ícones PWA
```

## O que NÃO foi traduzido (deferido para v2)

Para entregar o MVP rapidamente, alguns conteúdos permanecem em inglês ou herdados do Decode:

- **Páginas da enciclopédia de marcadores** (Markers, Science, Mobile) — não fazem parte do fluxo principal de uso
- **CLINICAL_PANELS** (~700 linhas de texto clínico detalhado por painel: SOP, endometriose, fertilidade, climatério, menopausa) — usado dentro da página Markers, deferido
- **App React Native** (`rn/` no Decode original) — não foi copiado; v2
- **PreviewGate** (paywall) — bypassed por `BETA_FREE_MODE = true`, mas se você desligar a beta, o texto da página de unlock ainda está em inglês
- **4 páginas SEO standalone** (PCOS, fertilidade, tireoide, climatério) — não foram copiadas; precisam ser escritas do zero em pt-BR para a estratégia de SEO brasileira

## Verificação

Antes de promover:

1. Rode `vercel dev` localmente, navegue por:
   - Home (verifique pt-BR sem nenhum fragmento em inglês)
   - Decifrar → Carregar exame de exemplo → Continuar → Decifrar
   - Confirme que a tela de carregamento mostra steps em pt-BR e os SCAN_TIDBITS rotacionam
   - Revisão → Continuar
   - Contexto → preencha idade + momento da vida → Continuar
   - Resultados → veja que headline e key_points vêm em pt-BR (do Sonnet)
   - Verifique se os marcadores ausentes aparecem como chips com subtítulos pt-BR
   - Baixe JSON e PDF — toasts em pt-BR
   - Clique na badge "Beta" → e-mail abre para `contato@decifra.com.br`
   - Política de Privacidade — abra e leia
2. Teste no celular real (375 px) com hard reload
3. Teste com um laudo real de Fleury / DASA / Hermes Pardini colado na aba "Colar texto"
4. Confirme que a OG aparece corretamente colando o URL em Slack / LinkedIn / WhatsApp

## Diferenças clínicas a observar em produção

- Laudos brasileiros usam **vírgula como separador decimal** (`1,2` não `1.2`). O prompt instrui o modelo a preservar.
- Unidades comuns: **mUI/L** ou **µUI/mL** para TSH (não mIU/L). **ng/mL**, **pg/mL**, **mg/dL** seguem o padrão US, então não exigem conversão.
- Hemograma é quase universal nos laudos brasileiros. O `markerSystem()` agora reconhece HEMÁCIAS, LEUCÓCITOS, PLAQUETAS, VCM, HCM, CHCM, etc.
- Anti-TPO e Anti-TG são pedidos com mais frequência no Brasil (cultura forte de investigar tireoide autoimune em mulheres). Já mapeados.
- Hormônio Antimülleriano costuma vir abreviado como "HAM" ou "AMH"; ambos cobertos.

## Suporte

Dúvidas ou problemas de deploy: contate `contato@decifra.com.br` (ou seu próprio e-mail durante o setup).

---

Decifra é um produto independente operado por Luana Micheau (luana.systems).
Para fins educacionais. Não substitui consulta médica.
