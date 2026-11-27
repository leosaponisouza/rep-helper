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
      'O Alpendre ("nós", "nosso" ou "Alpendre") está comprometido em proteger a privacidade e os dados pessoais dos usuários do aplicativo Alpendre ("Aplicativo"). Esta Política de Privacidade descreve como coletamos, usamos, compartilhamos e protegemos suas informações pessoais em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).',
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
        text: ' Toda operação realizada com dados pessoais, como coleta, uso, acesso, reprodução e transmissão.',
      },
      {
        boldPrefix: 'Titular:',
        text: ' Pessoa natural a quem se referem os dados pessoais tratados.',
      },
      {
        boldPrefix: 'Controlador:',
        text: ' Pessoa a quem competem as decisões sobre o tratamento de dados pessoais (Alpendre).',
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
        text: ' Nome, endereço de e-mail, número de telefone opcional, chave PIX opcional e informações de perfil como foto e apelido.',
      },
      {
        boldPrefix: 'Dados da Casa (Opcionais):',
        text: ' Nome da casa, regras de convivência configuradas e, apenas se preenchido voluntariamente, endereço postal da casa.',
      },
      {
        boldPrefix: 'Dados de Uso:',
        text: ' Tarefas criadas, eventos da agenda, registros financeiros e interações dentro da casa compartilhada.',
      },
      {
        boldPrefix: 'Dados de Dispositivo:',
        text: ' Tipo de dispositivo, sistema operacional, tokens de notificação push e registros técnicos de segurança.',
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
        text: ' Quando o tratamento é necessário para atender aos interesses legítimos do Alpendre ou de terceiros, sem prejudicar seus direitos e liberdades fundamentais.',
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
      { text: 'Permitir a organização de casas e moradias compartilhadas;' },
      { text: 'Registrar despesas, entradas e histórico financeiro da casa;' },
      { text: 'Coordenar tarefas recorrentes e eventos na agenda compartilhada;' },
      { text: 'Autenticar usuários e proteger suas contas;' },
      { text: 'Enviar comunicações e notificações relacionadas à rotina da casa;' },
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
        boldPrefix: 'Com outros moradores da mesma casa:',
        text: ' Informações de perfil, tarefas atribuídas, despesas registradas e compromissos necessários para o funcionamento colaborativo da casa.',
      },
      {
        boldPrefix: 'Com prestadores de serviços:',
        text: ' Empresas que nos fornecem infraestrutura de hospedagem, envio de e-mails transacionais e notificações push.',
      },
      {
        boldPrefix: 'Por razões legais:',
        text: ' Quando necessário para cumprir obrigação legal, processo judicial ou solicitação governamental aplicável.',
      },
      {
        boldPrefix: 'Proteção de direitos:',
        text: ' Para detectar, prevenir ou resolver incidentes técnicos, de segurança ou fraude.',
      },
    ],
    trailingParagraphs: [
      'Os dados de uma casa são estritamente isolados e nunca ficam visíveis para usuários de outras casas.',
    ],
  },
  {
    title: '6. Armazenamento e Segurança',
    paragraphs: [
      'Mantemos medidas de segurança técnicas, administrativas e organizacionais projetadas para proteger seus dados pessoais contra acesso não autorizado, perda, destruição, alteração ou divulgação:',
    ],
    bullets: [
      { text: 'Criptografia de dados em trânsito (TLS) e senhas com hash seguro;' },
      { text: 'Isolamento multi-tenant por casa em todas as rotas da API;' },
      { text: 'Rotação de tokens de sessão e detecção de reuso;' },
      { text: 'Monitoramento contínuo e auditorias regulares.' },
    ],
  },
  {
    title: '7. Seus Direitos como Titular de Dados',
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
        boldPrefix: 'Portabilidade e Revogação:',
        text: ' Solicitar portabilidade ou revogar seu consentimento a qualquer momento.',
      },
    ],
    trailingParagraphs: [
      'Para exercer seus direitos, entre em contato conosco através do e-mail privacidade@alpendre.app. Responderemos à sua solicitação em até 15 dias, conforme estabelecido pela LGPD.',
    ],
  },
  {
    title: '8. Encarregado de Proteção de Dados (DPO) e Contato',
    paragraphs: [
      'Para entrar em contato com nosso Encarregado de Proteção de Dados (DPO) ou tirar dúvidas sobre esta Política de Privacidade:',
      'Alpendre Tecnologia Ltda.',
      'E-mail de Privacidade: privacidade@alpendre.app',
      'E-mail do DPO: dpo@alpendre.app',
      'Contato Geral: contato@alpendre.app',
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
          subtitle="Última atualização: 27 de novembro de 2026"
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
              <View
                style={[
                  styles.bulletList,
                  { paddingLeft: theme.spacing.sm, gap: theme.spacing.xs },
                ]}
              >
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
