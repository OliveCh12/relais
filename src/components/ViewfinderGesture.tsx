import { useEffect, useLayoutEffect, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { Icon } from './icons/Icon';
import { ViewfinderWriter, videoPoint, type Point, type Size } from '@/capture/viewfinder';
import type { CameraControls } from '@/capture/settings';

interface Props {
  children: ReactNode;
  enabled: boolean;
  controls?: CameraControls;
  onFocus: (point: Point, size: Size) => Promise<unknown>;
  onExposure: (value: number) => Promise<unknown>;
  onError: (error: unknown) => void;
  nativeZoom?: boolean;
  videoSize?: Size;
  fill?: boolean;
}

class ViewfinderInteraction {
  private size: Size = { width: 0, height: 0 };
  writer: ViewfinderWriter;
  constructor(private props: Props) {
    this.writer = new ViewfinderWriter((error) => this.props.onError(error));
  }
  update(props: Props) {
    this.props = props;
  }
  resize(size: Size) {
    this.size = size;
  }
  activate() {
    this.writer = new ViewfinderWriter((error) => this.props.onError(error));
  }
  focus(point: Point) {
    if (!this.props.enabled) return;
    this.writer.focus(() => this.props.onFocus(point, this.size));
  }
  expose(value: number) {
    if (!this.props.enabled) return;
    this.writer.write(() => this.props.onExposure(value));
  }
}

// Only control values cross to JS. Gesture feedback stays on the UI thread.
export function ViewfinderGesture(props: Props) {
  const [interaction] = useState(() => new ViewfinderInteraction(props));
  useLayoutEffect(() => {
    interaction.update(props);
  }, [interaction, props]);
  const width = useSharedValue(0);
  const height = useSharedValue(0);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const visible = useSharedValue(0);
  const initial = useSharedValue(0);
  const exposure = useSharedValue(0);
  const lastSent = useSharedValue(0);
  const valid = useSharedValue(false);
  const videoSize = props.videoSize;
  const fill = props.fill ?? false;
  const min = props.controls?.minExposure ?? 0;
  const max = props.controls?.maxExposure ?? 0;
  const currentExposure = props.controls?.exposure ?? 0;
  useEffect(() => {
    interaction.activate();
    return () => interaction.writer.dispose();
  }, [interaction, props.enabled]);
  const focus = (point: Point) => interaction.focus(point);
  const setExposure = (value: number) => interaction.expose(value);
  const tap = Gesture.Tap()
    .enabled(props.enabled)
    .onEnd((event, success) => {
      if (
        !success ||
        (videoSize &&
          !videoPoint(
            { x: event.x, y: event.y },
            { width: width.value, height: height.value },
            videoSize,
            fill,
          ))
      )
        return;
      x.value = event.x;
      y.value = event.y;
      exposure.value = currentExposure;
      visible.value = 1;
      scheduleOnRN(focus, { x: event.x, y: event.y });
      visible.value = withDelay(4000, withTiming(0));
    });
  const hold = Gesture.Pan()
    .enabled(props.enabled)
    .maxPointers(1)
    .activateAfterLongPress(180)
    .onStart((event) => {
      valid.value =
        !videoSize ||
        !!videoPoint(
          { x: event.x, y: event.y },
          { width: width.value, height: height.value },
          videoSize,
          fill,
        );
      if (!valid.value) return;
      x.value = event.x;
      y.value = event.y;
      initial.value = currentExposure;
      exposure.value = initial.value;
      visible.value = 1;
      scheduleOnRN(focus, { x: event.x, y: event.y });
    })
    .onUpdate((event) => {
      if (!valid.value) return;
      exposure.value = Math.min(max, Math.max(min, initial.value - event.translationY / 80));
      if (max > min && Math.abs(exposure.value - lastSent.value) >= 0.1) {
        lastSent.value = exposure.value;
        scheduleOnRN(setExposure, exposure.value);
      }
    })
    .onEnd(() => {
      if (valid.value && max > min) scheduleOnRN(setExposure, exposure.value);
    })
    .onFinalize(() => {
      visible.value = withDelay(4000, withTiming(0));
    });
  const gesture = Gesture.Exclusive(hold, tap);
  const square = useAnimatedStyle(() => ({
    opacity: visible.value,
    left: x.value - 32,
    top: y.value - 32,
  }));
  const rail = useAnimatedStyle(() => ({
    opacity: max > min ? visible.value : 0,
    left: x.value + 56 < width.value - 16 ? x.value + 48 : x.value - 48,
    top: Math.min(height.value - 68, Math.max(68, y.value)) - 52,
  }));
  const thumb = useAnimatedStyle(() => ({
    top: max > min ? 104 * (1 - (exposure.value - min) / (max - min)) - 10 : 42,
  }));
  return (
    <GestureDetector
      gesture={props.nativeZoom ? Gesture.Simultaneous(Gesture.Native(), gesture) : gesture}
    >
      <View
        collapsable={false}
        style={StyleSheet.absoluteFill}
        onLayout={({ nativeEvent }) => {
          interaction.resize(nativeEvent.layout);
          width.value = nativeEvent.layout.width;
          height.value = nativeEvent.layout.height;
        }}
      >
        {props.children}
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <Animated.View style={[styles.square, square]} />
          <Animated.View style={[styles.rail, rail]}>
            <Animated.View style={[styles.thumb, thumb]}>
              <Icon name="sun" size={20} color="#FFD60A" />
            </Animated.View>
          </Animated.View>
        </View>
      </View>
    </GestureDetector>
  );
}
const styles = StyleSheet.create({
  square: { position: 'absolute', width: 64, height: 64, borderWidth: 1.5, borderColor: '#FFD60A' },
  rail: { position: 'absolute', width: 1, height: 104, backgroundColor: '#FFD60A' },
  thumb: { position: 'absolute', left: -10, width: 20, height: 20 },
});
