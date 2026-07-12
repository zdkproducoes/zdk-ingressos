import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidade | SACODE",
  description:
    "Política de Privacidade da plataforma SACODE — tratamento de dados pessoais conforme a LGPD.",
};

export default function PrivacidadePage() {
  return (
    <main className="min-h-screen bg-white">
      <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <header className="mb-10 border-b border-zinc-200 pb-6">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            Política de Privacidade
          </h1>
          <p className="mt-2 text-base text-zinc-600">Plataforma SACODE</p>
          <p className="mt-1 text-sm text-zinc-500">
            Versão 1.0 — Vigência a partir de 04 de maio de 2026
          </p>
          <p className="text-sm text-zinc-500">
            Última atualização: 04 de maio de 2026
          </p>
        </header>

        <div className="prose prose-zinc max-w-none prose-headings:font-semibold prose-headings:text-zinc-900 prose-h2:mt-10 prose-h2:text-xl prose-h2:border-b prose-h2:border-zinc-200 prose-h2:pb-2 prose-p:text-zinc-700 prose-p:leading-relaxed prose-li:text-zinc-700 prose-strong:text-zinc-900 prose-a:text-red-700 hover:prose-a:text-red-800">
          <h2>Introdução</h2>
          <p>
            Esta Política de Privacidade descreve como os dados pessoais dos
            usuários da plataforma SACODE são coletados, utilizados,
            armazenados, compartilhados e protegidos, em estrita observância à
            Lei Geral de Proteção de Dados Pessoais — Lei nº 13.709/2018
            (&ldquo;LGPD&rdquo;), ao Marco Civil da Internet (Lei nº
            12.965/2014) e ao Código de Defesa do Consumidor (Lei nº
            8.078/1990).
          </p>
          <p>
            A leitura atenta deste documento é fundamental para que o titular
            dos dados compreenda o tratamento que será dado às suas
            informações pessoais e exerça plenamente seus direitos.
          </p>

          <h2>1. Definições e Agentes de Tratamento</h2>
          <p>
            <strong>1.1</strong> Para os fins desta Política, aplicam-se as
            definições estabelecidas no artigo 5º da LGPD, com destaque para:
          </p>
          <ul>
            <li>
              <strong>&ldquo;Dado pessoal&rdquo;:</strong> informação
              relacionada a pessoa natural identificada ou identificável.
            </li>
            <li>
              <strong>&ldquo;Tratamento&rdquo;:</strong> toda operação
              realizada com dados pessoais, como coleta, classificação,
              utilização, acesso, reprodução, transmissão, armazenamento,
              eliminação.
            </li>
            <li>
              <strong>&ldquo;Titular&rdquo;:</strong> pessoa natural a quem se
              referem os dados pessoais objeto de tratamento.
            </li>
            <li>
              <strong>&ldquo;Controlador&rdquo;:</strong> pessoa natural ou
              jurídica a quem competem as decisões sobre o tratamento de
              dados pessoais.
            </li>
            <li>
              <strong>&ldquo;Operador&rdquo;:</strong> pessoa natural ou
              jurídica que realiza o tratamento de dados pessoais em nome do
              controlador.
            </li>
            <li>
              <strong>&ldquo;Encarregado&rdquo; (DPO):</strong> pessoa
              indicada pelo controlador para atuar como canal de comunicação
              entre o controlador, os titulares e a Autoridade Nacional de
              Proteção de Dados.
            </li>
          </ul>

          <p>
            <strong>1.2 Agentes de tratamento envolvidos:</strong>
          </p>

          <div className="not-prose my-6 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-zinc-100">
                  <th className="border border-zinc-300 px-3 py-2 text-left font-semibold text-zinc-900">
                    Papel
                  </th>
                  <th className="border border-zinc-300 px-3 py-2 text-left font-semibold text-zinc-900">
                    Quem é
                  </th>
                  <th className="border border-zinc-300 px-3 py-2 text-left font-semibold text-zinc-900">
                    Responsabilidade
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-zinc-300 px-3 py-2 align-top text-zinc-700">
                    Controlador
                  </td>
                  <td className="border border-zinc-300 px-3 py-2 align-top text-zinc-700">
                    44.816.216 CAIO DIEGO MARTINS
                    <br />
                    CNPJ 44.816.216/0001-03
                  </td>
                  <td className="border border-zinc-300 px-3 py-2 align-top text-zinc-700">
                    Define finalidades e meios do tratamento. Responsável
                    pelas decisões sobre os dados.
                  </td>
                </tr>
                <tr>
                  <td className="border border-zinc-300 px-3 py-2 align-top text-zinc-700">
                    Operador
                  </td>
                  <td className="border border-zinc-300 px-3 py-2 align-top text-zinc-700">
                    ZDK Produções
                  </td>
                  <td className="border border-zinc-300 px-3 py-2 align-top text-zinc-700">
                    Realiza o tratamento técnico em nome do Controlador
                    (operação da plataforma, processamento dos dados, envio
                    de e-mails operacionais).
                  </td>
                </tr>
                <tr>
                  <td className="border border-zinc-300 px-3 py-2 align-top text-zinc-700">
                    Encarregado (DPO)
                  </td>
                  <td className="border border-zinc-300 px-3 py-2 align-top text-zinc-700">
                    Fernando Zedeque
                    <br />
                    <a
                      href="mailto:privacidade@zdkproducoes.com.br"
                      className="text-red-700 hover:text-red-800"
                    >
                      privacidade@zdkproducoes.com.br
                    </a>
                  </td>
                  <td className="border border-zinc-300 px-3 py-2 align-top text-zinc-700">
                    Canal de comunicação para titulares de dados e ANPD.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2>2. Dados Pessoais Coletados</h2>
          <p>
            <strong>2.1</strong> Para a prestação dos serviços da Plataforma,
            são coletados os seguintes dados pessoais:
          </p>

          <p>
            <strong>
              2.1.1. Dados fornecidos diretamente pelo titular no cadastro:
            </strong>
          </p>
          <ul>
            <li>Nome completo</li>
            <li>CPF</li>
            <li>E-mail</li>
            <li>Número de telefone celular</li>
            <li>
              Senha de acesso (armazenada de forma criptografada — irreversível)
            </li>
          </ul>

          <p>
            <strong>2.1.2. Dados gerados a partir do uso da Plataforma:</strong>
          </p>
          <ul>
            <li>Histórico de compras e ingressos adquiridos</li>
            <li>Códigos QR únicos vinculados a cada ingresso</li>
            <li>Logs de acesso (data, hora, endereço IP)</li>
            <li>
              Logs de check-in no evento (data e hora de leitura do QR Code)
            </li>
            <li>
              Registros de auditoria de ações sensíveis (alteração de
              cadastro, transferência de ingresso, etc.)
            </li>
          </ul>

          <p>
            <strong>2.1.3. Dados de pagamento:</strong>
          </p>
          <p>
            Os dados de cartão de crédito ou débito NÃO são coletados,
            armazenados ou processados pela Plataforma. Tais dados são
            fornecidos diretamente pelo titular ao Mercado Pago, provedor de
            meios de pagamento contratado pelo Controlador, sujeitando-se à
            política de privacidade do referido provedor.
          </p>

          <p>
            <strong>2.1.4. Dados de comunicação opcional:</strong>
          </p>
          <ul>
            <li>
              Mensagens postadas no Mural exclusivo dos compradores (texto e
              eventuais imagens)
            </li>
            <li>Comunicações enviadas ao canal de atendimento</li>
          </ul>

          <h2>3. Finalidades do Tratamento</h2>
          <p>
            <strong>3.1</strong> Os dados pessoais coletados são tratados
            exclusivamente para as seguintes finalidades:
          </p>

          <p>
            <strong>
              3.1.1. Execução do contrato de compra do ingresso (base legal:
              art. 7º, V, LGPD):
            </strong>
          </p>
          <ul>
            <li>
              Identificação inequívoca do comprador e do titular do ingresso
            </li>
            <li>Emissão e envio dos ingressos e QR Codes</li>
            <li>Processamento de pagamentos via provedor contratado</li>
            <li>Validação de acesso ao evento (check-in via QR Code)</li>
            <li>
              Operacionalização de transferência de titularidade quando
              solicitada
            </li>
            <li>Atendimento a solicitações de reembolso, troca ou suporte</li>
          </ul>

          <p>
            <strong>
              3.1.2. Cumprimento de obrigações legais e regulatórias (base
              legal: art. 7º, II, LGPD):
            </strong>
          </p>
          <ul>
            <li>
              Atendimento a determinações de autoridades competentes (Procon,
              ANPD, autoridades fiscais, judiciais e policiais)
            </li>
            <li>
              Conservação de registros de operações conforme legislação
              aplicável
            </li>
          </ul>

          <p>
            <strong>
              3.1.3. Legítimo interesse do Controlador (base legal: art. 7º,
              IX, LGPD):
            </strong>
          </p>
          <ul>
            <li>
              Prevenção a fraudes, uso indevido da plataforma e revenda
              especulativa
            </li>
            <li>
              Análise estatística agregada e anonimizada para melhoria do
              serviço
            </li>
            <li>Auditoria interna e segurança da informação</li>
          </ul>

          <p>
            <strong>
              3.1.4. Consentimento do titular (base legal: art. 7º, I, LGPD):
            </strong>
          </p>
          <ul>
            <li>
              Envio de comunicações de marketing sobre eventos futuros do
              Controlador (somente mediante opt-in expresso)
            </li>
            <li>
              Compartilhamento de imagens captadas no evento conforme cláusula
              10 dos Termos de Uso
            </li>
          </ul>

          <h2>4. Compartilhamento de Dados com Terceiros</h2>
          <p>
            <strong>4.1</strong> Os dados pessoais poderão ser compartilhados
            com os seguintes terceiros, exclusivamente para as finalidades
            aqui declaradas:
          </p>

          <p>
            <strong>4.1.1. Provedores de serviço técnicos (operadores):</strong>
          </p>

          <div className="not-prose my-6 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-zinc-100">
                  <th className="border border-zinc-300 px-3 py-2 text-left font-semibold text-zinc-900">
                    Provedor
                  </th>
                  <th className="border border-zinc-300 px-3 py-2 text-left font-semibold text-zinc-900">
                    Finalidade
                  </th>
                  <th className="border border-zinc-300 px-3 py-2 text-left font-semibold text-zinc-900">
                    Localização dos dados
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-zinc-300 px-3 py-2 align-top text-zinc-700">
                    Supabase
                  </td>
                  <td className="border border-zinc-300 px-3 py-2 align-top text-zinc-700">
                    Banco de dados, autenticação e armazenamento de QR Codes
                  </td>
                  <td className="border border-zinc-300 px-3 py-2 align-top text-zinc-700">
                    Estados Unidos / União Europeia
                  </td>
                </tr>
                <tr>
                  <td className="border border-zinc-300 px-3 py-2 align-top text-zinc-700">
                    Vercel
                  </td>
                  <td className="border border-zinc-300 px-3 py-2 align-top text-zinc-700">
                    Hospedagem da aplicação web
                  </td>
                  <td className="border border-zinc-300 px-3 py-2 align-top text-zinc-700">
                    Estados Unidos / Global (CDN)
                  </td>
                </tr>
                <tr>
                  <td className="border border-zinc-300 px-3 py-2 align-top text-zinc-700">
                    Resend
                  </td>
                  <td className="border border-zinc-300 px-3 py-2 align-top text-zinc-700">
                    Envio transacional de e-mails (confirmações, QR Codes,
                    recuperação de senha)
                  </td>
                  <td className="border border-zinc-300 px-3 py-2 align-top text-zinc-700">
                    Estados Unidos
                  </td>
                </tr>
                <tr>
                  <td className="border border-zinc-300 px-3 py-2 align-top text-zinc-700">
                    Mercado Pago
                  </td>
                  <td className="border border-zinc-300 px-3 py-2 align-top text-zinc-700">
                    Processamento de pagamentos
                  </td>
                  <td className="border border-zinc-300 px-3 py-2 align-top text-zinc-700">
                    Brasil
                  </td>
                </tr>
                <tr>
                  <td className="border border-zinc-300 px-3 py-2 align-top text-zinc-700">
                    Cloudflare Turnstile
                  </td>
                  <td className="border border-zinc-300 px-3 py-2 align-top text-zinc-700">
                    Proteção contra automação maliciosa no cadastro
                  </td>
                  <td className="border border-zinc-300 px-3 py-2 align-top text-zinc-700">
                    Global (CDN)
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <p>
            <strong>4.1.2. Transferência internacional:</strong>
          </p>
          <p>
            O Controlador adota provedores que oferecem garantias adequadas de
            proteção de dados, conforme art. 33 da LGPD, em especial:
            contratos de processamento de dados (DPA), certificações
            internacionais (SOC 2, ISO 27001) e cláusulas contratuais padrão
            para transferência internacional, quando aplicáveis.
          </p>

          <p>
            <strong>4.1.3. Autoridades públicas e judiciais:</strong>
          </p>
          <p>
            Os dados poderão ser compartilhados com autoridades públicas e
            judiciais quando exigido por lei, ordem judicial ou requisição
            administrativa formal, observados os limites legais.
          </p>

          <p>
            <strong>
              4.1.4. Casa de espetáculos e parceiros operacionais do evento:
            </strong>
          </p>
          <p>
            No dia do evento, dados mínimos necessários ao controle de acesso
            (nome do titular, CPF e validade do QR Code) poderão ser
            compartilhados com a casa de espetáculos e/ou empresa contratada
            para gestão de portaria, exclusivamente para validação de entrada.
          </p>

          <p>
            <strong>4.1.5. Vedação de comercialização:</strong>
          </p>
          <p>
            Os dados pessoais NÃO são comercializados, alugados ou cedidos a
            terceiros para fins publicitários ou comerciais alheios às
            finalidades declaradas nesta Política.
          </p>

          <h2>5. Armazenamento e Prazos de Retenção</h2>
          <p>
            <strong>5.1</strong> Os dados pessoais são armazenados em ambiente
            seguro, com controle de acesso, criptografia em trânsito
            (HTTPS/TLS) e em repouso, conforme padrões de mercado.
          </p>
          <p>
            <strong>5.2</strong> Os prazos de retenção observam a finalidade
            de cada tratamento:
          </p>

          <div className="not-prose my-6 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-zinc-100">
                  <th className="border border-zinc-300 px-3 py-2 text-left font-semibold text-zinc-900">
                    Categoria de dado
                  </th>
                  <th className="border border-zinc-300 px-3 py-2 text-left font-semibold text-zinc-900">
                    Prazo de retenção
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-zinc-300 px-3 py-2 align-top text-zinc-700">
                    Dados de cadastro (nome, CPF, e-mail, telefone)
                  </td>
                  <td className="border border-zinc-300 px-3 py-2 align-top text-zinc-700">
                    Pelo período em que a conta estiver ativa, e por até 5
                    (cinco) anos após inatividade ou exclusão da conta,
                    observado o prazo prescricional do art. 27 do CDC.
                  </td>
                </tr>
                <tr>
                  <td className="border border-zinc-300 px-3 py-2 align-top text-zinc-700">
                    Histórico de compras
                  </td>
                  <td className="border border-zinc-300 px-3 py-2 align-top text-zinc-700">
                    Por até 5 (cinco) anos após a data do evento
                    correspondente, para fins fiscais e prescricionais.
                  </td>
                </tr>
                <tr>
                  <td className="border border-zinc-300 px-3 py-2 align-top text-zinc-700">
                    Logs de acesso (IP, data/hora)
                  </td>
                  <td className="border border-zinc-300 px-3 py-2 align-top text-zinc-700">
                    Por 6 (seis) meses, conforme art. 15 do Marco Civil da
                    Internet.
                  </td>
                </tr>
                <tr>
                  <td className="border border-zinc-300 px-3 py-2 align-top text-zinc-700">
                    Logs de auditoria
                  </td>
                  <td className="border border-zinc-300 px-3 py-2 align-top text-zinc-700">
                    Por até 5 (cinco) anos.
                  </td>
                </tr>
                <tr>
                  <td className="border border-zinc-300 px-3 py-2 align-top text-zinc-700">
                    QR Codes (PNG no Storage)
                  </td>
                  <td className="border border-zinc-300 px-3 py-2 align-top text-zinc-700">
                    Por até 12 (doze) meses após a realização do evento, sendo
                    posteriormente excluídos automaticamente.
                  </td>
                </tr>
                <tr>
                  <td className="border border-zinc-300 px-3 py-2 align-top text-zinc-700">
                    Senhas
                  </td>
                  <td className="border border-zinc-300 px-3 py-2 align-top text-zinc-700">
                    Armazenadas de forma criptografada (hash irreversível)
                    durante todo o ciclo de vida da conta. Não são acessíveis
                    em texto plano por nenhum funcionário ou sistema.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <p>
            <strong>5.3</strong> Findos os prazos de retenção, os dados são
            anonimizados ou eliminados, salvo necessidade legal de preservação
            por prazo superior.
          </p>

          <h2>6. Direitos do Titular dos Dados</h2>
          <p>
            <strong>6.1</strong> Em conformidade com o artigo 18 da LGPD, o
            titular dos dados pessoais pode, a qualquer momento, exercer os
            seguintes direitos:
          </p>
          <ul>
            <li>
              Confirmação da existência de tratamento de seus dados pessoais
            </li>
            <li>Acesso aos dados pessoais tratados</li>
            <li>Correção de dados incompletos, inexatos ou desatualizados</li>
            <li>
              Anonimização, bloqueio ou eliminação de dados desnecessários,
              excessivos ou tratados em desconformidade com a LGPD
            </li>
            <li>
              Portabilidade dos dados a outro fornecedor de serviço, mediante
              requisição expressa
            </li>
            <li>
              Eliminação dos dados pessoais tratados com base no consentimento
              do titular
            </li>
            <li>
              Informação sobre as entidades públicas e privadas com as quais
              o Controlador realizou uso compartilhado de dados
            </li>
            <li>
              Informação sobre a possibilidade de não fornecer consentimento
              e sobre as consequências da negativa
            </li>
            <li>Revogação do consentimento, quando aplicável</li>
            <li>
              Oposição a tratamento realizado com fundamento em hipótese
              diversa do consentimento, em caso de descumprimento da LGPD
            </li>
          </ul>
          <p>
            <strong>6.2</strong> Para exercer qualquer destes direitos, o
            titular poderá entrar em contato pelo e-mail{" "}
            <a href="mailto:privacidade@zdkproducoes.com.br">
              privacidade@zdkproducoes.com.br
            </a>
            , com identificação clara do direito a ser exercido. As
            solicitações serão atendidas no prazo máximo de 15 (quinze) dias
            contados do recebimento, podendo este prazo ser prorrogado
            mediante justificativa, conforme art. 19, § 1º, da LGPD.
          </p>
          <p>
            <strong>6.3</strong> Para garantia da segurança dos dados, o
            Controlador poderá solicitar comprovação adicional da identidade
            do titular antes de atender a solicitação.
          </p>
          <p>
            <strong>6.4</strong> A eliminação total dos dados pode implicar a
            impossibilidade de continuidade da prestação dos serviços,
            hipótese em que o titular será informado previamente.
          </p>

          <h2>7. Segurança da Informação</h2>
          <p>
            <strong>7.1</strong> O Controlador e a Plataforma adotam medidas
            técnicas e administrativas razoáveis para proteger os dados
            pessoais contra acesso não autorizado, perda, destruição,
            alteração ou divulgação indevida, incluindo:
          </p>
          <ul>
            <li>Criptografia de dados em trânsito (HTTPS/TLS) e em repouso</li>
            <li>
              Armazenamento de senhas em formato criptografado e irreversível
              (hash)
            </li>
            <li>
              Controle de acesso baseado em níveis de permissão
              (administrador, produtor, cliente)
            </li>
            <li>
              Validação de assinatura HMAC-SHA256 em comunicações de webhook
              do provedor de pagamento
            </li>
            <li>
              Proteção de cadastro contra automação maliciosa via Cloudflare
              Turnstile
            </li>
            <li>Registros de auditoria para ações sensíveis</li>
            <li>
              Atualização periódica de bibliotecas e dependências de software
            </li>
            <li>Backup periódico do banco de dados</li>
          </ul>
          <p>
            <strong>7.2</strong> Apesar das medidas adotadas, nenhum sistema
            de informação é absolutamente imune a falhas. Em caso de incidente
            de segurança que possa acarretar risco ou dano relevante aos
            titulares, o Controlador comunicará o incidente à Autoridade
            Nacional de Proteção de Dados (ANPD) e aos titulares afetados,
            conforme art. 48 da LGPD.
          </p>

          <h2>8. Cookies e Tecnologias Similares</h2>
          <p>
            <strong>8.1</strong> A Plataforma utiliza cookies estritamente
            necessários ao seu funcionamento, em especial para manutenção da
            sessão autenticada do usuário.
          </p>
          <p>
            <strong>8.2</strong> Não são utilizados, no momento, cookies de
            terceiros para fins publicitários ou de rastreamento de
            comportamento entre sites distintos.
          </p>

          <h2>9. Crianças e Adolescentes</h2>
          <p>
            <strong>9.1</strong> A Plataforma destina-se exclusivamente a
            maiores de 18 (dezoito) anos. Não é permitido o cadastro por
            menores de idade.
          </p>
          <p>
            <strong>9.2</strong> Caso o Controlador identifique cadastro
            realizado por menor, a conta será imediatamente excluída, com
            restituição dos eventuais valores pagos.
          </p>
          <p>
            <strong>9.3</strong> Pais ou responsáveis legais que identificarem
            cadastro de menor sob sua tutela podem solicitar a exclusão
            imediata pelo e-mail{" "}
            <a href="mailto:privacidade@zdkproducoes.com.br">
              privacidade@zdkproducoes.com.br
            </a>
            .
          </p>

          <h2>10. Alterações nesta Política</h2>
          <p>
            <strong>10.1</strong> Esta Política de Privacidade poderá ser
            atualizada periodicamente, sendo a versão vigente sempre
            acessível em https://www.zdkingressos.com.br/privacidade,
            com indicação clara da data da última atualização.
          </p>
          <p>
            <strong>10.2</strong> Alterações materialmente relevantes serão
            comunicadas previamente aos titulares por e-mail e/ou aviso na
            Plataforma.
          </p>

          <h2>11. Canal de Contato</h2>
          <p>
            <strong>11.1</strong> Para qualquer dúvida, solicitação ou
            reclamação relativa a dados pessoais, o titular pode entrar em
            contato:
          </p>
          <p>
            <strong>E-mail do Encarregado:</strong>{" "}
            <a href="mailto:privacidade@zdkproducoes.com.br">
              privacidade@zdkproducoes.com.br
            </a>
          </p>
          <p>
            <strong>11.2</strong> O titular também pode peticionar diretamente
            à Autoridade Nacional de Proteção de Dados (ANPD), por meio dos
            canais oficiais disponíveis em{" "}
            <a
              href="https://www.gov.br/anpd/"
              target="_blank"
              rel="noopener noreferrer"
            >
              https://www.gov.br/anpd/
            </a>
            .
          </p>

          <h2>12. Legislação Aplicável e Foro</h2>
          <p>
            <strong>12.1</strong> Esta Política é regida pelas leis da
            República Federativa do Brasil, em especial a LGPD, o Marco Civil
            da Internet e o Código de Defesa do Consumidor.
          </p>
          <p>
            <strong>12.2</strong> Fica eleito o foro da comarca de domicílio
            do titular para dirimir quaisquer questões relacionadas a esta
            Política, em conformidade com o artigo 101, inciso I, do Código
            de Defesa do Consumidor.
          </p>
        </div>
      </article>
    </main>
  );
}
