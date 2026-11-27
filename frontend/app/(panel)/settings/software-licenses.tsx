import React from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ExternalLink } from 'lucide-react-native';
import {
  AppText,
  Button,
  Divider,
  Screen,
  ScreenHeader,
  Surface,
  useFeedback,
  useTheme,
} from '../../../src/design-system';

interface LibraryLicense {
  name: string;
  version: string;
  license: string;
  website: string;
  description: string;
}

const LIBRARIES: ReadonlyArray<LibraryLicense> = [
  {
    name: 'React Native',
    version: '0.72.6',
    license: 'MIT',
    website: 'https://reactnative.dev/',
    description:
      'Framework para desenvolvimento de aplicações móveis multiplataforma.',
  },
  {
    name: 'Expo',
    version: '~49.0.8',
    license: 'MIT',
    website: 'https://expo.dev/',
    description:
      'Plataforma para criar aplicativos React Native universais para Android, iOS e web.',
  },
  {
    name: 'React Navigation',
    version: '6.0.0',
    license: 'MIT',
    website: 'https://reactnavigation.org/',
    description: 'Biblioteca de navegação para React Native.',
  },
  {
    name: 'React Native Reanimated',
    version: '~3.3.0',
    license: 'MIT',
    website: 'https://docs.swmansion.com/react-native-reanimated/',
    description: 'Biblioteca de animações para React Native.',
  },
  {
    name: 'Tamagui',
    version: '1.74.8',
    license: 'MIT',
    website: 'https://tamagui.dev/',
    description: 'UI Kit para React Native e Web.',
  },
  {
    name: 'Zustand',
    version: '4.4.1',
    license: 'MIT',
    website: 'https://github.com/pmndrs/zustand',
    description: 'Biblioteca de gerenciamento de estado mínima e simples.',
  },
  {
    name: 'Axios',
    version: '1.5.0',
    license: 'MIT',
    website: 'https://axios-http.com/',
    description: 'Cliente HTTP baseado em promessas para navegador e Node.js.',
  },
  {
    name: 'React Native Async Storage',
    version: '~1.18.2',
    license: 'MIT',
    website: 'https://github.com/react-native-async-storage/async-storage',
    description: 'Sistema de armazenamento local assíncrono para React Native.',
  },
  {
    name: 'React Native Safe Area Context',
    version: '4.6.3',
    license: 'MIT',
    website: 'https://github.com/th3rdwave/react-native-safe-area-context',
    description:
      'Fornece informações sobre áreas seguras para diferentes dispositivos.',
  },
  {
    name: 'React Native Gesture Handler',
    version: '~2.12.0',
    license: 'MIT',
    website: 'https://docs.swmansion.com/react-native-gesture-handler/',
    description: 'API declarativa para gestos em React Native.',
  },
  {
    name: 'React Native Vector Icons',
    version: '10.0.0',
    license: 'MIT',
    website: 'https://github.com/oblador/react-native-vector-icons',
    description: 'Conjunto de ícones personalizáveis para React Native.',
  },
  {
    name: 'Moment.js',
    version: '2.29.4',
    license: 'MIT',
    website: 'https://momentjs.com/',
    description: 'Biblioteca para manipulação de datas em JavaScript.',
  },
];

const SoftwareLicensesScreen = () => {
  const router = useRouter();
  const { theme } = useTheme();
  const { toast } = useFeedback();

  const openWebsite = (url: string) => {
    Linking.openURL(url).catch(() => {
      toast({
        title: 'Não foi possível abrir o link',
        message: 'Tente novamente em um navegador compatível.',
        tone: 'warning',
      });
    });
  };

  return (
    <Screen
      scroll
      header={
        <ScreenHeader
          title="Licenças de Software"
          subtitle="Bibliotecas e componentes de código aberto"
          onBack={() => router.back()}
        />
      }
      contentContainerStyle={{ gap: theme.spacing.lg }}
    >
      <Surface tone="subtle" bordered padded="md">
        <AppText variant="body" color="inkSecondary">
          O Alpendre utiliza diversas bibliotecas e ferramentas de código aberto para
          fornecer suas funcionalidades. Esta página lista os componentes de software de
          terceiros utilizados no desenvolvimento deste aplicativo, juntamente com suas
          respectivas licenças.
        </AppText>
      </Surface>

      {/* Bibliotecas e Componentes */}
      <View style={{ gap: theme.spacing.xs }}>
        <AppText variant="monoLabel" color="inkSecondary">
          Bibliotecas e componentes
        </AppText>
        <Surface tone="surface" bordered style={styles.listSurface}>
          {LIBRARIES.map((lib, index) => (
            <View key={lib.name}>
              <View style={{ padding: theme.spacing.md, gap: theme.spacing.xs }}>
                <View style={styles.libraryHeader}>
                  <AppText variant="bodyStrong" color="ink" style={styles.flexText}>
                    {lib.name}
                  </AppText>
                  <AppText variant="monoLabel" color="inkMuted">
                    v{lib.version}
                  </AppText>
                </View>

                <AppText variant="caption" color="inkSecondary">
                  {lib.description}
                </AppText>

                <View style={styles.libraryFooter}>
                  <AppText variant="monoLabel" color="inkMuted">
                    Licença: {lib.license}
                  </AppText>
                  <Button
                    label="Visitar site"
                    variant="ghost"
                    size="sm"
                    leftIcon={
                      <ExternalLink
                        size={14}
                        strokeWidth={1.75}
                        color={theme.colors.accent}
                      />
                    }
                    onPress={() => openWebsite(lib.website)}
                  />
                </View>
              </View>
              {index < LIBRARIES.length - 1 ? <Divider /> : null}
            </View>
          ))}
        </Surface>
      </View>

      {/* Sobre Licenças MIT */}
      <View style={{ gap: theme.spacing.xs }}>
        <AppText variant="monoLabel" color="inkSecondary">
          Sobre licenças MIT
        </AppText>
        <Surface tone="surface" bordered padded="md" style={{ gap: theme.spacing.sm }}>
          <AppText variant="body" color="inkSecondary">
            A maioria das bibliotecas utilizadas neste aplicativo está sob a Licença MIT,
            uma licença permissiva que permite o uso, cópia, modificação, fusão,
            publicação, distribuição, sublicenciamento e/ou venda de cópias do software,
            desde que o aviso de copyright e este aviso de permissão sejam incluídos em
            todas as cópias ou partes substanciais do software.
          </AppText>
          <AppText variant="bodyStrong" color="ink">
            Texto completo da Licença MIT:
          </AppText>
          <Surface tone="subtle" padded="sm" radiusKey="sm" style={{ gap: theme.spacing.xs }}>
            <AppText variant="caption" color="inkSecondary">
              Permission is hereby granted, free of charge, to any person obtaining a
              copy of this software and associated documentation files (the
              &quot;Software&quot;), to deal in the Software without restriction, including
              without limitation the rights to use, copy, modify, merge, publish,
              distribute, sublicense, and/or sell copies of the Software, and to permit
              persons to whom the Software is furnished to do so, subject to the
              following conditions:
            </AppText>
            <AppText variant="caption" color="inkSecondary">
              The above copyright notice and this permission notice shall be included in
              all copies or substantial portions of the Software.
            </AppText>
            <AppText variant="caption" color="inkSecondary">
              THE SOFTWARE IS PROVIDED &quot;AS IS&quot;, WITHOUT WARRANTY OF ANY KIND,
              EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
              MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO
              EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
              DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
              OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
              USE OR OTHER DEALINGS IN THE SOFTWARE.
            </AppText>
          </Surface>
        </Surface>
      </View>

      {/* Licenças Adicionais & Agradecimentos */}
      <Surface tone="surface" bordered padded="md" style={{ gap: theme.spacing.md }}>
        <View style={{ gap: theme.spacing.xs }}>
          <AppText variant="heading" color="ink">
            Licenças Adicionais
          </AppText>
          <AppText variant="body" color="inkSecondary">
            Para obter informações detalhadas sobre outras licenças utilizadas neste
            aplicativo, entre em contato com nossa equipe de desenvolvimento através do
            e-mail dev@alpendre.app.
          </AppText>
        </View>

        <Divider />

        <View style={{ gap: theme.spacing.xs }}>
          <AppText variant="heading" color="ink">
            Agradecimentos
          </AppText>
          <AppText variant="body" color="inkSecondary">
            Agradecemos a todos os desenvolvedores e mantenedores das bibliotecas de
            código aberto que tornaram possível a criação deste aplicativo. Seu trabalho e
            dedicação à comunidade de desenvolvimento são inestimáveis.
          </AppText>
        </View>
      </Surface>
    </Screen>
  );
};

const styles = StyleSheet.create({
  listSurface: {
    overflow: 'hidden',
  },
  libraryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  libraryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  flexText: {
    flex: 1,
  },
});

export default SoftwareLicensesScreen;
