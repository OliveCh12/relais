export interface ExposureControlProps {
  value: number;
  min: number;
  max: number;
  disabled: boolean;
  onChange: (value: number) => void;
  onClose: () => void;
}
