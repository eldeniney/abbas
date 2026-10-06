import { Tabs } from 'expo-router/tabs';

import { Icon, type IconName } from '@/components/ui/Icon';
import { useI18n, type TranslationKey } from '@/i18n';
import { colors } from '@/theme/tokens';

const TABS: readonly { name: string; title: TranslationKey; icon: IconName; iconActive: IconName }[] = [
  { name: 'index', title: 'tabs.home', icon: 'home-outline', iconActive: 'home' },
  { name: 'deliveries', title: 'tabs.deliveries', icon: 'cube-outline', iconActive: 'cube' },
  { name: 'earnings', title: 'tabs.earnings', icon: 'wallet-outline', iconActive: 'wallet' },
  { name: 'account', title: 'tabs.account', icon: 'person-circle-outline', iconActive: 'person-circle' },
];

export default function TabsLayout() {
  const { t } = useI18n();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, minHeight: 64 },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: t(tab.title),
            tabBarIcon: ({ color, focused, size }) => (
              <Icon name={focused ? tab.iconActive : tab.icon} color={color} size={size} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
