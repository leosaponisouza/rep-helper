import React, { useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronDown, ChevronUp, Mail } from 'lucide-react-native';
import {
  AppText,
  Button,
  Divider,
  Screen,
  ScreenHeader,
  Surface,
  useFeedback,
  useMotion,
  useTheme,
} from '../../../src/design-system';

interface HelpSectionProps {
  title: string;
  children: React.ReactNode;
  initiallyExpanded?: boolean;
}

const HelpSection: React.FC<HelpSectionProps> = ({
  title,
  children,
  initiallyExpanded = false,
}) => {
  const { theme } = useTheme();
  const { reduceMotion } = useMotion();
  const [expanded, setExpanded] = useState(initiallyExpanded);

  return (
    <Surface tone="surface" bordered style={styles.sectionSurface}>
      <Pressable
        onPress={() => setExpanded((prev) => !prev)}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ expanded }}
        style={({ pressed }) => [
          styles.sectionHeaderButton,
          {
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.sm,
            backgroundColor: pressed
              ? reduceMotion
                ? theme.colors.accentSoft
                : theme.colors.subtle
              : 'transparent',
            opacity: pressed ? theme.motion.pressOpacity : 1,
          },
        ]}
      >
        <AppText variant="heading" color="ink" style={styles.flexText}>
          {title}
        </AppText>
        {expanded ? (
          <ChevronUp size={20} strokeWidth={1.75} color={theme.colors.accent} />
        ) : (
          <ChevronDown size={20} strokeWidth={1.75} color={theme.colors.inkMuted} />
        )}
      </Pressable>

      {expanded ? (
        <>
          <Divider />
          <View style={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
            {children}
          </View>
        </>
      ) : null}
    </Surface>
  );
};

const HelpItem: React.FC<{ title: string; description: string; isLast?: boolean }> = ({
  title,
  description,
  isLast = false,
}) => {
  const { theme } = useTheme();
  return (
    <View style={{ gap: theme.spacing.md }}>
      <View style={{ gap: theme.spacing.xxs }}>
        <AppText variant="bodyStrong" color="accent">
          {title}
        </AppText>
        <AppText variant="body" color="inkSecondary">
          {description}
        </AppText>
      </View>
      {!isLast ? <Divider /> : null}
    </View>
  );
};

const HelpTopic: React.FC<{
  title: string;
  steps: ReadonlyArray<string>;
  isLast?: boolean;
}> = ({ title, steps, isLast = false }) => {
  const { theme } = useTheme();
  return (
    <View style={{ gap: theme.spacing.md }}>
      <View style={{ gap: theme.spacing.xs }}>
        <AppText variant="bodyStrong" color="accent">
          {title}
        </AppText>
        <View style={{ gap: theme.spacing.xs }}>
          {steps.map((step, index) => (
            <View key={step} style={[styles.stepRow, { gap: theme.spacing.xs }]}>
              <View
                style={[
                  styles.stepBadge,
                  {
                    backgroundColor: theme.colors.accentSoft,
                    borderRadius: theme.radius.full,
                  },
                ]}
              >
                <AppText variant="monoLabel" color="accent">
                  {index + 1}
                </AppText>
              </View>
              <AppText variant="body" color="inkSecondary" style={styles.flexText}>
                {step}
              </AppText>
            </View>
          ))}
        </View>
      </View>
      {!isLast ? <Divider /> : null}
    </View>
  );
};

const HelpScreen = () => {
  const router = useRouter();
  const { theme } = useTheme();
  const { toast } = useFeedback();

  const openEmailSupport = () => {
    Linking.openURL('mailto:contato@alpendre.app?subject=Suporte%20Alpendre').catch(
      () => {
        toast({
          title: 'Não foi possível abrir o e-mail',
          message: 'Envie sua dúvida para contato@alpendre.app.',
          tone: 'warning',
        });
      }
    );
  };

  return (
    <Screen
      scroll
      header={
        <ScreenHeader
          title="Central de Ajuda"
          subtitle="Dicas, tutoriais e respostas rápidas"
          onBack={() => router.back()}
        />
      }
      contentContainerStyle={{ gap: theme.spacing.md }}
    >
      <Surface tone="subtle" bordered padded="md">
        <AppText variant="body" color="inkSecondary">
          Aqui você encontra dicas, tutoriais e respostas para as dúvidas mais comuns
          sobre o Alpendre.
        </AppText>
      </Surface>

      <HelpSection title="Primeiros Passos" initiallyExpanded={true}>
        <HelpItem
          title="O que é o Alpendre?"
          description="O Alpendre é o organizador da casa para quem divide o mesmo teto — casais, famílias, amigos dividindo apartamento ou moradias coletivas. Ele centraliza tarefas, agenda e gastos da casa com regras ajustáveis."
        />
        <HelpItem
          title="Como começar?"
          description="Ao entrar pela primeira vez, você pode criar uma nova casa escolhendo o perfil que melhor combina com sua rotina (Casal / Família, Amigos / Apê ou Moradia coletiva) ou entrar em uma casa existente com um código de convite."
          isLast
        />
      </HelpSection>

      <HelpSection title="Regras da Casa e Modos Financeiros">
        <HelpItem
          title="Modo Acompanhar Gastos vs. Modo Caixinha"
          description="Quando a caixinha está desativada, o Alpendre funciona no modo Acompanhar Gastos do Mês: cada despesa entra registrada para consulta por categoria e histórico mensal. Quando a caixinha está ativada, você acompanha saldo coletivo, entradas e reembolsos."
        />
        <HelpItem
          title="Aprovação de despesas e administração compartilhada"
          description="Em 'Configurações > Minha Casa', administradores podem ativar ou desativar a exigência de aprovação de despesas, a caixinha compartilhada e a opção em que todos os moradores atuam como administradores."
          isLast
        />
      </HelpSection>

      <HelpSection title="Gestão de Tarefas">
        <HelpTopic
          title="Como criar uma tarefa"
          steps={[
            "Acesse a seção 'Tarefas' no menu principal",
            "Toque em 'Nova' ou no atalho '+' da tela inicial",
            'Preencha título, descrição, categoria e prazo',
            'Atribua a tarefa a um ou mais moradores da casa',
            "Toque em 'Criar Tarefa' para finalizar",
          ]}
        />
        <HelpTopic
          title="Tarefas recorrentes"
          steps={[
            "Ao criar uma tarefa, ative a opção 'Repetir'",
            'Selecione a frequência (diária, semanal ou mensal)',
            'Defina o intervalo de repetição',
            'Ao concluir uma ocorrência, a próxima será gerada automaticamente',
          ]}
          isLast
        />
      </HelpSection>

      <HelpSection title="Agenda da Casa">
        <HelpTopic
          title="Como criar um evento ou aviso na agenda"
          steps={[
            "Acesse a seção 'Agenda' no menu principal",
            "Toque em 'Novo' para registrar o compromisso",
            'Preencha título, descrição, início, término e local',
            "Escolha se deseja pedir confirmação de presença dos moradores ou registrar apenas um 'Aviso na agenda'",
            "Toque em 'Criar Evento' para finalizar",
          ]}
        />
        <HelpItem
          title="Confirmação de presença opcional"
          description="Eventos sociais podem solicitar confirmação (Confirmado, Pendente ou Recusado), enquanto lembretes como manutenção, dedetização ou visitas rápidas podem ficar como aviso informativo sem lista de presença."
          isLast
        />
      </HelpSection>

      <HelpSection title="Moradores e Convites">
        <HelpTopic
          title="Convidar novos moradores"
          steps={[
            "Acesse 'Configurações > Minha Casa'",
            'Copie ou compartilhe o código de convite da casa',
            "O novo morador informa o código em 'Entrar com código' após criar sua conta",
          ]}
        />
        <HelpItem
          title="Papéis dos moradores"
          description="O criador da casa é o Proprietário; Administradores gerenciam regras da casa, convites e finanças; e Moradores participam das tarefas, gastos e agenda. Se 'Todos são administradores' estiver ativo, todos os moradores têm permissões administrativas (exceto remover o proprietário)."
          isLast
        />
      </HelpSection>

      <HelpSection title="Perfil e Configurações">
        <HelpTopic
          title="Alterar informações do perfil"
          steps={[
            "Acesse 'Configurações > Conta'",
            'Edite seu nome, apelido, chave PIX ou telefone',
            'Você também pode atualizar sua foto de perfil',
            "Toque em 'Salvar Alterações' para confirmar",
          ]}
          isLast
        />
      </HelpSection>

      <HelpSection title="Perguntas Frequentes (FAQ)">
        <HelpItem
          title="Preciso preencher o endereço completo da casa?"
          description="Não. O endereço postal é opcional no cadastro da casa — basta dar um nome para sua casa e escolher as regras iniciais."
        />
        <HelpItem
          title="Posso mudar as regras da casa depois de criá-la?"
          description="Sim. A qualquer momento, acesse 'Configurações > Minha Casa' para alternar entre perfis ou personalizar caixinha, aprovação de despesas e administração compartilhada."
        />
        <HelpItem
          title="O que acontece quando saio de uma casa?"
          description="Ao sair, você deixa de visualizar as tarefas, agenda e finanças daquela casa, mantendo sua conta pessoal ativa para criar ou entrar em outra casa."
          isLast
        />
      </HelpSection>

      <HelpSection title="Solução de Problemas">
        <HelpTopic
          title="O aplicativo está lento ou desatualizado"
          steps={[
            'Puxe a tela para baixo para atualizar os dados mais recentes',
            'Feche o aplicativo completamente e abra novamente',
            'Verifique sua conexão com a internet',
            'Se persistir, limpe o cache em Configurações > Aplicativos > Alpendre > Armazenamento',
          ]}
          isLast
        />
      </HelpSection>

      <Surface tone="surface" bordered padded="md" style={styles.supportCard}>
        <AppText variant="heading" color="ink" style={styles.centeredText}>
          Precisa de mais ajuda?
        </AppText>
        <Button
          label="Contatar Suporte"
          variant="primary"
          fullWidth
          leftIcon={
            <Mail size={18} strokeWidth={1.75} color={theme.colors.onAccent} />
          }
          onPress={openEmailSupport}
        />
        <AppText variant="caption" color="inkMuted" style={styles.centeredText}>
          Alpendre v1.0.0
        </AppText>
      </Surface>
    </Screen>
  );
};

const styles = StyleSheet.create({
  sectionSurface: {
    overflow: 'hidden',
  },
  sectionHeaderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
    gap: 8,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepBadge: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  flexText: {
    flex: 1,
  },
  supportCard: {
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  centeredText: {
    textAlign: 'center',
  },
});

export default HelpScreen;
