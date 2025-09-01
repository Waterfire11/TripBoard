import React from 'react';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  primaryAction: { label: string; onClick: () => void };
  secondaryAction?: { label: string; onClick: () => void };
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  primaryAction,
  secondaryAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 border rounded-lg">
      {icon}
      <h2 className="text-xl font-bold mt-4">{title}</h2>
      <p className="text-gray-500 mt-2">{description}</p>
      <div className="mt-4 flex space-x-4">
        <button onClick={primaryAction.onClick} className="bg-blue-500 text-white px-4 py-2 rounded">{primaryAction.label}</button>
        {secondaryAction && (
          <button onClick={secondaryAction.onClick} className="bg-gray-500 text-white px-4 py-2 rounded">{secondaryAction.label}</button>
        )}
      </div>
    </div>
  );
};

export default EmptyState;