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
      'Ao acessar ou utilizar o aplicativo Alpendre ("Aplicativo"), você concorda com estes Termos de Uso. Se você não concordar com qualquer parte destes termos, por favor, não utilize o Aplicativo.',
    ],
  },
  {
    title: '2. Descrição do Serviço',
    paragraphs: [
      'O Alpendre é uma plataforma de organização doméstica para casas e moradias compartilhadas, incluindo gestão de tarefas, acompanhamento de gastos ou caixinha e agenda compartilhada entre moradores.',
      'Os serviços oferecidos pelo Aplicativo estão sujeitos a evoluções e melhorias contínuas pelo Alpendre.',
    ],
  },
  {
    title: '3. Cadastro e Responsabilidades',
    paragraphs: [
      '3.1. Para utilizar o Aplicativo, é necessário criar uma conta fornecendo informações precisas e atualizadas.',
      '3.2. Você é responsável por manter a confidencialidade de sua senha e por todas as atividades que ocorrem em sua conta.',
      '3.3. Você concorda em notificar imediatamente o Alpendre sobre qualquer uso não autorizado de sua conta ou qualquer violação de segurança.',
      '3.4. O Alpendre não será responsável por perdas ou danos decorrentes do descumprimento desta seção pelo usuário.',
    ],
  },
  {
    title: '4. Uso do Aplicativo',
    paragraphs: [
      '4.1. Você concorda em utilizar o Aplicativo apenas para fins legais e de acordo com estes Termos.',
      '4.2. Você não pode:',
    ],
    bullets: [
      'Utilizar o Aplicativo de qualquer maneira que possa danificar, desabilitar ou sobrecarregar o serviço;',
      'Tentar acessar dados de casas às quais você não pertence;',
      'Utilizar robôs, scrapers ou outros mecanismos automatizados não autorizados;',
      'Introduzir vírus, trojans ou qualquer código malicioso no Aplicativo;',
      'Coletar informações pessoais de outros moradores sem consentimento;',
      'Violar quaisquer leis ou regulamentos aplicáveis.',
    ],
  },
  {
    title: '5. Propriedade Intelectual',
    paragraphs: [
      '5.1. O conteúdo, marca, identidade visual, recursos e funcionalidades do Aplicativo são propriedade do Alpendre e estão protegidos por leis de direitos autorais, marcas registradas e propriedade intelectual.',
      '5.2. Você não tem permissão para copiar, modificar, distribuir, vender ou alugar qualquer parte do Aplicativo sem autorização expressa.',
    ],
  },
  {
    title: '6. Conteúdo dos Moradores',
    paragraphs: [
      '6.1. O Aplicativo permite registrar tarefas, eventos, lançamentos financeiros, comprovantes e observações ("Conteúdo do Usuário").',
      '6.2. Você mantém a titularidade sobre seu Conteúdo do Usuário e concede ao Alpendre licença restrita e gratuita exclusivamente para processar, armazenar e exibir tais informações aos moradores autorizados da sua casa.',
      '6.3. O Alpendre atua como ferramenta de organização e registro, não realizando intermediação bancária nem custódia de valores.',
    ],
  },
  {
    title: '7. Privacidade e Proteção de Dados',
    paragraphs: [
      '7.1. O uso do Aplicativo está sujeito à nossa Política de Privacidade, em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).',
    ],
  },
  {
    title: '8. Modificações e Limitação de Responsabilidade',
    paragraphs: [
      '8.1. O Aplicativo é fornecido "como está" e "conforme disponível", buscando alta disponibilidade e segurança.',
      '8.2. O Alpendre poderá atualizar estes Termos de Uso periodicamente, comunicando alterações relevantes pelo próprio Aplicativo ou por e-mail.',
    ],
  },
  {
    title: '9. Lei Aplicável e Jurisdição',
    paragraphs: [
      'Estes Termos serão regidos e interpretados de acordo com as leis da República Federativa do Brasil. Qualquer disputa decorrente ou relacionada a estes Termos será submetida à jurisdição dos tribunais brasileiros competentes.',
    ],
  },
  {
    title: 'Contato',
    paragraphs: [
      'Se você tiver alguma dúvida sobre estes Termos de Uso, entre em contato conosco pelo e-mail: contato@alpendre.app',
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
          subtitle="Última atualização: 27 de novembro de 2026"
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
