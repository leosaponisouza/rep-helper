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

interface TermsSection {
  title: string;
  paragraphs: ReadonlyArray<string>;
  bullets?: ReadonlyArray<string>;
}

const TERMS_SECTIONS: ReadonlyArray<TermsSection> = [
  {
    title: '1. Aceitação dos Termos',
    paragraphs: [
      'Ao acessar ou utilizar o aplicativo RepHelper ("Aplicativo"), você concorda com estes Termos de Uso. Se você não concordar com qualquer parte destes termos, por favor, não utilize o Aplicativo.',
    ],
  },
  {
    title: '2. Descrição do Serviço',
    paragraphs: [
      'O RepHelper é um aplicativo que oferece serviços de gerenciamento para repúblicas e moradias compartilhadas, incluindo gestão de tarefas, despesas e eventos entre moradores.',
      'Os serviços oferecidos pelo Aplicativo estão sujeitos a alterações a critério da RepHelper, sem aviso prévio.',
    ],
  },
  {
    title: '3. Cadastro e Responsabilidades',
    paragraphs: [
      '3.1. Para utilizar o Aplicativo, é necessário criar uma conta fornecendo informações precisas e completas.',
      '3.2. Você é responsável por manter a confidencialidade de sua senha e por todas as atividades que ocorrem em sua conta.',
      '3.3. Você concorda em notificar imediatamente o RepHelper sobre qualquer uso não autorizado de sua conta ou qualquer outra violação de segurança.',
      '3.4. O RepHelper não será responsável por quaisquer perdas ou danos decorrentes do seu não cumprimento desta seção.',
    ],
  },
  {
    title: '4. Uso do Aplicativo',
    paragraphs: [
      '4.1. Você concorda em utilizar o Aplicativo apenas para fins legais e de acordo com estes Termos.',
      '4.2. Você não pode:',
    ],
    bullets: [
      'Utilizar o Aplicativo de qualquer maneira que possa danificar, desabilitar ou sobrecarregar o Aplicativo;',
      'Tentar acessar áreas restritas do Aplicativo;',
      'Utilizar robots, spiders ou outros dispositivos automáticos para acessar o Aplicativo;',
      'Introduzir vírus, trojan, worms ou outro material malicioso no Aplicativo;',
      'Coletar informações pessoais de outros usuários sem consentimento;',
      'Violar quaisquer leis ou regulamentos aplicáveis.',
    ],
  },
  {
    title: '5. Propriedade Intelectual',
    paragraphs: [
      '5.1. O conteúdo, recursos e funcionalidades do Aplicativo, incluindo textos, gráficos, logos, ícones e imagens, são propriedade do RepHelper e estão protegidos por leis de direitos autorais, marcas comerciais e outras leis de propriedade intelectual.',
      '5.2. Você não tem permissão para copiar, modificar, distribuir, vender ou alugar qualquer parte do Aplicativo ou seu conteúdo, nem para realizar engenharia reversa ou tentar extrair o código fonte do Aplicativo.',
    ],
  },
  {
    title: '6. Conteúdo do Usuário',
    paragraphs: [
      '6.1. O Aplicativo permite que os usuários publiquem, enviem ou transmitam conteúdo, como tarefas, eventos, transações financeiras e comentários ("Conteúdo do Usuário").',
      '6.2. Você mantém a propriedade sobre seu Conteúdo do Usuário, mas concede ao RepHelper uma licença mundial, não exclusiva, livre de royalties para usar, reproduzir, modificar, adaptar, publicar e exibir tal conteúdo no Aplicativo e em todos os serviços relacionados.',
      '6.3. Você é o único responsável por seu Conteúdo do Usuário e pelas consequências de publicá-lo ou compartilhá-lo.',
      '6.4. O RepHelper não garante a precisão, integridade ou qualidade do Conteúdo do Usuário e não endossa qualquer opinião expressa por qualquer usuário.',
    ],
  },
  {
    title: '7. Privacidade',
    paragraphs: [
      '7.1. O uso do Aplicativo está sujeito à nossa Política de Privacidade, que descreve como coletamos, usamos e compartilhamos suas informações.',
      '7.2. Ao utilizar o Aplicativo, você consente com a coleta e uso de suas informações conforme descrito na Política de Privacidade.',
      '7.3. Estamos comprometidos em respeitar a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018) e outras leis de privacidade aplicáveis.',
    ],
  },
  {
    title: '8. Modificações do Serviço e dos Termos',
    paragraphs: [
      '8.1. O RepHelper reserva-se o direito de modificar ou descontinuar, temporariamente ou permanentemente, o Aplicativo ou qualquer recurso ou parte dele, a qualquer momento e sem aviso prévio.',
      '8.2. O RepHelper também pode atualizar estes Termos de Uso a qualquer momento. Você será notificado sobre quaisquer alterações materiais nestes Termos.',
      '8.3. O uso contínuo do Aplicativo após tais modificações constitui sua aceitação dos Termos modificados.',
    ],
  },
  {
    title: '9. Limitação de Responsabilidade',
    paragraphs: [
      '9.1. O Aplicativo é fornecido "como está" e "conforme disponível", sem garantias de qualquer tipo, expressas ou implícitas.',
      '9.2. O RepHelper não garante que o Aplicativo funcionará sem interrupções, de maneira segura ou livre de erros, nem que os defeitos serão corrigidos.',
      '9.3. O RepHelper não será responsável por quaisquer danos indiretos, incidentais, especiais, consequenciais ou punitivos, incluindo perdas de lucros, dados ou uso.',
    ],
  },
  {
    title: '10. Indenização',
    paragraphs: [
      'Você concorda em defender, indenizar e isentar o RepHelper e seus funcionários, diretores, agentes e parceiros de e contra quaisquer reivindicações, danos, obrigações, perdas, responsabilidades, custos ou dívidas e despesas decorrentes de: (i) seu uso e acesso ao Aplicativo; (ii) sua violação de qualquer termo destes Termos; (iii) sua violação de quaisquer direitos de terceiros, incluindo sem limitação quaisquer direitos autorais, de propriedade ou de privacidade.',
    ],
  },
  {
    title: '11. Lei Aplicável e Jurisdição',
    paragraphs: [
      'Estes Termos serão regidos e interpretados de acordo com as leis da República Federativa do Brasil. Qualquer disputa decorrente ou relacionada a estes Termos será submetida à jurisdição exclusiva dos tribunais da cidade de São Paulo, Brasil.',
    ],
  },
  {
    title: '12. Disposições Gerais',
    paragraphs: [
      '12.1. Estes Termos constituem o acordo integral entre você e o RepHelper em relação ao uso do Aplicativo.',
      '12.2. A falha do RepHelper em exercer ou fazer cumprir qualquer direito ou disposição destes Termos não constituirá uma renúncia a tal direito ou disposição.',
      '12.3. Se qualquer disposição destes Termos for considerada inválida ou inexequível por um tribunal, as disposições restantes permanecerão em pleno vigor e efeito.',
      '12.4. Você não pode ceder ou transferir estes Termos, por força de lei ou de outra forma, sem o consentimento prévio por escrito do RepHelper.',
      '12.5. O RepHelper pode ceder estes Termos, no todo ou em parte, a qualquer momento, com ou sem aviso prévio.',
    ],
  },
  {
    title: 'Contato',
    paragraphs: [
      'Se você tiver alguma dúvida sobre estes Termos de Uso, entre em contato conosco pelo e-mail: suporte@rephelper.com.br',
    ],
  },
];

const TermsOfUseScreen = () => {
  const router = useRouter();
  const { theme } = useTheme();

  return (
    <Screen
      scroll
      header={
        <ScreenHeader
          title="Termos de Uso"
          subtitle="Última atualização: 01 de março de 2025"
          onBack={() => router.back()}
        />
      }
    >
      <Surface tone="surface" bordered padded="md" style={{ gap: theme.spacing.lg }}>
        {TERMS_SECTIONS.map((section, index) => (
          <View key={section.title} style={{ gap: theme.spacing.sm }}>
            {index > 0 ? <Divider /> : null}

            <AppText variant="heading" color="ink">
              {section.title}
            </AppText>

            {section.paragraphs.map((paragraph) => (
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
                  <AppText key={bullet} variant="body" color="inkSecondary">
                    • {bullet}
                  </AppText>
                ))}
              </View>
            ) : null}
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

export default TermsOfUseScreen;
