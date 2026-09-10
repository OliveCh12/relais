export interface LinkSample {
  rtt: number | null;
  loss: number | null;
  jitter: number | null;
}
export interface LinkQuality {
  bars: 0 | 1 | 2 | 3;
  label: string;
}
export function linkQuality(sample: LinkSample | null): LinkQuality {
  const values = sample
    ? [sample.rtt, sample.loss, sample.jitter].filter(
        (value): value is number => value !== null && Number.isFinite(value) && value >= 0,
      )
    : [];
  if (!values.length) return { bars: 0, label: 'Measuring connection' };
  const { rtt, loss, jitter } = sample!;
  if ((rtt ?? 0) > 300 || (loss ?? 0) > 0.05 || (jitter ?? 0) > 0.05)
    return { bars: 1, label: 'Weak connection' };
  if ((rtt ?? 0) > 120 || (loss ?? 0) > 0.015 || (jitter ?? 0) > 0.025)
    return { bars: 2, label: 'Fair connection' };
  return { bars: 3, label: 'Good connection' };
}
