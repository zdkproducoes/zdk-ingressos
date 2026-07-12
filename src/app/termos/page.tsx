import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Termos de Uso e Condições de Compra | SACODE",
  description:
    "Termos de Uso e Condições de Compra da plataforma SACODE para aquisição de ingressos.",
};

export default function TermosPage() {
  return (
    <main className="min-h-screen bg-white">
      <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <header className="mb-10 border-b border-zinc-200 pb-6">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            Termos de Uso e Condições de Compra
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
          <h2>Preâmbulo</h2>
          <p>
            Este documento estabelece os Termos de Uso e Condições de Compra
            (&ldquo;Termos&rdquo;) aplicáveis à utilização da plataforma SACODE
            e à aquisição de ingressos para eventos nela disponibilizados. Ao
            se cadastrar, navegar ou efetuar compras na plataforma, o usuário
            declara haver lido, compreendido e aceitado integralmente todas as
            cláusulas a seguir, vinculando-se a elas como contrato de adesão,
            nos termos do artigo 54 do Código de Defesa do Consumidor (Lei nº
            8.078/1990).
          </p>

          <h2>Das Partes</h2>
          <p>
            <strong>Organizador do Evento:</strong> 44.816.216 CAIO DIEGO
            MARTINS, inscrita no CNPJ sob o nº 44.816.216/0001-03, doravante
            denominada &ldquo;ORGANIZADOR&rdquo;, responsável pela realização
            do evento, pela emissão dos ingressos e pelo recebimento dos
            valores correspondentes às vendas.
          </p>
          <p>
            <strong>Plataforma Tecnológica:</strong> ZDK PRODUÇÕES, doravante
            denominada &ldquo;PLATAFORMA&rdquo;, responsável exclusivamente
            pela operação tecnológica do website, processamento técnico de
            cadastros, emissão de QR Codes, intermediação técnica do checkout
            e envio de comunicações operacionais.
          </p>
          <p>
            <strong>Usuário/Comprador:</strong> pessoa física maior de 18
            (dezoito) anos que se cadastra na PLATAFORMA e/ou adquire
            ingressos por meio dela.
          </p>

          <h2>1. Definições</h2>
          <p>
            <strong>1.1</strong> Para os efeitos destes Termos, aplicam-se as
            seguintes definições:
          </p>
          <ul>
            <li>
              <strong>&ldquo;Plataforma&rdquo;:</strong> o ambiente digital
              acessível em https://www.zdkingressos.com.br e demais
              URLs operadas pela ZDK Produções para o evento referenciado.
            </li>
            <li>
              <strong>&ldquo;Evento&rdquo;:</strong> o evento artístico/musical
              para o qual o ingresso foi adquirido, com data, local e demais
              informações disponibilizados na página de vendas.
            </li>
            <li>
              <strong>&ldquo;Ingresso&rdquo;:</strong> o documento eletrônico,
              representado por QR Code único, que confere ao seu titular o
              direito de acesso ao Evento.
            </li>
            <li>
              <strong>&ldquo;Titular&rdquo;:</strong> a pessoa física vinculada
              ao Ingresso no momento do uso, podendo ser o Comprador original
              ou destinatário de transferência regular.
            </li>
            <li>
              <strong>&ldquo;Lote&rdquo;:</strong> cada conjunto de Ingressos
              disponibilizados pelo Organizador, com quantidade e preço
              determinados, podendo haver lotes sucessivos com valores e
              condições distintas.
            </li>
          </ul>

          <h2>2. Cadastro e Conta de Usuário</h2>
          <p>
            <strong>2.1</strong> A utilização da Plataforma para aquisição de
            Ingressos exige cadastro prévio, com fornecimento obrigatório dos
            seguintes dados: nome completo, CPF, e-mail válido, número de
            telefone celular e senha de acesso.
          </p>
          <p>
            <strong>2.2</strong> O Usuário declara, sob as penas da lei, que
            todas as informações fornecidas no cadastro são verdadeiras,
            atuais e completas, comprometendo-se a mantê-las atualizadas
            durante toda a vigência da relação contratual.
          </p>
          <p>
            <strong>2.3</strong> É vedado o cadastro por menores de 18
            (dezoito) anos. Caso seja identificado cadastro realizado por
            menor, o Organizador e a Plataforma reservam-se o direito de
            cancelar a conta e quaisquer compras associadas, com restituição
            dos valores eventualmente pagos.
          </p>
          <p>
            <strong>2.4</strong> O Usuário é o único responsável pela guarda
            e sigilo de sua senha de acesso, sendo de sua inteira
            responsabilidade quaisquer operações realizadas em sua conta. Em
            caso de suspeita de uso indevido, o Usuário deverá comunicar
            imediatamente o canal de atendimento e proceder à alteração da
            senha.
          </p>
          <p>
            <strong>2.5</strong> Cada CPF poderá possuir apenas uma conta
            ativa na Plataforma. Tentativas de criação de múltiplas contas com
            o mesmo CPF poderão acarretar suspensão de todas as contas
            envolvidas.
          </p>

          <h2>3. Aquisição de Ingressos</h2>
          <p>
            <strong>3.1</strong> A aquisição de Ingressos é realizada
            exclusivamente pela Plataforma, mediante seleção do Lote desejado,
            indicação da quantidade pretendida e conclusão do pagamento por
            meio das formas disponibilizadas no checkout.
          </p>
          <p>
            <strong>3.2</strong> Os preços dos Ingressos, a quantidade
            disponível em cada Lote e as eventuais taxas aplicáveis estão
            indicados de forma clara na Plataforma no momento da compra.
          </p>
          <p>
            <strong>3.3</strong> A Plataforma adota preço único promocional
            por Lote, sem distinção entre inteira e meia-entrada para os fins
            do presente Evento.
          </p>
          <p>
            <strong>3.4</strong> A confirmação da compra está condicionada à
            aprovação do pagamento pelo provedor de meios de pagamento. Em
            caso de recusa, a reserva do Ingresso é automaticamente liberada
            e disponibilizada para outros compradores.
          </p>
          <p>
            <strong>3.5</strong> Após confirmado o pagamento, o Comprador
            receberá no e-mail cadastrado a confirmação da compra acompanhada
            do(s) QR Code(s) correspondente(s) ao(s) Ingresso(s) adquirido(s).
            Os Ingressos também ficarão disponíveis na área &ldquo;Minhas
            Compras&rdquo; da Plataforma.
          </p>
          <p>
            <strong>3.6</strong> O Organizador reserva-se o direito de limitar
            a quantidade máxima de Ingressos por CPF, conforme indicado na
            página do Evento, visando garantir o acesso democrático aos
            Ingressos e coibir aquisição com finalidade de revenda
            especulativa.
          </p>

          <h2>4. Pagamento</h2>
          <p>
            <strong>4.1</strong> Os pagamentos são processados por meio do
            Mercado Pago, provedor de meios de pagamento contratado pelo
            Organizador, sendo o repasse dos valores realizado diretamente à
            conta de titularidade do Organizador.
          </p>
          <p>
            <strong>4.2</strong> A Plataforma não armazena dados de cartão de
            crédito, nem opera diretamente o processamento financeiro, atuando
            apenas como integradora técnica do checkout.
          </p>
          <p>
            <strong>4.3</strong> Em caso de cobrança duplicada, falha técnica
            do meio de pagamento ou estorno necessário, o Comprador deverá
            entrar em contato com o canal de atendimento da Plataforma, que
            intermediará a tratativa junto ao Organizador.
          </p>

          <h2>5. Entrega e Uso do Ingresso</h2>
          <p>
            <strong>5.1</strong> O Ingresso é entregue exclusivamente em
            formato eletrônico, por meio de QR Code enviado ao e-mail
            cadastrado e disponibilizado na área &ldquo;Minhas Compras&rdquo;
            da Plataforma. Não há emissão de Ingresso físico.
          </p>
          <p>
            <strong>5.2</strong> O acesso ao Evento se dará mediante
            apresentação do QR Code (em tela de dispositivo móvel ou impresso)
            acompanhado de documento oficial de identificação com foto do
            Titular do Ingresso.
          </p>
          <p>
            <strong>5.3</strong> Cada QR Code é único e válido para uma única
            entrada. Após registrada a leitura na portaria do Evento, o QR
            Code é automaticamente invalidado, não sendo permitida nova
            entrada com o mesmo Ingresso.
          </p>
          <p>
            <strong>5.4</strong> É de responsabilidade do Titular zelar pela
            guarda do QR Code, evitando seu compartilhamento ou exposição em
            redes sociais ou aplicativos de mensagem, sob pena de uso por
            terceiros não autorizados, hipótese em que o Organizador e a
            Plataforma não terão responsabilidade pelo evento.
          </p>
          <p>
            <strong>5.5</strong> Em caso de extravio, perda do dispositivo ou
            impossibilidade de acesso ao QR Code, o Comprador poderá, mediante
            validação de identidade, solicitar reenvio do Ingresso por meio do
            canal de atendimento ou da própria Plataforma, na área
            &ldquo;Minhas Compras&rdquo;.
          </p>

          <h2>6. Transferência de Titularidade</h2>
          <p>
            <strong>6.1</strong> Cada Ingresso poderá ser transferido a outro
            titular, gratuitamente, mediante as seguintes condições
            cumulativas:
          </p>
          <ul>
            <li>
              a transferência seja solicitada com, no mínimo, 6 (seis) horas
              de antecedência em relação ao horário de início do Evento;
            </li>
            <li>
              o Ingresso não tenha sido objeto de transferência anterior,
              sendo permitida apenas 1 (uma) transferência por Ingresso;
            </li>
            <li>
              o destinatário da transferência possua cadastro ativo na
              Plataforma;
            </li>
            <li>
              o Titular original forneça os dados completos do destinatário
              (nome completo, CPF e e-mail), responsabilizando-se pela
              veracidade das informações.
            </li>
          </ul>
          <p>
            <strong>6.2</strong> Realizada a transferência, será gerado novo
            QR Code em nome do destinatário, sendo automaticamente invalidado
            o QR Code originalmente emitido. O destinatário receberá o novo
            Ingresso em seu e-mail cadastrado e na área &ldquo;Minhas
            Compras&rdquo; da Plataforma.
          </p>
          <p>
            <strong>6.3</strong> A partir da efetivação da transferência,
            todos os direitos e obrigações decorrentes do Ingresso, incluindo
            a responsabilidade por seu uso adequado, transferem-se ao
            destinatário, isentando o Titular original.
          </p>
          <p>
            <strong>6.4</strong> Até a implementação da funcionalidade
            automatizada de transferência diretamente na Plataforma, as
            solicitações de transferência deverão ser realizadas por meio do
            canal de atendimento{" "}
            <a href="mailto:ingressos@cantorcaiolacerda.com.br">
              ingressos@cantorcaiolacerda.com.br
            </a>
            , com antecedência mínima de 6 (seis) horas em relação ao horário
            de início do Evento, observadas as demais condições desta
            cláusula.
          </p>
          <p>
            <strong>6.5</strong> É expressamente vedada a transferência
            onerosa de Ingressos a valor superior ao originalmente pago
            (revenda especulativa), conforme entendimento aplicável da
            legislação consumerista. A Plataforma e o Organizador reservam-se
            o direito de invalidar Ingressos identificados em prática de
            revenda especulativa, sem qualquer indenização ao Comprador
            original.
          </p>

          <h2>7. Cancelamento pelo Comprador — Direito de Arrependimento</h2>
          <p>
            <strong>7.1</strong> Nos termos do artigo 49 do Código de Defesa
            do Consumidor, o Comprador poderá exercer o direito de
            arrependimento da compra, sem necessidade de justificativa, no
            prazo de 7 (sete) dias contados da data da efetivação do
            pagamento, desde que tal prazo termine antes do início do Evento.
          </p>
          <p>
            <strong>7.2</strong> Para exercício do direito de arrependimento,
            o Comprador deverá enviar solicitação ao canal de atendimento{" "}
            <a href="mailto:ingressos@cantorcaiolacerda.com.br">
              ingressos@cantorcaiolacerda.com.br
            </a>
            , informando os dados do pedido, no prazo previsto na cláusula
            7.1.
          </p>
          <p>
            <strong>7.3</strong> Recebida tempestivamente a solicitação, o
            Ingresso será cancelado e o valor pago integralmente restituído ao
            Comprador, no mesmo meio de pagamento utilizado, no prazo médio
            praticado pelo provedor de pagamento, podendo variar conforme
            operadora.
          </p>
          <p>
            <strong>7.4</strong> Solicitações de cancelamento realizadas após
            o prazo legal de 7 (sete) dias, ou cuja data ultrapasse o início
            do Evento, não ensejarão direito a reembolso, ressalvadas as
            hipóteses de cancelamento ou adiamento previstas na cláusula 8.
          </p>

          <h2>8. Cancelamento ou Adiamento do Evento</h2>
          <p>
            <strong>8.1</strong> Em caso de cancelamento do Evento por
            qualquer razão, o Organizador, por intermédio da Plataforma,
            restituirá integralmente os valores pagos pelos Ingressos, no
            mesmo meio de pagamento utilizado, no prazo de até 30 (trinta)
            dias contados da comunicação oficial do cancelamento.
          </p>
          <p>
            <strong>8.2</strong> Em caso de adiamento do Evento, o Comprador
            poderá optar, no prazo de 15 (quinze) dias contados da comunicação
            oficial da nova data, entre:
          </p>
          <ul>
            <li>
              manter o Ingresso válido para a nova data do Evento, sem
              necessidade de qualquer providência adicional; ou
            </li>
            <li>
              solicitar o cancelamento e receber o reembolso integral do valor
              pago, no mesmo meio de pagamento utilizado, no prazo de até 30
              (trinta) dias contados da solicitação.
            </li>
          </ul>
          <p>
            <strong>8.3</strong> A ausência de manifestação do Comprador no
            prazo previsto na cláusula 8.2 implicará a manutenção automática
            do Ingresso para a nova data do Evento.
          </p>
          <p>
            <strong>8.4</strong> A comunicação de cancelamento ou adiamento
            será realizada por meio do e-mail cadastrado pelo Comprador e/ou
            por aviso na Plataforma, sendo considerada efetivamente recebida
            na data do envio.
          </p>

          <h2>9. Acesso ao Evento e Regras de Portaria</h2>
          <p>
            <strong>9.1</strong> O acesso ao Evento somente será permitido
            mediante apresentação do QR Code válido e de documento oficial de
            identificação com foto do Titular do Ingresso.
          </p>
          <p>
            <strong>9.2</strong> Menores de 18 (dezoito) anos somente poderão
            acessar o Evento quando acompanhados de seus pais ou responsáveis
            legais, mediante apresentação de documento que comprove o vínculo
            e assinatura, na portaria, do termo de responsabilidade fornecido
            pela casa de espetáculos.
          </p>
          <p>
            <strong>9.3</strong> É de competência exclusiva da casa de
            espetáculos a definição e fiscalização das regras de acesso,
            segurança, vestimenta, faixa etária, consumo e quaisquer outras
            regras de portaria. O Comprador declara estar ciente de que a
            recusa de acesso por descumprimento das regras da casa não enseja
            direito a reembolso.
          </p>
          <p>
            <strong>9.4</strong> É de inteira responsabilidade do Titular
            comparecer ao Evento com antecedência razoável em relação ao
            horário de início, observada a previsão de fila e procedimentos
            de portaria. A perda do acesso por atraso do Titular não enseja
            direito a reembolso.
          </p>

          <h2>10. Autorização de Uso de Imagem</h2>
          <p>
            <strong>10.1</strong> Ao adquirir o Ingresso e acessar o Evento,
            o Titular autoriza, de forma gratuita, irrevogável e por prazo
            indeterminado, a captação, fixação, edição, reprodução e
            veiculação de sua imagem, voz e som, captadas durante o Evento,
            para fins de divulgação, promoção e registro institucional do
            Evento e de eventos futuros do Organizador, em qualquer mídia,
            plataforma ou suporte, no Brasil e no exterior.
          </p>
          <p>
            <strong>10.2</strong> A autorização de que trata esta cláusula
            não confere ao Titular qualquer direito a remuneração, sendo a
            participação no Evento entendida como consentimento expresso e
            suficiente para os fins aqui estabelecidos.
          </p>
          <p>
            <strong>10.3</strong> O Titular que não desejar ter sua imagem
            captada deverá manifestar-se previamente, por escrito, ao
            Organizador, com antecedência mínima de 5 (cinco) dias do Evento,
            sendo certo que, em razão da natureza pública do Evento, não há
            garantia técnica absoluta de exclusão de captação incidental.
          </p>

          <h2>11. Conduta do Usuário</h2>
          <p>
            <strong>11.1</strong> O Usuário compromete-se a utilizar a
            Plataforma de forma lícita, respeitosa e em conformidade com a
            legislação aplicável, sendo expressamente vedado:
          </p>
          <ul>
            <li>
              praticar fraude, falsificação de documentos, uso de dados de
              terceiros ou meios fraudulentos para aquisição de Ingressos;
            </li>
            <li>
              realizar engenharia reversa, scraping automatizado ou tentativas
              de acesso indevido aos sistemas da Plataforma;
            </li>
            <li>
              comercializar Ingressos a preço superior ao adquirido (revenda
              especulativa);
            </li>
            <li>
              compartilhar QR Codes em redes sociais ou aplicativos públicos
              de forma a permitir o uso por terceiros não autorizados;
            </li>
            <li>
              praticar qualquer conduta que possa causar prejuízo à
              Plataforma, ao Organizador, a outros Usuários ou ao Evento.
            </li>
          </ul>
          <p>
            <strong>11.2</strong> A constatação de qualquer das condutas
            vedadas autoriza o cancelamento imediato dos Ingressos envolvidos,
            com ou sem reembolso, a critério do Organizador, e o eventual
            encaminhamento dos fatos às autoridades competentes.
          </p>

          <h2>12. Limitação de Responsabilidade</h2>
          <p>
            <strong>12.1</strong> A Plataforma atua como prestadora de
            serviços tecnológicos de intermediação e não é responsável pela
            realização do Evento, pela qualidade do espetáculo, pela presença
            ou ausência de artistas anunciados, por alterações de programação,
            pelo serviço da casa de espetáculos ou por quaisquer outras
            questões inerentes à execução do Evento, que são de
            responsabilidade exclusiva do Organizador.
          </p>
          <p>
            <strong>12.2</strong> A responsabilidade da Plataforma limita-se
            à correta operação tecnológica do website, ao processamento
            técnico das compras, à emissão dos QR Codes e ao envio das
            comunicações operacionais previstas nestes Termos.
          </p>
          <p>
            <strong>12.3</strong> A Plataforma envidará esforços razoáveis
            para manter o serviço disponível, ininterrupto e livre de erros,
            mas não garante ausência absoluta de indisponibilidade técnica,
            falhas de conectividade, problemas em provedores terceirizados
            (servidor, e-mail, meio de pagamento) ou outras intercorrências
            fora de seu controle direto.
          </p>
          <p>
            <strong>12.4</strong> Em nenhuma hipótese a Plataforma ou o
            Organizador serão responsáveis por danos indiretos, lucros
            cessantes ou prejuízos decorrentes de fatos imprevisíveis, casos
            fortuitos ou de força maior, incluindo mas não se limitando a:
            pandemias, calamidades públicas, decisões de autoridades
            sanitárias, climáticas ou administrativas, interrupções de
            energia ou telecomunicações.
          </p>

          <h2>13. Proteção de Dados Pessoais</h2>
          <p>
            <strong>13.1</strong> O tratamento de dados pessoais pelo
            Organizador e pela Plataforma observa integralmente a Lei Geral
            de Proteção de Dados Pessoais (Lei nº 13.709/2018 —
            &ldquo;LGPD&rdquo;).
          </p>
          <p>
            <strong>13.2</strong> As regras detalhadas sobre coleta,
            finalidade, retenção, compartilhamento, direitos do titular e
            canais de exercício destes direitos estão descritas na{" "}
            <a href="/privacidade">Política de Privacidade</a>, documento que
            integra estes Termos para todos os fins.
          </p>
          <p>
            <strong>13.3</strong> Para o tratamento dos dados pessoais
            coletados na Plataforma, o Organizador atua como Controlador, e a
            Plataforma como Operadora, nos termos do artigo 5º, incisos VI e
            VII, da LGPD.
          </p>
          <p>
            <strong>13.4</strong> Para o exercício de qualquer direito
            previsto na LGPD, o titular dos dados poderá entrar em contato
            pelo e-mail{" "}
            <a href="mailto:privacidade@zdkproducoes.com.br">
              privacidade@zdkproducoes.com.br
            </a>
            .
          </p>

          <h2>14. Propriedade Intelectual</h2>
          <p>
            <strong>14.1</strong> Todos os elementos da Plataforma —
            incluindo, sem limitação, código-fonte, design, marcas, logotipos,
            layouts, textos, imagens, ícones, estrutura de navegação e
            funcionalidades — são de titularidade exclusiva da ZDK Produções
            e/ou do Organizador, conforme o caso, sendo protegidos pela
            legislação aplicável de propriedade intelectual.
          </p>
          <p>
            <strong>14.2</strong> É vedada a reprodução, cópia, modificação,
            distribuição, comercialização ou utilização de qualquer elemento
            da Plataforma sem autorização prévia e expressa de seus
            respectivos titulares.
          </p>

          <h2>15. Alterações dos Termos</h2>
          <p>
            <strong>15.1</strong> Estes Termos poderão ser atualizados
            periodicamente pelo Organizador e pela Plataforma, a fim de
            refletir alterações legais, regulatórias, operacionais ou
            tecnológicas.
          </p>
          <p>
            <strong>15.2</strong> A versão vigente dos Termos estará sempre
            disponível em https://www.zdkingressos.com.br/termos, com
            indicação clara da data da última atualização.
          </p>
          <p>
            <strong>15.3</strong> Alterações relevantes serão comunicadas
            previamente aos Usuários por e-mail e/ou aviso na Plataforma. A
            continuidade do uso da Plataforma após a comunicação implicará
            aceitação tácita das novas condições.
          </p>

          <h2>16. Disposições Gerais</h2>
          <p>
            <strong>16.1</strong> A invalidade ou inexequibilidade de
            qualquer cláusula destes Termos não afetará a validade das demais
            cláusulas, que permanecerão em pleno vigor.
          </p>
          <p>
            <strong>16.2</strong> A tolerância de qualquer das partes quanto
            ao descumprimento de qualquer cláusula destes Termos não
            constituirá renúncia ao direito de exigir seu cumprimento
            posteriormente.
          </p>
          <p>
            <strong>16.3</strong> Estes Termos constituem o acordo integral
            entre as partes em relação ao seu objeto, prevalecendo sobre
            quaisquer entendimentos ou comunicações anteriores.
          </p>

          <h2>17. Foro e Legislação Aplicável</h2>
          <p>
            <strong>17.1</strong> Estes Termos são regidos pelas leis da
            República Federativa do Brasil.
          </p>
          <p>
            <strong>17.2</strong> Fica eleito o foro da comarca de domicílio
            do Comprador para dirimir quaisquer controvérsias decorrentes
            destes Termos, em conformidade com o artigo 101, inciso I, do
            Código de Defesa do Consumidor.
          </p>
        </div>
      </article>
    </main>
  );
}