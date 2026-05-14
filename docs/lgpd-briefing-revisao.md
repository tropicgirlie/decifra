# Briefing para revisão LGPD da Decifra

Documento para enviar a advogada(o) com experiência em LGPD-saúde, antes de uma revisão pontual de **1 hora**. Preparado para reduzir o tempo de leitura prévia e baratear a consulta.

- **Solicitante**: Luana Micheau (fundadora, controladora)
- **Produto**: Decifra (decifra.com.br)
- **Honorário esperado**: R$ 800 a R$ 2.000 para 1h de revisão + parecer simples por escrito
- **Prazo desejado**: 5 a 10 dias úteis
- **Versão deste documento**: 1.0 (2026-05-14)

---

## 1. O que é a Decifra (em 3 parágrafos)

A Decifra é uma plataforma web em pt-BR que ajuda mulheres brasileiras a entender seus exames laboratoriais com contexto clínico voltado à fisiologia feminina (ciclo menstrual, gestação, pós-parto, climatério, menopausa). A usuária envia ou cola o texto do laudo, confirma os marcadores que o sistema extraiu, descreve sua fase da vida, e recebe uma interpretação personalizada gerada por inteligência artificial.

A Decifra **não diagnostica, não trata, não prescreve e não vende exames**. É uma interface educacional. O disclaimer no rodapé deixa claro que não substitui consulta com profissional habilitado pelo CFM/CRM.

Modelo de negócio: assinatura mensal ou anual (R$ 29,90/mês ou R$ 249/ano) para uso ilimitado. Plano gratuito permite 1 decifração por mês. Pagamento via Stripe BR (cartão + PIX) quando ativarmos. Atualmente em beta gratuita.

## 2. Tratamento de dados pessoais e sensíveis (mapa)

| Dado | Categoria LGPD | Propósito | Coleta | Armazenamento | Operador |
|---|---|---|---|---|---|
| E-mail | Pessoal comum (Art. 5º I) | Identificação de conta, controle de cota mensal, eventual envio transacional | Cadastro voluntário | Supabase (Postgres) em São Paulo (sa-east-1) | Supabase Inc. |
| Plano de assinatura (free/pro) | Pessoal comum | Controle de acesso | Após pagamento via Stripe | Supabase | Supabase, Stripe |
| Contexto opcional da paciente (idade, fase da vida, dia do ciclo, notas livres) | Sensível de saúde (Art. 5º II) | Personalização da interpretação | Formulário antes do resultado | Supabase, ligado ao e-mail | Supabase |
| Texto do laudo laboratorial | Sensível de saúde (Art. 5º II) | Extração de marcadores e geração de interpretação | Upload/colagem voluntária | **Não armazenado**. Trafega pelos servidores Vercel (Brasil), Anthropic (EUA) e Maritaca (Brasil) durante o processamento. Descartado após a resposta. | Anthropic, Maritaca, Vercel |
| Imagens (JPG/PNG) do laudo | Sensível de saúde | Idem texto | Upload voluntário | **Não armazenado**. Trafega em base64 para Anthropic via servidor Vercel. Descartado após a resposta. | Anthropic, Vercel |
| Marcadores extraídos finais (após confirmação) | Sensível de saúde | Geração da interpretação clínica | Resultado do passo de extração | **Não armazenado** | Anthropic, Maritaca |
| Relatos de inconsistência | Comum (texto livre) + possivelmente sensível | Melhoria do produto, suporte | Quando a usuária reporta erro | Supabase | Supabase |

## 3. Bases legais identificadas pela controladora (a confirmar)

- **Dados pessoais comuns** (e-mail, plano): **consentimento** (Art. 7º I) coletado via checkbox explícito no cadastro. Texto atual do consentimento: "Concordo com a Política de Privacidade. A Decifra armazena apenas seu e-mail e o plano da assinatura. Nenhum dado de exame é guardado."
- **Dados pessoais sensíveis de saúde** (contexto da paciente, texto/imagem do laudo, marcadores extraídos): **consentimento específico e destacado** (Art. 11º I). Ponto a discutir: o texto atual do checkbox é suficiente, ou precisa de um segundo checkbox específico sobre dados sensíveis?

## 4. Operadores e cadeia de subcontratação

| Operador | Função | DPA disponível |
|---|---|---|
| Anthropic | Extração de marcadores (Claude Haiku 4.5) e raciocínio clínico (Claude Sonnet 4.5) | Sim, [Data Processing Addendum padrão](https://www.anthropic.com/legal/dpa) |
| Maritaca AI | Tradução clínica (Sabiá-3) | Empresa brasileira, sujeita à LGPD diretamente. Verificar contrato de operadora. |
| Vercel | Hospedagem dos servidores serverless | Sim, [DPA padrão](https://vercel.com/legal/dpa) |
| Supabase | Banco de dados Postgres em sa-east-1 (São Paulo) | Sim, [DPA padrão](https://supabase.com/dpa) |
| Stripe (quando ativarmos) | Processamento de pagamento (cartão, PIX) | Sim, Stripe Brasil sujeita à LGPD |

## 5. Encarregada pelo Tratamento de Dados

- **Designada**: Luana Micheau (controladora, fundadora) atuará como Encarregada nos termos do Art. 41.
- **Contato público**: `encarregado@decifra.com.br` (alias que redireciona para o e-mail pessoal).
- **Ponto a confirmar**: pode a controladora acumular a função de Encarregada nesta fase inicial sem CNPJ? Há jurisprudência ou orientação da ANPD sobre isso para startups solo?

## 6. Documentos para a revisão (anexos a esta consulta)

1. **Política de Privacidade** atual: acessível na rota `/privacy` em decifra.com.br
2. **Texto de consentimento** no formulário de cadastro (transcrito acima)
3. **Disclaimer no rodapé**: "Apenas para fins educacionais. Não é um dispositivo médico nem ferramenta diagnóstica. Não substitui consulta com profissional habilitado pelo CFM/CRM."
4. **ADR de arquitetura** (mostra o caminho dos dados): `docs/adr/0001-summary-model-pipeline.md`
5. **Glossário com terminologia jurídica**: `docs/glossary.md` seção 10 (LGPD)

(Se preferir receber os documentos em PDF compilado, posso preparar.)

## 7. Perguntas específicas que gostaria que a revisão respondesse

1. **Consentimento Art. 11**: o checkbox único atual cobre o tratamento de dados sensíveis de saúde, ou é preciso um segundo checkbox específico ("Autorizo o processamento dos meus dados de saúde para fins de interpretação clínica")?
2. **Encarregada**: a fundadora pode acumular a função enquanto não houver CNPJ? Há risco regulatório?
3. **RIPD (Relatório de Impacto à Proteção de Dados Pessoais)**: dado o tratamento de dado sensível em larga escala potencial, a Decifra precisa elaborar e manter um RIPD nos termos do Art. 38? Se sim, há modelo recomendado para startups?
4. **Contratos de operadora**: os DPAs padrão de Anthropic, Vercel, Supabase e Stripe são suficientes, ou precisamos exigir adendo específico LGPD com cada um? Como tratar a Maritaca, que já é empresa brasileira?
5. **Direito ao apagamento (Art. 18)**: como responder a um pedido de exclusão se a Decifra **não armazena** os dados sensíveis (só o e-mail e o plano)? A resposta padrão é "apagamos o e-mail/plano, e nenhum dado sensível foi retido"?
6. **Cookies e analytics**: a Decifra hoje **não usa** cookies de terceiros nem analytics rastreador. Caso a gente acrescente Google Analytics 4 ou Pixel da Meta, qual o gatilho de aviso/cookie banner sob LGPD?
7. **Termos de Uso vs Política de Privacidade**: a Decifra precisa de Termos de Uso separados, ou a Política de Privacidade já cobre o necessário para uma plataforma sem venda direta de exame?
8. **Disclaimer CFM/ANVISA**: o texto atual do rodapé é suficiente para deixar claro que **não somos software como dispositivo médico (SaMD)**, evitando enquadramento ANVISA (RDC 657/2022)? Precisa de algum acréscimo?
9. **Transferência internacional**: o uso da Anthropic (EUA) e Vercel (parte da infra também fora do Brasil) configura transferência internacional de dados sensíveis. Como justificar legalmente sob Art. 33? Adequação, garantias, ou consentimento específico?
10. **Pacote para parceiros**: quando a Decifra for buscar parceria com laboratórios ou redes médicas brasileiras, qual o "LGPD kit" mínimo que esses parceiros pedem? Pode a revisora indicar um template?

## 8. Escopo da entrega

Para a 1h de consulta:
- Resposta sucinta às 10 perguntas acima
- Lista priorizada de **ajustes obrigatórios** versus **recomendados** na Política de Privacidade e nos textos de consentimento
- Indicação de se vale fazer uma segunda revisão (mais profunda) e em que prazo

Para entrega posterior (opcional):
- Versão revisada da Política de Privacidade
- Versão revisada do texto de consentimento
- Modelo de RIPD se aplicável

## 9. Sobre a controladora

- Luana Micheau, fundadora solo
- CPF disponível mediante NDA
- Endereço fiscal: a definir (em transição entre operação como pessoa física e MEI/SLU)
- Cobertura geográfica do produto: Brasil
- Audiência estimada na beta: 100 a 500 usuárias nos primeiros 6 meses

## 10. Compromisso da controladora

Implementar todas as alterações obrigatórias indicadas pela advogada antes do soft-launch público da beta. Manter o documento de revisão arquivado em `docs/` do repositório (anonimizado quanto a dados pessoais da advogada) para auditoria futura.

---

**Pergunta final que pode ser dispensada se respondida em 1h**: você se sente confortável continuar como conselheira pontual da Decifra (1-2 horas por trimestre) caso a startup avance para versão paga e parcerias? Honorário e formato podem ser conversados.
