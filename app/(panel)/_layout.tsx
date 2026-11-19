import React, { useContext } from 'react';
import { StyleSheet, Text } from 'react-native';
import { Tabs } from 'expo-router';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { Calendar, CheckSquare, Home, Settings, Wallet } from 'lucide-react-native';
import { AuthProtection } from '../../src/utils/authProtection';
import { fontFamilies, useTheme } from '../../src/design-system';

const DEFAULT_INSETS = { top: 0, right: 0, bottom: 0, left: 0 };

export default function PanelLayout() {
  const { theme } = useTheme();
  const insets = useContext(SafeAreaInsetsContext) ?? DEFAULT_INSETS;
  const bottomInset = Math.max(insets.bottom, theme.spacing.xxs);

  return (
    <AuthProtection>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: theme.colors.accent,
          tabBarInactiveTintColor: theme.colors.inkMuted,
          tabBarAllowFontScaling: true,
          tabBarStyle: {
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.line,
            borderTopWidth: 1,
            height: 64 + bottomInset,
            paddingTop: theme.spacing.xxs,
            paddingBottom: bottomInset,
          },
          tabBarLabelStyle: styles.tabBarLabel,
          tabBarLabel: ({ color, position, children }) => (
            <Text
              allowFontScaling={true}
              maxFontSizeMultiplier={1.3}
              numberOfLines={1}
              style={[
                styles.tabBarLabel,
                position === 'beside-icon' ? styles.tabBarLabelBeside : undefined,
                { color },
              ]}
            >
              {children}
            </Text>
          ),
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: 'Home',
            tabBarAccessibilityLabel: 'Home',
            tabBarIcon: ({ color, size }) => (
              <Home color={color} size={size} strokeWidth={1.75} />
            ),
          }}
        />
        <Tabs.Screen
          name="tasks"
          options={{
            title: 'Tarefas',
            tabBarAccessibilityLabel: 'Tarefas',
            tabBarIcon: ({ color, size }) => (
              <CheckSquare color={color} size={size} strokeWidth={1.75} />
            ),
          }}
        />
        <Tabs.Screen
          name="events"
          options={{
            title: 'Agenda',
            tabBarAccessibilityLabel: 'Agenda',
            tabBarIcon: ({ color, size }) => (
              <Calendar color={color} size={size} strokeWidth={1.75} />
            ),
          }}
        />
        <Tabs.Screen
          name="finances"
          options={{
            title: 'Finanças',
            tabBarAccessibilityLabel: 'Finanças',
            tabBarIcon: ({ color, size }) => (
              <Wallet color={color} size={size} strokeWidth={1.75} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Configurações',
            tabBarAccessibilityLabel: 'Configurações',
            tabBarIcon: ({ color, size }) => (
              <Settings color={color} size={size} strokeWidth={1.75} />
            ),
          }}
        />
        <Tabs.Screen
          name="quick-actions"
          options={{
            href: null,
          }}
        />
      </Tabs>
    </AuthProtection>
  );
}

const styles = StyleSheet.create({
  tabBarLabel: {
    fontFamily: fontFamilies.sansMedium,
    fontSize: 12,
    textAlign: 'center',
  },
  tabBarLabelBeside: {
    marginLeft: 4,
  },
});
