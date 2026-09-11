import { View } from 'react-native';
import { Stack, router } from 'expo-router';
import { Button, Form, Host, HStack, Image, Section, Text, VStack } from '@expo/ui/swift-ui';
import {
  accessibilityHidden,
  accessibilityIdentifier,
  buttonStyle,
  contentShape,
  shapes,
  fixedSize,
  font,
  foregroundStyle,
  frame,
  multilineTextAlignment,
  padding,
} from '@expo/ui/swift-ui/modifiers';
import { SettingsIcon } from '@/components/icons/SettingsIcon.ios';
import { useAppTheme } from '@/design/useAppTheme';
import { roles, useChooseRole } from './homeModel';

export default function HomeScreen() {
  const chooseRole = useChooseRole();
  const theme = useAppTheme();
  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: '',
          headerLargeTitle: false,
          headerStyle: { backgroundColor: theme.background },
        }}
      />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon="gearshape"
          accessibilityLabel="Settings"
          onPress={() => router.push('/settings')}
        />
      </Stack.Toolbar>
      <Host style={{ flex: 1 }}>
        <Form>
          <Section title="Use this phone as">
            {roles.map((role) => (
              <Button
                key={role.id}
                onPress={() => chooseRole(role.id)}
                modifiers={[buttonStyle('plain'), accessibilityIdentifier(`choose-${role.id}`)]}
              >
                <HStack
                  spacing={16}
                  modifiers={[
                    padding({ vertical: 4 }),
                    frame({ minHeight: 56 }),
                    contentShape(shapes.rectangle()),
                  ]}
                >
                  <SettingsIcon name={role.id} />
                  <VStack
                    alignment="leading"
                    spacing={4}
                    modifiers={[
                      frame({ maxWidth: Infinity, alignment: 'leading' }),
                      multilineTextAlignment('leading'),
                    ]}
                  >
                    <Text
                      modifiers={[
                        font({ textStyle: 'body', weight: 'semibold' }),
                        foregroundStyle(theme.text),
                      ]}
                    >
                      {role.title}
                    </Text>
                    <Text
                      modifiers={[
                        font({ textStyle: 'subheadline' }),
                        foregroundStyle(theme.muted),
                        fixedSize({ horizontal: false, vertical: true }),
                      ]}
                    >
                      {role.description}
                    </Text>
                  </VStack>
                  <Image
                    systemName="chevron.right"
                    size={12}
                    modifiers={[foregroundStyle(theme.muted), accessibilityHidden(true)]}
                  />
                </HStack>
              </Button>
            ))}
          </Section>
        </Form>
      </Host>
    </View>
  );
}
