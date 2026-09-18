import type { ReactElement } from "react";

interface EmptyStateProps {
  icon: (props: { className?: string }) => ReactElement;
  title: string;
  description: string;
  steps?: string[];
}

export function EmptyState({ icon: Icon, title, description, steps }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon" aria-hidden="true">
        <Icon />
      </div>
      <div className="empty-state-title">{title}</div>
      <div className="empty-state-desc">{description}</div>
      {steps && steps.length > 0 && (
        <ol className="empty-state-steps">
          {steps.map((step, index) => (
            <li key={index}>{step}</li>
          ))}
        </ol>
      )}
    </div>
  );
}
