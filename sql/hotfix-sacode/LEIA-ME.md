# 🚨 Hotfix de segurança do Sacode (produção)

**O que é:** uma conta comum do site do Sacode consegue, hoje, se transformar
em admin sozinha pela API pública do Supabase — e a partir daí ler dados de
todos os compradores, gerar ingressos válidos de graça e mexer em pedidos
alheios. Está **verificado no banco de produção** (12/07/2026); não há sinal de
que alguém tenha explorado, mas a brecha está aberta.

**Por que agora:** a `anon key` está no JavaScript do site (é pública por
natureza) e o evento de 02/08 está chegando. O conserto leva ~1 segundo e não
derruba nada.

## Como aplicar (5 min, você mesmo)

1. Abra o **Supabase Dashboard** → projeto **sacode-mvp** (⚠️ confira o nome no
   topo — NÃO é o zdk-ingressos).
2. **SQL Editor → New query**.
3. Cole todo o conteúdo de **`HOTFIX_profiles_role.sql`** e clique **Run**.
4. Confira a saída: o bloco "DEPOIS" deve mostrar `anon` sem linhas e
   `authenticated` com **UPDATE em 12 colunas**; a última consulta deve
   retornar **zero** policies.

Pronto. Se qualquer coisa parecer estranha, me manda o print da saída antes de
seguir.

## É seguro? Vai quebrar o site do Sacode?

Não. Verifiquei no código: nenhuma tela do site grava em `profiles` pelo
navegador (só leitura para mostrar o nome na navbar). Cadastro, checkout e
painel escrevem pelo **servidor** (service_role), que ignora esses grants. O
fix só fecha o caminho que **nunca deveria** ter estado aberto.

## Depois de aplicar

Me avise que eu rodo um teste rápido contra o site do Sacode confirmando que o
ataque (PATCH trocando `role` para `admin`) passou a responder 403 — antes ele
respondia 204 (sucesso).

## Contexto

Essa falha é **herdada**: o `zdk-ingressos` nasceu como cópia do Sacode e tinha
o mesmo furo — já corrigido no banco novo (`sql/plataforma/04_area_cliente.sql`)
e coberto por teste automatizado. Este arquivo é a versão do mesmo fix ajustada
ao schema/policies que existem hoje no Sacode.
