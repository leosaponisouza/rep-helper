import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  AppText,
  Divider,
  Screen,
  ScreenHeader,
  Surface,
  useTheme,
} from '../../../src/design-system';

interface PolicyBullet {
  boldPrefix?: string;
  text: string;
}

interface PolicySection {
  title?: string;
  paragraphs?: ReadonlyArray<string>;
  bullets?: ReadonlyArray<PolicyBullet>;
  trailingParagraphs?: ReadonlyArray<string>;
}

const POLICY_SECTIONS: ReadonlyArray<PolicySection> = [
  {
    paragraphs: [
      'A RepHelper ("nós", "nosso" ou "RepHelper") está comprometida em proteger a privacidade e os dados pessoais dos usuários do aplicativo RepHelper ("Aplicativo"). Esta Política de Privacidade descreve como coletamos, usamos, compartilhamos e protegemos suas informações pessoais em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).',
      'Ao usar nosso Aplicativo, você concorda com as práticas descritas nesta Política de Privacidade. Recomendamos que você leia este documento com atenção.',
    ],
  },
  {
    title: '1. Definições',
    paragraphs: ['Para os fins desta Política de Privacidade:'],
    bullets: [
      {
        boldPrefix: 'Dados Pessoais:',
        text: ' Informações relacionadas a uma pessoa natural identificada ou identificável.',
      },
      {
        boldPrefix: 'Tratamento:',
        text: ' Toda operação realizada com dados pessoais, como coleta, uso, acesso, reprodução, transmissão, etc.',
      },
      {
        boldPrefix: 'Titular:',
        text: ' Pessoa natural a quem se referem os dados pessoais tratados.',
      },
      {
        boldPrefix: 'Controlador:',
        text: ' Pessoa a quem competem as decisões sobre o tratamento de dados pessoais (RepHelper).',
      },
      {
        boldPrefix: 'ANPD:',
        text: ' Autoridade Nacional de Proteção de Dados.',
      },
    ],
  },
  {
    title: '2. Dados que Coletamos',
    paragraphs: ['Podemos coletar os seguintes tipos de dados pessoais:'],
    bullets: [
      {
        boldPrefix: 'Dados de Cadastro:',
        text: ' Nome, endereço de e-mail, número de telefone, informações de perfil como foto e apelido.',
      },
      {
        boldPrefix: 'Dados de Uso:',
        text: ' Interações com o Aplicativo, tarefas criadas, eventos, transações financeiras e registros de atividades.',
      },
      {
        boldPrefix: 'Dados de Dispositivo:',
        text: ' Tipo de dispositivo, sistema operacional, identificadores únicos de dispositivo, informações de rede e endereço IP.',
      },
      {
        boldPrefix: 'Dados de Localização:',
        text: ' Aproximada ou precisa, conforme permissões concedidas.',
      },
      {
        boldPrefix: 'Conteúdo Criado:',
        text: ' Informações que você fornece ao utilizar o Aplicativo, como comentários, tarefas e eventos.',
      },
    ],
  },
  {
    title: '3. Base Legal para Tratamento',
    paragraphs: [
      'Em conformidade com a LGPD, tratamos seus dados pessoais com base nas seguintes bases legais:',
    ],
    bullets: [
      {
        boldPrefix: 'Consentimento:',
        text: ' Quando você concorda expressamente com o uso de seus dados para uma finalidade específica.',
      },
      {
        boldPrefix: 'Execução de Contrato:',
        text: ' Para fornecer os serviços solicitados e cumprir os Termos de Uso.',
      },
      {
        boldPrefix: 'Interesse Legítimo:',
        text: ' Quando o tratamento é necessário para atender aos interesses legítimos da RepHelper ou de terceiros, sem prejudicar seus direitos e liberdades fundamentais.',
      },
      {
        boldPrefix: 'Cumprimento de Obrigação Legal:',
        text: ' Quando necessário para cumprir uma obrigação legal ou regulatória.',
      },
    ],
  },
  {
    title: '4. Finalidades do Tratamento',
    paragraphs: ['Utilizamos seus dados pessoais para:'],
    bullets: [
      { text: 'Fornecer e manter o Aplicativo;' },
      { text: 'Permitir o gerenciamento de repúblicas e moradias compartilhadas;' },
      { text: 'Processar e facilitar a divisão de despesas entre moradores;' },
      { text: 'Coordenar tarefas e eventos compartilhados;' },
      { text: 'Autenticar usuários e proteger suas contas;' },
      { text: 'Personalizar sua experiência com o Aplicativo;' },
      { text: 'Enviar comunicações relacionadas ao serviço;' },
      { text: 'Melhorar e otimizar o Aplicativo;' },
      { text: 'Detectar, prevenir e resolver problemas técnicos ou de segurança;' },
      { text: 'Cumprir obrigações legais.' },
    ],
  },
  {
    title: '5. Compartilhamento de Dados',
    paragraphs: [
      'Podemos compartilhar seus dados pessoais nas seguintes circunstâncias:',
    ],
    bullets: [
      {
        boldPrefix: 'Com outros membros da república:',
        text: ' Informações de perfil, tarefas atribuídas, despesas compartilhadas e outras informações necessárias para o funcionamento do aplicativo.',
      },
      {
        boldPrefix: 'Com prestadores de serviços:',
        text: ' Empresas que nos fornecem serviços, como hospedagem, análise, processamento de pagamentos e atendimento ao cliente.',
      },
      {
        boldPrefix: 'Por razões legais:',
        text: ' Se acreditarmos de boa-fé que o acesso, uso, preservação ou divulgação dos dados é necessário para cumprir uma obrigação legal, processo legal ou solicitação governamental aplicável.',
      },
      {
        boldPrefix: 'Proteção de direitos:',
        text: ' Para detectar, prevenir ou resolver problemas técnicos, de segurança ou fraude.',
      },
    ],
    trailingParagraphs: [
      'Todos os terceiros com quem compartilhamos dados estão sujeitos a obrigações de confidencialidade e devem implementar medidas de segurança adequadas.',
    ],
  },
  {
    title: '6. Transferência Internacional de Dados',
    paragraphs: [
      'Seus dados pessoais podem ser transferidos e processados em países fora do Brasil, onde mantemos servidores ou onde nossos prestadores de serviços operam. Adotamos salvaguardas contratuais e técnicas adequadas para garantir que seus dados continuem protegidos de acordo com esta Política e com a LGPD.',
      'Só transferimos dados para países ou organizações que proporcionem um grau de proteção adequado ou mediante a adoção de garantias e mecanismos que assegurem a observância dos princípios, direitos e obrigações estabelecidos pela LGPD.',
    ],
  },
  {
    title: '7. Armazenamento e Segurança',
    paragraphs: [
      'Mantemos medidas de segurança técnicas, administrativas e organizacionais projetadas para proteger seus dados pessoais contra acesso não autorizado, perda, destruição, alteração ou divulgação.',
      'Algumas medidas adotadas incluem:',
    ],
    bullets: [
      { text: 'Criptografia de dados em trânsito e em repouso;' },
      { text: 'Controles de acesso restritos para funcionários;' },
      { text: 'Auditorias de segurança regulares;' },
      { text: 'Monitoramento contínuo de ameaças.' },
    ],
    trailingParagraphs: [
      'Mantemos seus dados pessoais apenas pelo tempo necessário para cumprir as finalidades para as quais foram coletados, a menos que um período de retenção mais longo seja necessário ou permitido por lei.',
    ],
  },
  {
    title: '8. Seus Direitos como Titular de Dados',
    paragraphs: [
      'De acordo com a LGPD, você tem os seguintes direitos em relação aos seus dados pessoais:',
    ],
    bullets: [
      {
        boldPrefix: 'Confirmação e Acesso:',
        text: ' Confirmar a existência de tratamento e acessar seus dados.',
      },
      {
        boldPrefix: 'Correção:',
        text: ' Solicitar a correção de dados incompletos, inexatos ou desatualizados.',
      },
      {
        boldPrefix: 'Anonimização, Bloqueio ou Eliminação:',
        text: ' Solicitar que dados desnecessários, excessivos ou tratados em desconformidade com a LGPD sejam anonimizados, bloqueados ou eliminados.',
      },
      {
        boldPrefix: 'Portabilidade:',
        text: ' Obter a portabilidade dos seus dados para outro serviço ou produto.',
      },
      {
        boldPrefix: 'Eliminação:',
        text: ' Solicitar a eliminação dos dados tratados com seu consentimento, quando aplicável.',
      },
      {
        boldPrefix: 'Informação:',
        text: ' Ser informado sobre entidades públicas e privadas com as quais compartilhamos seus dados.',
      },
      {
        boldPrefix: 'Revogação do Consentimento:',
        text: ' Revogar seu consentimento a qualquer momento.',
      },
    ],
    trailingParagraphs: [
      'Para exercer seus direitos, entre em contato conosco através do e-mail privacidade@rephelper.com.br. Responderemos à sua solicitação em até 15 dias, conforme estabelecido pela LGPD.',
    ],
  },
  {
    title: '9. Cookies e Tecnologias Semelhantes',
    paragraphs: [
      'O Aplicativo pode utilizar cookies e tecnologias semelhantes para melhorar a experiência do usuário, lembrar preferências, entender como o Aplicativo é utilizado e personalizar conteúdo.',
      'Você pode gerenciar suas preferências de cookies através das configurações do seu dispositivo ou navegador, mas tenha em mente que a desativação de certos cookies pode afetar a funcionalidade do Aplicativo.',
    ],
  },
  {
    title: '10. Crianças e Adolescentes',
    paragraphs: [
      'O Aplicativo não é destinado a menores de 16 anos. Não coletamos intencionalmente dados pessoais de crianças ou adolescentes. Se tomarmos conhecimento de que coletamos dados pessoais de um menor de 16 anos sem a autorização específica e verificável de seus pais ou responsáveis legais, tomaremos medidas para excluir essas informações de nossos servidores.',
    ],
  },
  {
    title: '11. Alterações nesta Política',
    paragraphs: [
      'Podemos atualizar esta Política de Privacidade periodicamente para refletir alterações em nossas práticas de privacidade ou por outros motivos operacionais, legais ou regulatórios.',
      'Notificaremos você sobre quaisquer alterações materiais por meio de uma notificação no Aplicativo ou por e-mail antes que as alterações entrem em vigor. Recomendamos que você revise periodicamente esta Política para se manter informado sobre como estamos protegendo suas informações.',
    ],
  },
  {
    title: '12. Encarregado de Proteção de Dados (DPO)',
    paragraphs: [
      'Em conformidade com a LGPD, designamos um Encarregado de Proteção de Dados (Data Protection Officer - DPO) responsável por atuar como canal de comunicação entre a RepHelper, os titulares dos dados e a Autoridade Nacional de Proteção de Dados (ANPD).',
      'Para entrar em contato com nosso DPO, envie um e-mail para: dpo@rephelper.com.br',
    ],
  },
  {
    title: 'Contato',
    paragraphs: [
      'Se você tiver dúvidas, preocupações ou solicitações relacionadas a esta Política de Privacidade ou ao tratamento de seus dados pessoais, entre em contato conosco em:',
      'RepHelper Tecnologia Ltda.',
      'Av. Paulista, 1000, São Paulo - SP, 01310-100',
      'privacidade@rephelper.com.br',
      'Responderemos a todas as solicitações dentro de 15 dias, conforme exigido pela LGPD.',
    ],
  },
];

const PrivacyPolicyScreen = () => {
  const router = useRouter();
  const { theme } = useTheme();

  return (
    <Screen
      scroll
      header={
        <ScreenHeader
          title="Política de Privacidade"
          subtitle="Última atualização: 01 de março de 2025"
          onBack={() => router.back()}
        />
      }
    >
      <Surface tone="surface" bordered padded="md" style={{ gap: theme.spacing.lg }}>
        {POLICY_SECTIONS.map((section, index) => (
          <View
            key={section.title || `intro-${index}`}
            style={{ gap: theme.spacing.sm }}
          >
            {index > 0 ? <Divider /> : null}

            {section.title ? (
              <AppText variant="heading" color="ink">
                {section.title}
              </AppText>
            ) : null}

            {section.paragraphs?.map((paragraph) => (
              <AppText key={paragraph} variant="body" color="inkSecondary">
                {paragraph}
              </AppText>
            ))}

            {section.bullets ? (
              <View style={[styles.bulletList, { paddingLeft: theme.spacing.sm, gap: theme.spacing.xs }]}>
                {section.bullets.map((bullet) => (
                  <AppText
                    key={`${bullet.boldPrefix ?? ''}${bullet.text}`}
                    variant="body"
                    color="inkSecondary"
                  >
                    •{' '}
                    {bullet.boldPrefix ? (
                      <AppText variant="bodyStrong" color="ink">
                        {bullet.boldPrefix}
                      </AppText>
                    ) : null}
                    {bullet.text}
                  </AppText>
                ))}
              </View>
            ) : null}

            {section.trailingParagraphs?.map((paragraph) => (
              <AppText key={paragraph} variant="body" color="inkSecondary">
                {paragraph}
              </AppText>
            ))}
          </View>
        ))}
      </Surface>
    </Screen>
  );
};

const styles = StyleSheet.create({
  bulletList: {
    width: '100%',
  },
});

export default PrivacyPolicyScreen;
