import React, { memo } from 'react';
import { getRegisteredIcon } from '@nodus/common';

interface DynamicIconProps {
  name: string;
  className?: string;
  size?: number;
  strokeWidth?: number;
}

export const DynamicIcon: React.FC<DynamicIconProps> = memo(({
  name,
  className = '',
  size = 24,
  strokeWidth = 2,
}) => {
  const IconComponent = getRegisteredIcon(name);

  return <IconComponent className={className} size={size} strokeWidth={strokeWidth} />;
});

DynamicIcon.displayName = 'DynamicIcon';

