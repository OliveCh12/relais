import type { ReactNode } from 'react';
import { Column, Shape, Surface, useMaterialColors } from '@expo/ui/jetpack-compose';
import { fillMaxWidth, selectableGroup } from '@expo/ui/jetpack-compose/modifiers';

// Material 3 extra-large shape; rows remain native ListItems with native touch feedback.
const shape = Shape.RoundedCorner({
  cornerRadii: { topStart: 28, topEnd: 28, bottomStart: 28, bottomEnd: 28 },
});

export function SettingsGroup({
  children,
  selection = false,
}: {
  children: ReactNode;
  selection?: boolean;
}) {
  const colors = useMaterialColors();
  return (
    <Surface shape={shape} color={colors.background} modifiers={[fillMaxWidth()]}>
      <Column
        verticalArrangement={{ spacedBy: 2 }}
        modifiers={selection ? [selectableGroup()] : []}
      >
        {children}
      </Column>
    </Surface>
  );
}
