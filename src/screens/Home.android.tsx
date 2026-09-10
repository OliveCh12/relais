import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Column,
  ListItem,
  Host,
  Icon,
  Row,
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
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <Host style={{ flex: 1 }}>
        <Column
          modifiers={[fillMaxSize(), verticalScroll(), padding(24, 28, 24, 24)]}
          verticalArrangement={{ spacedBy: 36 }}
        >
          <Row horizontalArrangement={{ spacedBy: 10 }} verticalAlignment="center">
            <NativeIcon name="wifi" size={24} color={colors.primary} />
            <Text style={{ typography: 'headlineSmall' }}>Relais</Text>
          </Row>
          <Column verticalArrangement={{ spacedBy: 8 }}>
            <Text style={{ typography: 'titleLarge' }}>How would you like to use this phone?</Text>
            <Text color={colors.onSurfaceVariant} style={{ typography: 'bodyMedium' }}>
              Choose how to use this phone.
            </Text>
          </Column>
          <Column verticalArrangement={{ spacedBy: 12 }}>
            {roles.map((role) => (
              <ListItem
                key={role.id}
                modifiers={[clickable(() => chooseRole(role.id)), testID(`choose-${role.id}`)]}
              >
                <ListItem.LeadingContent>
                  <NativeIcon name={role.id} size={28} color={colors.primary} />
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
            Find your saved devices in Monitor.
          </Text>
          <TextButton onClick={showAbout}>
            <NativeIcon name="info" size={16} color={colors.onSurfaceVariant} />
            <Text color={colors.onSurfaceVariant} style={{ typography: 'bodySmall' }}>
              {' '}
              About this version
            </Text>
          </TextButton>
        </Column>
      </Host>
    </SafeAreaView>
  );
}
