import React from 'react';
import { TopWidgetRow } from './TopWidgetRow';

export const WidgetArea: React.FC = () => {
  return (
    <div className="w-full px-4 pt-1 select-none max-w-5xl mx-auto">
      <TopWidgetRow />
    </div>
  );
};

