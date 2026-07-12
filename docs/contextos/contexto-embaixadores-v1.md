# Contexto — Módulo de Embaixadores SACODE (v1)

**Data:** 30 de junho de 2026
**Sessão de origem:** conversa de scoping estratégico do programa
**Status:** programa aprovado, formulário de inscrição no ar, apresentação da reunião pronta, módulo em desenvolvimento

---

## 1. Visão do programa

O Programa de Embaixadores SACODE é uma equipe de promoters para venda de ingressos das festas (e futuramente venda de shows para empresas e casamentos). A estrutura é uma **pirâmide de 2 níveis** — Fernando no topo lidera 10 embaixadores diretos, e os que baterem meta viram líderes da própria equipe na festa seguinte.

**Importante — nomenclatura pública:** nunca usar o termo "marketing multinível" em contrato, site, ou material de divulgação. Usar sempre "Programa de Embaixadores" ou "Programa de Afiliados". "Multinível" é palavra-bomba juridicamente (Procon/Receita sensíveis).

**Posicionamento central (definido pelo Fernando na conversa):** o embaixador **não é vendedor**, é **construtor de comunidade**. Essa é a narrativa que amarra tudo — a apresentação da reunião foi estruturada em torno disso. O embaixador cria o senso de comunidade das pessoas junto à festa.

---

## 2. Estrutura financeira e de premiações

### Comissão
- **10%** sobre cada ingresso vendido
- **+5% de override** para líderes, sobre as vendas da equipe deles
- Ticket médio das festas: **R$ 23,50**
- Pagamento por **Pix, em até 5 dias úteis após o evento**

### Exemplo de ganhos calculados na conversa
- 10 ingressos: R$ 23,50 (+ VIP garantido)
- 20 ingressos: R$ 47,00
- 30 ingressos: R$ 70,50 (+ Red Label)
- 50 ingressos: R$ 117,50 (+ Jack/Tanqueray + Liderança)
- Líder com 50 próprios + equipe de 10 vendendo 20 cada: **R$ 352,50/festa**

### Premiações em bebida (requerem check-in dos convidados)
- **10 ingressos** → VIP + acesso ao camarim
- **15 ingressos com check-in** → Garrafa de Smirnoff
- **30 ingressos com check-in** → Garrafa de Red Label
- **50 ingressos com check-in** → Garrafa de Jack Daniels ou Tanqueray + vira líder na próxima festa

### Reconhecimento não-monetário
- Status de "líder da equipe SACODE"
- VIP e acesso a camarim em shows de artistas grandes (quando disponível)
- Destaque no Instagram oficial do SACODE

---

## 3. Pontos críticos de risco identificados

Estes são pontos que **precisam ser resolvidos antes da primeira festa pagar comissão**, discutidos na conversa e ainda pendentes:

### 3.1. Termo de adesão jurídico
- Precisa ser redigido pela advogada
- Deixar claro: prestação de serviço de divulgação, sem investimento, sem compra de cota, remuneração apenas por venda efetiva
- Nunca usar "multinível" no documento

### 3.2. Modelo fiscal de pagamento
- Comissão a pessoa física é rendimento tributável
- Opções: RPA (autônomo com retenção INSS/IR) ou contrato MEI (exige CNPJ do embaixador)
- **Recomendado para MVP: RPA** (mais fácil pra 10 pessoas vendendo pouco)
- Advogada precisa validar antes da primeira festa

### 3.3. LGPD — dados do comprador no painel do embaixador
Esse é o ponto **mais sensível** e ainda em aberto. O embaixador precisa ver algo dos convidados dele, mas o comprador consentiu que os dados fossem usados pela SACODE/ZDK, não que fossem repassados a terceiros.

**Opções analisadas (em ordem de risco):**
- ❌ Nome + WhatsApp puros → violação clara
- ⚠️ Primeiro nome + iniciais ("Marina S.") sem WhatsApp → aceitável
- ✅ **Recomendado:** Nome completo + WhatsApp SOMENTE se comprador marcar checkbox no checkout ("Aceito que o embaixador que me indicou veja meus dados de contato para suporte sobre o evento")
- ✅ Alternativa: só contador, sem dados

**Decisão de design no mockup:** foi adotada a opção intermediária (primeiro nome + iniciais, sem WhatsApp visível) para o MVP. Evolução com consentimento granular fica como v2.

### 3.4. Ajuste da matemática do líder
- 5% de override sobre 200 ingressos da equipe = R$ 235 → pouco para justificar o esforço de liderança
- **Sugestão pendente:** subir para 7-8% de override OU adicionar bônus de meta (equipe inteira bater X → +R$ 500 ao líder)
- Fernando ainda não decidiu

### 3.5. Check-in como gatilho de premiação — margem de tolerância
- Regra atual: "se os 15 derem check-in, ganha Smirnoff"
- Risco: embaixador cria pressão nos amigos para chegar cedo; se der problema na portaria, culpa cai no Fernando
- **Solução definida:** check-in vale até 1h antes do término da festa + tolerância de 1 convidado a menos (ex: 14 de 15 = 93% = honrar premiação)

### 3.6. Saturação em 3-4 festas
- Estrutura piramidal satura quando embaixador já vendeu para todos os amigos próximos
- **Solução definida:** rotatividade — limitar 10-15 embaixadores ativos por evento, quem não vende mínimo (~15 ingressos) sai e abre vaga

---

## 4. Painel do Embaixador — especificação do módulo

Este é o **produto de software** que Fernando precisa construir. Vai ser evolução do sistema `affiliates` existente no SACODE (mesma tabela, mesmo cookie `sacode_ref`, mesma rota `admin/afiliados/[id]`).

### Elementos do painel (definidos no mockup aprovado)

**Header:**
- Nome do embaixador + avatar com iniciais
- Badge do evento ativo ("SACODE 15ª · 7 de Junho")

**4 cards de métrica no topo:**
- Vendidos (contador de ingressos)
- Comissão acumulada (R$)
- Check-ins (X / Total)
- Ranking (posição atual de N total)

**Pódio semanal:**
- Top 3 vendedores com avatar, nome e quantidade
- Destaque visual para 1º lugar (dourado + coroa)
- Ordem visual: 2º (esquerda) · 1º (centro, mais alto) · 3º (direita)

**Progresso das premiações:**
- Barra de progresso para cada tier (VIP, Smirnoff, Red Label, Jack/Tanqueray)
- Verde quando conquistado
- Dourado em progresso
- Texto motivacional ("Faltam 7 ingressos pra próxima meta")

**Card de desafio da semana:**
- Fundo vinho, destaque total
- Título do desafio, prazo restante, prêmio
- Anunciado no grupo do WhatsApp toda quarta

**Lista de convidados:**
- Grid de avatares com primeiro nome + inicial (LGPD)
- Status: aguardando check-in / confirmado
- Contador total ("+ 19 outros · ver lista completa")

**Cores da identidade SACODE:**
- Vinho: `#7A1F2B` (primário)
- Vinho escuro: `#4A1019` (texto sobre creme)
- Dourado: `#B8860B` (accent/premiações)
- Creme: `#FAF6F0` (background)
- Creme claro: `#F5E6C8` (texto sobre vinho)

### Gamificação
- **Ranking ao vivo** entre todos os embaixadores do evento
- **Pódio dos 3 maiores vendedores** exibido publicamente
- **Desafios semanais** com metas curtas e prêmios rápidos (drinks, brindes, destaque no Instagram)
- Anúncio do vencedor no grupo toda segunda

### Rastreamento de vendas
- **Via código de cupom**, não link de afiliado
- Cada embaixador tem um código único (ex: `CAMILA10`)
- Comprador digita no checkout
- Desconto simbólico (R$ 1) para incentivar uso
- Mais robusto que link, mais difícil de burlar, funciona bem com Mercado Pago Checkout Pro

---

## 5. Onboarding e cronograma da 15ª edição (7 de junho)

### Cronograma acordado
1. **Hoje** — Reunião de boas-vindas (apresentação já pronta)
2. **Próximos 7 dias** — Assinatura do termo + kickoff presencial (reunião num bar com os 10 selecionados, entrega camiseta SACODE, custa ~R$ 200 e gera lealdade)
3. **Maio** — Vendas + desafios semanais no grupo do WhatsApp
4. **7 de junho** — DIA DA FESTA (Villa Jardim Bar · SBC · Aquecimento Copa do Mundo · Caio Lacerda no palco)

### O que se espera do embaixador (5 compromissos)
1. Estar na festa (embaixador ausente não faz sentido)
2. Participar do grupo de WhatsApp ativo (mensagens diárias, desafios)
3. Postar nos stories (SACODE fornece material, embaixador posta com sua voz)
4. Vestir a camisa (camiseta SACODE oficial nas festas)
5. Honestidade total (se algo não está dando certo, fala)

---

## 6. Processo de seleção (em andamento agora)

### Formulário de inscrição
- **URL:** https://forms.gle/ig3JT88qJCnQmCFs9
- **27 perguntas** em 6 seções: Identificação · Relação com festas · Perfil de vendedor · Motivação · Disponibilidade · Bônus
- **Prazo:** apenas 1 dia (venda de ingressos já em andamento)
- **Distribuição:** apenas para pessoas que demonstraram interesse prévio (~10 pessoas)
- **Divulgação:** Instagram do Caio, Instagram do Fernando, Instagram do SACODE
- **Meta:** 10 inscrições

### Critérios eliminatórios identificados
- Escala de conforto em vender < 6 (pergunta 16)
- Resposta na pergunta 19 ("por que quer ser embaixador") em uma linha ou só "pra ganhar dinheiro"
- Dedicação < 3h/semana + meta ambiciosa (incoerência)

### Reunião online
- **Duração:** 45 minutos
- **Formato:** apresentação de 17 slides preparada (arquivo `Apresentacao_Embaixadores_SACODE.pptx`)
- **Horários oferecidos:** quarta 20h, sexta 15h, sexta 20h, sábado 13h

---

## 7. Aprendizados e princípios validados

### Sobre incentivos
- Premiação em bebida é inteligente: troca custo de aquisição (dinheiro) por custo de bar (margem, ~R$ 90-100 no atacado vs R$ 150+ valor percebido)
- VIP por 10 ingressos = gancho perfeito de entrada (baixa barreira, recompensa imediata)
- Status importa muito no meio (18-30 anos, ABC): "líder da equipe SACODE" é cargo que a pessoa coloca no Instagram

### Sobre a estrutura
- Manter 10-15 embaixadores ativos por evento — mais que isso satura
- Rotatividade trimestral mantém a fome do programa vivo
- Reunião de kickoff presencial num bar cria identidade de time que dinheiro nenhum compra

### Sobre a comunicação
- Nunca usar "multinível" publicamente
- O embaixador é **construtor de comunidade**, não vendedor — narrativa central
- Painel bonito é diferencial competitivo, não brinde — vale investir no design

---

## 8. Estado atual e próximos passos

### Pronto
- ✅ Formulário de inscrição no ar (Google Forms)
- ✅ Apresentação PowerPoint pronta (17 slides na paleta SACODE)
- ✅ Mockup do painel do embaixador aprovado (imagem/HTML)
- ✅ Estrutura de comissões, premiações e cronograma definida
- ✅ Divulgação sendo feita nos 3 Instagrams

### Pendente antes da primeira festa
- ⏳ Advogada redigir termo de adesão
- ⏳ Decisão sobre modelo fiscal (RPA vs MEI)
- ⏳ Decisão final sobre LGPD dos dados do comprador (adotar checkbox de consentimento granular ou manter primeiro nome + inicial?)
- ⏳ Decisão sobre ajuste do override do líder (5% → 7-8% ou bônus de meta?)
- ⏳ Selecionar os 10 embaixadores após reunião
- ⏳ Kickoff presencial no bar

### Módulo de software a construir (foco da próxima conversa)
- Evoluir sistema `affiliates` existente para incluir:
  - Painel visual para embaixador (baseado no mockup aprovado)
  - Ranking em tempo real
  - Progresso de premiações
  - Desafios semanais
  - Lista de convidados com LGPD respeitada
  - Sistema de código de cupom (não link)
  - Nível de líder (com override de 5%)

### Aspectos técnicos a considerar
- Rota do painel: `admin/afiliados/[id]` já existe — evoluir
- Cookie `sacode_ref` já implementado
- Tabela `affiliates` no Supabase — Fernando ainda precisava colar output de 2 queries de schema (pendência do v24 do SACODE geral)
- Aplicar `force-dynamic` no painel para evitar cache
- Cuidado com `.order('sort_order')` — usar `.order('id')` (bug conhecido do supabase-js)
- Testar em conta descartável (`email+teste1@gmail.com`)

---

## 9. Arquivos gerados nesta sessão

- `Formulario_Embaixadores_SACODE.docx` — roteiro do Google Forms com 27 perguntas em 6 seções
- `Apresentacao_Embaixadores_SACODE.pptx` — 17 slides para reunião online
- `mockup_painel_crop.png` — imagem do painel embutida no slide 11
- Mockup HTML interativo do painel (inline no chat)

---

**Fim do contexto v1.**
