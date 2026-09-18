import type { ReactElement } from "react";
import { IconCompass, IconTimeline, IconLayers, IconTool, IconSettings } from "../icons";

export type NavSection = "investigation" | "traces" | "evidence" | "tools" | "settings";

interface NavItem {
  id: NavSection;
  label: string;
  hint: string;
  icon: (props: { className?: string }) => ReactElement;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Workspace",
    items: [
      { id: "investigation", label: "Investigation", hint: "Overview & timeline", icon: IconCompass },
      { id: "traces", label: "Traces", hint: "Ordered event log", icon: IconTimeline },
      { id: "evidence", label: "Evidence", hint: "Collected tool output", icon: IconLayers },
    ],
  },
  {
    label: "Configuration",
    items: [
      { id: "tools", label: "Tools", hint: "Registered tool schema", icon: IconTool },
      { id: "settings", label: "Settings", hint: "Display preferences", icon: IconSettings },
    ],
  },
];

interface SidebarProps {
  active: NavSection;
  onSelect: (section: NavSection) => void;
}

export function Sidebar({ active, onSelect }: SidebarProps) {
  return (
    <aside className="sidebar" aria-label="Primary navigation">
      <div className="sidebar-brand">
        <div className="sidebar-brand-mark" aria-hidden="true">
          TO
        </div>
        <div>
          <div className="sidebar-brand-text">TraceOps</div>
          <div className="sidebar-brand-sub">Observable Agent</div>
        </div>
      </div>

      {NAV_GROUPS.map((group) => (
        <div className="sidebar-group" key={group.label}>
          <div className="sidebar-group-label">{group.label}</div>
          <nav className="sidebar-nav" aria-label={group.label}>
            {group.items.map((item) => {
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
                  <span className="sidebar-nav-icon" aria-hidden="true">
                    <Icon />
                  </span>
                  <span className="sidebar-nav-text">
                    <span className="sidebar-nav-label">{item.label}</span>
                    <span className="sidebar-nav-hint">{item.hint}</span>
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      ))}

      <div className="sidebar-footer">
        <div className="sidebar-footer-row">
          <span className="badge badge-accent">
            <span className="badge-dot" />
            v1.0.0
          </span>
          <span className="badge badge-neutral">
            <span className="badge-dot" />
            Demo data
          </span>
        </div>
        <div className="sidebar-footer-note">Caygnus Problem 4 · Observable Agent Loop</div>
      </div>
    </aside>
  );
}
