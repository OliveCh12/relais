import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import {
  Column,
  ListItem,
  Host,
  Icon,
  Text,
  TextButton,
  useMaterialColors,
} from '@expo/ui/jetpack-compose';
import {
  fillMaxSize,
  padding,
  clickable,
  testID,
  verticalScroll,
} from '@expo/ui/jetpack-compose/modifiers';
import chevron from '@expo/material-symbols/chevron_right.xml';
import { NativeIcon } from '@/components/icons/Icon.android';
import { useAppTheme } from '@/design/useAppTheme';
import { roles, showAbout, useChooseRole } from './homeModel';

export default function HomeScreen() {
  const chooseRole = useChooseRole();
  const theme = useAppTheme();
  const colors = useMaterialColors();
  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Relais',
          headerStyle: { backgroundColor: theme.background },
        }}
      />
      <Host style={{ flex: 1 }}>
        <Column
          modifiers={[fillMaxSize(), verticalScroll(), padding(24, 28, 24, 24)]}
          verticalArrangement={{ spacedBy: 24 }}
        >
          <Text style={{ typography: 'titleMedium' }}>Use this phone as</Text>
          <Column verticalArrangement={{ spacedBy: 12 }}>
            {roles.map((role) => (
              <ListItem
                key={role.id}
                modifiers={[clickable(() => chooseRole(role.id)), testID(`choose-${role.id}`)]}
              >
                <ListItem.LeadingContent>
                  <NativeIcon name={role.id} size={24} color={colors.primary} />
                </ListItem.LeadingContent>
                <ListItem.HeadlineContent>
                  <Text>{role.title}</Text>
                </ListItem.HeadlineContent>
                <ListItem.SupportingContent>
                  <Text>{role.description}</Text>
                </ListItem.SupportingContent>
                <ListItem.TrailingContent>
                  <Icon source={chevron} size={20} tint={colors.onSurfaceVariant} />
                </ListItem.TrailingContent>
              </ListItem>
            ))}
          </Column>
          <Text color={colors.onSurfaceVariant} style={{ typography: 'bodySmall' }}>
            Photos and videos stay on the camera phone.
          </Text>
          <TextButton onClick={showAbout}>
            <NativeIcon name="info" size={16} color={colors.onSurfaceVariant} />
            <Text color={colors.onSurfaceVariant} style={{ typography: 'bodySmall' }}>
              {' '}
              About Relais
            </Text>
          </TextButton>
        </Column>
      </Host>
    </SafeAreaView>
  );
}
