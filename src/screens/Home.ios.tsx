import { SafeAreaView } from 'react-native-safe-area-context';
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
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <Host style={{ flex: 1 }} ignoreSafeArea="container">
        <VStack spacing={12}>
          <VStack
            alignment="leading"
            spacing={12}
            modifiers={[
              padding({ horizontal: 24, top: 28 }),
              frame({ maxWidth: Infinity, alignment: 'leading' }),
            ]}
          >
            <HStack spacing={10}>
              <NativeIcon name="wifi" size={24} color={theme.accent} />
              <Text modifiers={[font({ textStyle: 'title2', weight: 'semibold' })]}>Relais</Text>
            </HStack>
            <Text modifiers={[font({ textStyle: 'body' }), foregroundStyle(theme.muted)]}>
              How would you like to use this phone?
            </Text>
          </VStack>
          <Form>
            <Section>
              {roles.map((role) => (
                <Button
                  key={role.id}
                  onPress={() => chooseRole(role.id)}
                  modifiers={[buttonStyle('plain'), accessibilityIdentifier(`choose-${role.id}`)]}
                >
                  <HStack spacing={16} modifiers={[padding({ vertical: 12 })]}>
                    <NativeIcon name={role.id} size={28} color={theme.accent} />
                    <VStack
                      alignment="leading"
                      spacing={4}
                      modifiers={[
                        frame({ maxWidth: Infinity, alignment: 'leading' }),
                        multilineTextAlignment('leading'),
                      ]}
                    >
                      <Text
                        modifiers={[font({ textStyle: 'headline' }), foregroundStyle(theme.text)]}
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
            <Section footer={<Text>Find your saved devices in Monitor.</Text>}>
              <Button label="About this version" systemImage="info.circle" onPress={showAbout} />
            </Section>
          </Form>
        </VStack>
      </Host>
    </SafeAreaView>
  );
}
