import { Text, View } from 'react-native';
export default function ConnectionPage({ page }: { page: string }) {
  return (
    <View>
      <Text>Open {page} in the iOS or Android app.</Text>
    </View>
  );
}
