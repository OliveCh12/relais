/** A cancellable camera-side countdown; completion never survives a lifecycle interruption. */
export class PhotoTimer {
  private cancelCurrent: (() => void) | undefined;
  wait(seconds: number, tick: (remaining: number) => void): Promise<boolean> {
    this.cancel();
    if (!seconds) return Promise.resolve(true);
    return new Promise((resolve) => {
      const deadline = Date.now() + seconds * 1000;
      let timer: ReturnType<typeof setTimeout>;
      const finish = (capture: boolean) => {
        clearTimeout(timer);
        this.cancelCurrent = undefined;
        resolve(capture);
      };
      this.cancelCurrent = () => finish(false);
      const update = () => {
        const remaining = Math.ceil((deadline - Date.now()) / 1000);
        if (remaining <= 0) {
          finish(true);
          return;
        }
        tick(remaining);
        timer = setTimeout(update, Math.min(1000, deadline - Date.now()));
      };
      update();
    });
  }
  cancel(): boolean {
    if (!this.cancelCurrent) return false;
    this.cancelCurrent();
    return true;
  }
}
