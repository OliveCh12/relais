import { View } from 'react-native';
import { Stack } from 'expo-router';
import { Button, Form, Host, HStack, Image, Section, Text, VStack } from '@expo/ui/swift-ui';
import {
  accessibilityHidden,
  accessibilityIdentifier,
  buttonStyle,
  fixedSize,
  font,
  foregroundStyle,
  frame,
  multilineTextAlignment,
  padding,
} from '@expo/ui/swift-ui/modifiers';
import { NativeIcon } from '@/components/icons/Icon.ios';
import { useAppTheme } from '@/design/useAppTheme';
import { roles, showAbout, useChooseRole } from './homeModel';

export default function HomeScreen() {
  const chooseRole = useChooseRole();
  const theme = useAppTheme();
  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Relais',
          headerLargeTitle: true,
          headerStyle: { backgroundColor: theme.background },
        }}
      />
      <Host style={{ flex: 1 }}>
        <Form>
          <Section title="Use this phone as">
            {roles.map((role) => (
              <Button
                key={role.id}
                onPress={() => chooseRole(role.id)}
                modifiers={[buttonStyle('plain'), accessibilityIdentifier(`choose-${role.id}`)]}
              >
                <HStack spacing={16} modifiers={[padding({ vertical: 4 })]}>
                  <NativeIcon name={role.id} size={24} color={theme.accent} />
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
          <Section footer={<Text>Photos and videos stay on the camera phone.</Text>}>
            <Button label="About Relais" systemImage="info.circle" onPress={showAbout} />
          </Section>
        </Form>
      </Host>
    </View>
  );
}
