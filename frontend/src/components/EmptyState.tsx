import type { ReactElement } from "react";

interface EmptyStateAction {
  label: string;
  onClick: () => void;
  variant?: "primary" | "default";
}

interface EmptyStateProps {
  icon: (props: { className?: string }) => ReactElement;
  title: string;
  description: string;
  steps?: string[];
  actions?: EmptyStateAction[];
}

export function EmptyState({ icon: Icon, title, description, steps, actions }: EmptyStateProps) {
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
      {actions && actions.length > 0 && (
        <div className="empty-state-actions">
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              className={`btn${action.variant === "primary" ? " btn-primary" : ""}`}
              onClick={action.onClick}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
