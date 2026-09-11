export type Point = { x: number; y: number };
export type Size = { width: number; height: number };

// Coordinates are relative to the displayed, unmirrored video, excluding letterboxing.
export function videoPoint(point: Point, view: Size, video: Size, fill = false): Point | null {
  'worklet';
  if (
    [view.width, view.height, video.width, video.height].some((n) => !Number.isFinite(n) || n <= 0)
  )
    return null;
  const scale = (fill ? Math.max : Math.min)(view.width / video.width, view.height / video.height);
  const width = video.width * scale;
  const height = video.height * scale;
  const x = (point.x - (view.width - width) / 2) / width;
  const y = (point.y - (view.height - height) / 2) / height;
  return Number.isFinite(x) && Number.isFinite(y) && x >= 0 && x <= 1 && y >= 0 && y <= 1
    ? { x, y }
    : null;
}

export function unrotatePoint({ x, y }: Point, rotation: number): Point {
  switch (rotation) {
    case 90:
      return { x: y, y: 1 - x };
    case 180:
      return { x: 1 - x, y: 1 - y };
    case 270:
      return { x: 1 - y, y: x };
    default:
      return { x, y };
  }
}

// Keep one native/network operation in flight and only the most recent drag value.
export class ViewfinderWriter {
  private next: (() => Promise<unknown>) | undefined;
  private nextFocus: (() => Promise<unknown>) | undefined;
  private running = false;
  private disposed = false;
  constructor(private fail: (error: unknown) => void) {}
  focus(action: () => Promise<unknown>) {
    if (this.disposed) return;
    this.next = undefined;
    this.nextFocus = action;
    void this.drain();
  }
  write(action: () => Promise<unknown>) {
    if (this.disposed) return;
    this.next = action;
    void this.drain();
  }
  dispose() {
    this.disposed = true;
    this.next = undefined;
    this.nextFocus = undefined;
  }
  private async drain() {
    if (this.running) return;
    this.running = true;
    try {
      while ((this.nextFocus || this.next) && !this.disposed) {
        const action = (this.nextFocus ?? this.next)!;
        if (this.nextFocus) this.nextFocus = undefined;
        else this.next = undefined;
        await action();
      }
    } catch (error) {
      this.next = undefined;
      this.nextFocus = undefined;
      if (!this.disposed) this.fail(error);
    } finally {
      this.running = false;
    }
  }
}
