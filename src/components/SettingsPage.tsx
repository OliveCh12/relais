import { Text, View } from 'react-native';
import type { SettingsPageProps } from './SettingsPage.types';
export function SettingsPage({ sections }: SettingsPageProps) {
  return (
    <View>
      {sections.map((section) => (
        <Text key={section.title}>{section.title}</Text>
      ))}
    </View>
  );
}
