import type { ReactElement } from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { View } from 'react-native';
import type { CaptureModesProps } from './CaptureModes.types';
export function SwipeModes({ children, ...props }: CaptureModesProps & { children: ReactElement }) {
  const swipe = Gesture.Pan()
    .enabled(!props.disabled)
    .activeOffsetX([-24, 24])
    .failOffsetY([-16, 16])
    .runOnJS(true)
    .onEnd(({ translationX }) => {
      const index = props.modes.indexOf(props.mode) + (translationX < 0 ? 1 : -1);
      const next = props.modes[index];
      if (next) props.onMode(next);
    });
  return (
    <GestureDetector gesture={swipe}>
      <View collapsable={false} style={{ width: '100%' }}>
        {children}
      </View>
    </GestureDetector>
  );
}
