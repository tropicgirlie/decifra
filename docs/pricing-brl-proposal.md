# Proposta de preços BRL para Decifra

Análise + recomendação. Decisão final é sua.

- **Status**: proposta v1 (2026-05-13)
- **Decisão final**: pendente
- **Implementação**: requer Stripe BR configurado, PIX habilitado, atualização de `PreviewGate` e `SignUp` em `app.jsx`

## Contexto de mercado

### Onde a brasileira-alvo gasta hoje

Brasileira urbana, 28 a 55 anos, classe B/C+, com acesso a convênio ou particular. Referência mensal:

| Categoria | Faixa mensal típica BR |
|---|---|
| Convênio individual | R$ 350 a R$ 1.500 |
| Co-pagamento ginecologista no convênio | R$ 30 a R$ 80 por consulta |
| Ginecologista particular | R$ 200 a R$ 500 por consulta |
| Hormônios bioidênticos / suplementos pós-climatério | R$ 150 a R$ 600 |
| Apps de saúde mental (Cíngulo, Mindsight, Vittude) | R$ 19,90 a R$ 49,90 |
| Apps de fitness/yoga (Bodytech, Smart Fit App, Strava Pro) | R$ 19,90 a R$ 39,90 |
| Apps de meditação (Lojong, Zen, Calm BR) | R$ 19,90 a R$ 39,90 |
| Newsletter premium feminina (Olhar Olhar, AzMina+, NX) | R$ 9,90 a R$ 29,90 |
| Exames particulares Fleury check-up feminino (uma vez) | R$ 800 a R$ 2.500 |

**Implicação**: o ponto de referência mental para um app de saúde digital de assinatura é **R$ 19,90 a R$ 39,90 / mês**. Acima de R$ 50 / mês exige justificativa forte ou bundling com consulta.

### Psicologia de preço brasileira

- **"R$ 19,90" é o R$ 9.99 dos EUA**: psicologicamente é "menos de R$ 20".
- **R$ 29,90** é o próximo degrau, ainda "menos de R$ 30".
- **R$ 49,90** vira "quase R$ 50" e dispara fricção.
- **Anual com desconto** é cultural: brasileira espera ver "2 meses grátis" ou "economize R$ X" explícito.
- **Parcelamento "em 12x sem juros"** ainda é expectativa em compras anuais. Stripe BR suporta.
- **PIX** é praticamente obrigatório como opção. Sem PIX, conversão cai ~30% versus checkout só cartão. Stripe BR adicionou PIX em 2024.
- **Boleto bancário** está perdendo relevância mas ainda é citado em consumidoras +50 anos.

### Comparação com produtos correlatos no Brasil

| Produto | Mensal | Anual | Notas |
|---|---|---|---|
| Cíngulo (terapia auto-guiada) | R$ 19,90 | R$ 199 | App líder em mental health BR. |
| Lojong (meditação) | R$ 19,90 | R$ 199 | Modelo de comparação direta. |
| Vittude (terapia conectada) | R$ 49,90+ | N/A | Conecta com terapeuta real, justifica preço mais alto. |
| Flo Premium (BR) | R$ 39,90 | R$ 299 | Tracker menstrual + IA. Decifra concorre indiretamente. |
| Clue Plus (BR) | R$ 24,90 | R$ 249 | Mesmo segmento. |
| Doctoralia consulta particular | R$ 100 a R$ 300 | N/A | Por consulta. |
| Telemedicina Drogaria São Paulo | R$ 79 | N/A | Por consulta. |

**Implicação**: Decifra concorre com **Flo Premium e Clue Plus** no mind-share, e com o **custo de uma consulta de R$ 200** no value-frame. Não concorre com Vittude (que tem terapeuta humana).

## Proposta de preços

### Estrutura recomendada (Recomendação A)

| Plano | Preço | Notas |
|---|---|---|
| **Grátis** | R$ 0 | 1 decifração por mês, 18 marcadores interpretados, contexto feminino básico. Sem cartão. |
| **Pro Mensal** | **R$ 29,90 / mês** | Decifrações ilimitadas, todos os marcadores, contexto por fase da vida, download PDF/JSON, suporte prioritário. |
| **Pro Anual** | **R$ 249 / ano** (≈ R$ 20,75/mês, "2 meses grátis") | Mesmo do mensal. Parcelamento 12x sem juros via Stripe BR. Badge "Economize R$ 109,80". |

### Por que esses números

**R$ 29,90/mês para Pro Mensal**:
- Fica embaixo da fricção de R$ 30
- É 10% do custo de uma consulta particular (R$ 300), proporção que parece "razoável para uma assinatura mensal"
- Posiciona ligeiramente acima do Lojong/Cíngulo (que são apps mais amplos) e ligeiramente abaixo do Flo Premium (que tem features que não temos como tracking menstrual nativo)
- Brasileira média conta tomar pelo menos 1 decifração por mês para justificar; usuária ativa fará 3 a 5 por ano

**R$ 249/ano para Pro Anual**:
- 12 meses × R$ 20,75 = R$ 249. Equivale a "2 meses grátis" comparado ao mensal anualizado (R$ 358,80).
- "R$ 249" é número limpo, comunica anchor de "menos de R$ 250".
- Parcelado em 12x sem juros = R$ 20,75/mês, abaixo da fricção R$ 21.
- Anual é onde a margem boa fica: ~70% das mulheres que assinam anual não cancelam no ano 1.

### Alternativa B: mais agressiva (testar no first-90-days)

| Plano | Preço |
|---|---|
| Grátis | R$ 0 |
| Pro Mensal | **R$ 19,90** |
| Pro Anual | **R$ 149** (≈ R$ 12,42/mês, "praticamente 5 meses grátis") |

**Vantagem**: derruba toda fricção de preço. Crescimento orgânico mais rápido. Boca-a-boca explosivo no público BR.
**Risco**: subprecifica versus valor entregue. Cliente brasileiro associa "barato demais" a "não pode ser sério em saúde". Pode prejudicar reputação clínica.

**Recomendo a versão A para launch**, com B como possível campanha promocional de "founder's pricing" para os primeiros 100 assinantes.

### Alternativa C: bundle com tele-orientação

Para v2, depois de 6 meses de beta:

| Plano | Preço |
|---|---|
| Grátis | R$ 0 |
| Pro Mensal (só Decifra) | R$ 29,90 |
| **Pro + Consulta** (Decifra + 1 tele-orientação por mês com enfermeira ou médica parceira) | **R$ 79,90 / mês** |
| Pro Anual + 6 Consultas | R$ 599 / ano |

Esse é o modelo que captura a maior parte do valor: a Decifra prepara a usuária para a conversa, e a conversa fecha o loop. Vittude faz isso há anos. Requer parceria com profissionais reais (enfermeira obstétrica, nutricionista, ginecologista). Pós-MVP.

## Implementação técnica

Quando você decidir os preços, eu atualizo:

1. **`app.jsx` PreviewGate (linhas ~1690-1720)**: troco placeholder EUR pelo BRL real, formato `R$ 29,90`, badge "Economize R$ 109,80"
2. **`app.jsx` SignUp (linhas ~1990-2020)**: mesma troca
3. **`app.jsx` UpgradeModal (linhas ~870-960)**: trocar `€7,99/mês` e `€59/ano` por BRL
4. **TODO comments**: remover todos os `// TODO: BRL pricing pending Stripe BR setup`
5. **Stripe BR**: você configura os Price IDs dentro do dashboard Stripe (Brasil) e me passa, eu coloco em `api/checkout.js`
6. **PIX**: habilitar no Stripe Brasil > Settings > Payment methods. Cobertura automática.

## Métricas para acompanhar

Depois do lançamento, watch list:

| Métrica | Alvo realista beta BR |
|---|---|
| Free → Pro conversão | 3 a 6% |
| Pro Mensal → Pro Anual upgrade | 15 a 25% no mês 1 |
| Churn mensal Pro Mensal | <8% |
| Churn anual Pro Anual | <25% |
| PIX % de pagamentos | 40 a 60% |
| Parcelamento 12x % no anual | 50 a 70% |
| ARPU mensal blended | R$ 18 a R$ 25 |

## Decisão pendente sua

1. **Versão A (R$ 29,90 / R$ 249), B (R$ 19,90 / R$ 149) ou outro número?**
2. **Cupom de lançamento "founder's pricing"?** Ex.: primeiros 50 assinantes pagam metade pelo ano 1. Boa para gerar buzz e tomar feedback profundo.
3. **PIX como opção principal ou opcional?** Recomendo principal.
4. **Boleto bancário?** Recomendo desabilitar. Conversão pior e fricção administrativa.
