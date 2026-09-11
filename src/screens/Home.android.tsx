import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import {
  Column,
  ListItem,
  Host,
  Icon,
  Text,
  Card,
  IconButton,
  Surface,
  Shape,
  Box,
  useMaterialColors,
} from '@expo/ui/jetpack-compose';
import {
  fillMaxSize,
  size,
  padding,
  clickable,
  testID,
  verticalScroll,
} from '@expo/ui/jetpack-compose/modifiers';
import gear from '@expo/material-symbols/settings.xml';
import chevron from '@expo/material-symbols/chevron_right.xml';
import { NativeIcon } from '@/components/icons/Icon.android';
import { useAppTheme } from '@/design/useAppTheme';
import { roles, useChooseRole } from './homeModel';

export default function HomeScreen() {
  const chooseRole = useChooseRole();
  const theme = useAppTheme();
  const colors = useMaterialColors();
  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: '',
          headerRight: () => (
            <Host style={{ width: 48, height: 48 }}>
              <IconButton onClick={() => router.push('/settings')}>
                <Icon source={gear} size={24} contentDescription="Settings" />
              </IconButton>
            </Host>
          ),
          headerStyle: { backgroundColor: theme.background },
        }}
      />
      <Host style={{ flex: 1 }}>
        <Column
          modifiers={[fillMaxSize(), verticalScroll(), padding(24, 28, 24, 24)]}
          verticalArrangement={{ spacedBy: 24 }}
        >
          <Text style={{ typography: 'titleMedium' }}>Use this phone as</Text>
          <Card>
            <Column>
              {roles.map((role) => (
                <ListItem
                  key={role.id}
                  colors={{ containerColor: 'transparent' }}
                  modifiers={[clickable(() => chooseRole(role.id)), testID(`choose-${role.id}`)]}
                >
                  <ListItem.LeadingContent>
                    <Surface
                      color={colors.primaryContainer}
                      shape={Shape.Circle({ radius: 1 })}
                      modifiers={[size(40, 40)]}
                    >
                      <Box contentAlignment="center" modifiers={[size(40, 40)]}>
                        <NativeIcon name={role.id} size={24} color={colors.primary} />
                      </Box>
                    </Surface>
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
          </Card>
        </Column>
      </Host>
    </SafeAreaView>
  );
}
