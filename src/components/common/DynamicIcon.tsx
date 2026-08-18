import React, { memo } from 'react';
import * as Icons from 'lucide-react';

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
  // Try direct match or fallback
  const IconComponent = (Icons as unknown as Record<string, React.ElementType>)[name] || Icons.HelpCircle;

  return <IconComponent className={className} size={size} strokeWidth={strokeWidth} />;
});

DynamicIcon.displayName = 'DynamicIcon';

