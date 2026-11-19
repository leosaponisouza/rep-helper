import { Tabs } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet } from 'react-native';
import { AuthProtection } from '../../src/utils/authProtection';

export default function PanelLayout() {
  return (
    <AuthProtection>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#7B68EE',
          tabBarInactiveTintColor: 'gray',
          tabBarStyle: styles.tabBar,
          tabBarLabelStyle: styles.tabBarLabel,
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            tabBarLabel: 'Home',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home-outline" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="tasks"
          options={{
            tabBarLabel: 'Tarefas',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="checkbox-marked-outline" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="events"
          options={{
            tabBarLabel: 'Agenda',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="calendar-outline" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="finances"
          options={{
            tabBarLabel: 'Finanças',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="cash" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            tabBarLabel: 'Configurações',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="settings-outline" color={color} size={size} />
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
  tabBar: {
    backgroundColor: '#333',
    borderTopColor: '#555',
    borderTopWidth: 1,
    height: 60,
    paddingBottom: 8,
    paddingTop: 8,
  },
  tabBarLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
});
