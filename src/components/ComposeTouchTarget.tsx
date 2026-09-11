import type { ViewProps } from 'react-native';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

export function ComposeTouchTarget(props: ViewProps) {
  return (
    <GestureDetector
      gesture={Gesture.Native().shouldActivateOnStart(true).disallowInterruption(true)}
    >
      {/* Dispatch touches through a ViewGroup so Compose receives them before the viewfinder. */}
      <View {...props} collapsable={false} />
    </GestureDetector>
  );
}
