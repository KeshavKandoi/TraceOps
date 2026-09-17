import type { ReactElement } from "react";
import { IconCompass, IconTimeline, IconLayers, IconTool, IconSettings } from "../icons";

export type NavSection = "investigation" | "traces" | "evidence" | "tools" | "settings";

interface NavItem {
  id: NavSection;
  label: string;
  icon: (props: { className?: string }) => ReactElement;
}

const NAV_ITEMS: NavItem[] = [
  { id: "investigation", label: "Investigation", icon: IconCompass },
  { id: "traces", label: "Traces", icon: IconTimeline },
  { id: "evidence", label: "Evidence", icon: IconLayers },
  { id: "tools", label: "Tools", icon: IconTool },
  { id: "settings", label: "Settings", icon: IconSettings },
];

interface SidebarProps {
  active: NavSection;
  onSelect: (section: NavSection) => void;
}

export function Sidebar({ active, onSelect }: SidebarProps) {
  return (
    <aside className="sidebar" aria-label="Primary navigation">
      <div className="sidebar-brand">
        <div className="sidebar-brand-mark">TO</div>
        <div>
          <div className="sidebar-brand-text">TraceOps</div>
          <div className="sidebar-brand-sub">Agent Observability</div>
        </div>
      </div>
      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === active;
          return (
            <button
              key={item.id}
              type="button"
              className={`sidebar-nav-item${isActive ? " active" : ""}`}
              aria-current={isActive ? "page" : undefined}
              onClick={() => onSelect(item.id)}
            >
              <span className="sidebar-nav-icon">
                <Icon />
              </span>
              {item.label}
            </button>
          );
        })}
      </nav>
      <div className="sidebar-footer">
        <span className="badge badge-neutral">
          <span className="badge-dot" />
          Demo data
        </span>
      </div>
    </aside>
  );
}
