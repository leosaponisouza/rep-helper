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
    Linking.openURL('mailto:suporte@rephelper.com.br?subject=Suporte%20RepHelper').catch(
      () => {
        toast({
          title: 'Não foi possível abrir o e-mail',
          message: 'Envie sua dúvida para suporte@rephelper.com.br.',
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
          sobre o RepHelper.
        </AppText>
      </Surface>

      <HelpSection title="Primeiros Passos" initiallyExpanded={true}>
        <HelpItem
          title="O que é o RepHelper?"
          description="O RepHelper é um aplicativo desenvolvido para facilitar a gestão de repúblicas e moradias compartilhadas. Com ele, é possível organizar tarefas, eventos, finanças e muito mais."
        />
        <HelpItem
          title="Como começar?"
          description="Ao fazer login pela primeira vez, você pode criar uma nova república ou se juntar a uma existente usando um código de convite. Em seguida, configure seu perfil e comece a usar os recursos disponíveis."
          isLast
        />
      </HelpSection>

      <HelpSection title="Gestão de Tarefas">
        <HelpTopic
          title="Como criar uma tarefa"
          steps={[
            "Acesse a seção 'Tarefas' no menu principal",
            "Toque no botão '+' no canto inferior direito",
            'Preencha as informações da tarefa (título, descrição, data, etc.)',
            'Você pode atribuir a tarefa a outros membros da república',
            "Toque em 'Criar Tarefa' para finalizar",
          ]}
        />
        <HelpTopic
          title="Tarefas recorrentes"
          steps={[
            "Ao criar uma tarefa, ative a opção 'Repetir'",
            'Selecione a frequência (diária, semanal, mensal, etc.)',
            'Defina o intervalo de repetição',
            'As tarefas serão automaticamente criadas com base na recorrência configurada',
          ]}
          isLast
        />
      </HelpSection>

      <HelpSection title="Eventos">
        <HelpTopic
          title="Como criar um evento"
          steps={[
            "Acesse a seção 'Eventos' no menu principal",
            "Toque no botão '+' ou 'Criar Evento'",
            'Preencha o título, descrição, data e hora',
            'Você pode convidar membros específicos da república',
            "Toque em 'Criar Evento' para finalizar",
          ]}
        />
        <HelpItem
          title="Confirmação de presença"
          description="Os membros convidados podem confirmar, recusar ou deixar pendente a participação no evento. Isso ajuda o organizador a planejar melhor."
          isLast
        />
      </HelpSection>

      <HelpSection title="Gestão Financeira">
        <HelpTopic
          title="Registrar despesas"
          steps={[
            "Acesse a seção 'Finanças' no menu principal",
            "Toque em 'Nova Despesa'",
            'Preencha o valor, descrição e categoria',
            'Você pode dividir a despesa entre os membros',
            'Confirme a criação da despesa',
          ]}
        />
        <HelpTopic
          title="Registrar receitas"
          steps={[
            "Acesse a seção 'Finanças'",
            "Toque em 'Nova Receita'",
            'Preencha o valor, descrição e categoria',
            'Confirme a criação da receita',
          ]}
        />
        <HelpItem
          title="Balanço financeiro"
          description="Na tela inicial de Finanças, você pode visualizar um resumo do saldo atual, receitas e despesas do mês, além de pendências de pagamento."
          isLast
        />
      </HelpSection>

      <HelpSection title="Gerenciamento de Membros">
        <HelpTopic
          title="Convidar novos membros"
          steps={[
            "Acesse 'Configurações > Membros'",
            "Toque em 'Convidar Membro'",
            'Você pode enviar um link de convite ou código diretamente',
            'O novo membro precisará criar uma conta caso ainda não tenha',
          ]}
        />
        <HelpItem
          title="Funções dos membros"
          description="Existem três níveis de acesso: Proprietário (controle total), Administrador (gerencia tarefas, eventos e membros) e Membro (funções básicas). Apenas o Proprietário pode transferir a propriedade."
          isLast
        />
      </HelpSection>

      <HelpSection title="Perfil e Configurações">
        <HelpTopic
          title="Alterar informações do perfil"
          steps={[
            "Acesse 'Configurações > Conta'",
            'Edite seu nome, apelido ou telefone',
            'Você também pode alterar sua foto de perfil',
            "Toque em 'Salvar Alterações' para confirmar",
          ]}
        />
        <HelpTopic
          title="Alterar senha"
          steps={[
            "Acesse 'Configurações > Conta > Alterar Senha'",
            'Digite sua senha atual',
            'Digite e confirme sua nova senha',
            "Toque em 'Atualizar Senha' para confirmar",
          ]}
          isLast
        />
      </HelpSection>

      <HelpSection title="Dicas e Truques">
        <HelpItem
          title="Atualizar dados"
          description="Puxe a tela para baixo na maioria das seções para atualizar os dados e obter as informações mais recentes."
        />
        <HelpItem
          title="Notificações"
          description="Mantenha as notificações ativadas para receber alertas sobre novas tarefas, eventos e ações pendentes."
        />
        <HelpItem
          title="Atalhos rápidos"
          description="Use o botão '+' na tela inicial para acessar rapidamente as ações mais comuns, como criar tarefas ou registrar despesas."
          isLast
        />
      </HelpSection>

      <HelpSection title="Perguntas Frequentes (FAQ)">
        <HelpItem
          title="Posso usar o app sem criar uma república?"
          description="Não. O RepHelper foi projetado especificamente para gerenciar repúblicas ou moradias compartilhadas. Você precisa criar ou se juntar a uma república para utilizar as funcionalidades."
        />
        <HelpItem
          title="Como transferir a propriedade da república?"
          description="Acesse 'Configurações > República > Transferir Propriedade'. Selecione um membro para se tornar o novo proprietário e confirme a transferência. Essa ação não pode ser desfeita."
        />
        <HelpItem
          title="O que acontece quando saio de uma república?"
          description="Ao sair, você perde acesso a todas as informações da república. Se você tiver pendências financeiras, elas continuarão visíveis para os administradores. Seus dados pessoais permanecem em sua conta."
        />
        <HelpItem
          title="É possível criar mais de uma república?"
          description="Atualmente, cada usuário pode pertencer a apenas uma república por vez. Para gerenciar outra república, você precisará sair da atual primeiro."
        />
        <HelpItem
          title="Como funcionam as notificações de tarefas?"
          description="Você receberá notificações quando: 1) For atribuído a uma nova tarefa; 2) Uma tarefa atribuída a você estiver próxima do prazo; 3) Alguém comentar em uma tarefa que você está envolvido."
        />
        <HelpItem
          title="É possível dividir uma despesa de forma desigual?"
          description="Sim. Ao criar uma despesa, você pode selecionar a opção 'Divisão personalizada' e atribuir valores ou porcentagens diferentes para cada membro da república."
        />
        <HelpItem
          title="Perdi meu celular. Como proteger minha conta?"
          description="Acesse sua conta em outro dispositivo e altere sua senha imediatamente. Você pode verificar seus dispositivos conectados em 'Configurações > Conta > Segurança > Dispositivos conectados'."
        />
        <HelpItem
          title="Posso ver o histórico de quem completou uma tarefa recorrente?"
          description="Sim. Nas tarefas recorrentes, toque na opção 'Ver histórico' para visualizar quem completou cada ocorrência da tarefa, quando foi concluída e observações."
        />
        <HelpItem
          title="Como funciona o sistema de controle financeiro?"
          description="O app registra receitas (entrada de dinheiro) e despesas (saídas). Você pode atribuir categorias, definir quem pagou, como foi a divisão e manter um saldo atualizado da república e individual de cada membro."
        />
        <HelpItem
          title="Posso exportar os dados financeiros?"
          description="Sim. Em 'Finanças > Menu (três pontos) > Exportar', você pode gerar relatórios em PDF ou Excel com os dados financeiros do período selecionado, útil para prestação de contas."
        />
        <HelpItem
          title="O que são as 'Ações Pendentes' na tela inicial?"
          description="São notificações de itens que requerem sua atenção: despesas para confirmar pagamento, tarefas com prazo próximo, eventos aguardando confirmação, entre outros."
        />
        <HelpItem
          title="Como adicionar um novo residente que não tem smartphone?"
          description="Você pode criar um 'Membro Virtual' em 'Configurações > Membros > Adicionar Membro Virtual'. Este perfil será gerenciado pelos administradores da república."
          isLast
        />
      </HelpSection>

      <HelpSection title="Solução de Problemas">
        <HelpTopic
          title="O aplicativo está lento ou travando"
          steps={[
            'Feche o aplicativo completamente e abra novamente',
            'Verifique se há atualizações pendentes na loja de aplicativos',
            'Reinicie seu dispositivo',
            'Verifique a conexão com a internet',
            'Se persistir, limpe o cache do aplicativo em Configurações > Aplicativos > RepHelper > Armazenamento > Limpar cache',
          ]}
        />
        <HelpTopic
          title="Não estou recebendo notificações"
          steps={[
            'Verifique se as notificações estão ativadas no aplicativo em Configurações > Notificações',
            'Verifique as configurações de notificação do seu dispositivo',
            'Certifique-se que o aplicativo não está em modo de economia de bateria',
            'Desinstale e reinstale o aplicativo (isto não afetará seus dados)',
          ]}
        />
        <HelpTopic
          title="Não consigo fazer login"
          steps={[
            'Verifique sua conexão com a internet',
            'Confirme se está usando o email e senha corretos',
            "Use a opção 'Esqueci minha senha' para redefinir sua senha",
            'Se estiver usando login social (Google, Apple), tente fazer login diretamente pelo provedor',
            'Se o problema persistir, entre em contato com o suporte',
          ]}
        />
        <HelpTopic
          title="Não consigo carregar ou visualizar imagens"
          steps={[
            'Verifique sua conexão com a internet',
            'Tente atualizar a tela puxando para baixo',
            'Verifique se o armazenamento do seu dispositivo não está cheio',
            'Limpe o cache do aplicativo',
            'Reinicie o aplicativo',
          ]}
        />
        <HelpTopic
          title="Dados desatualizados ou inconsistentes"
          steps={[
            'Puxe a tela para baixo para atualizar os dados',
            'Vá para a tela inicial e volte para a tela atual',
            'Verifique se todos os membros da república estão usando a versão mais recente do app',
            'Desconecte e conecte novamente (logout e login)',
            'Se o problema persistir, contate o suporte informando detalhes do problema',
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
          RepHelper v1.0.0
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
