import type { ToolMeta } from "../types";

interface ToolRegistryProps {
  tools: ToolMeta[];
}

export function ToolRegistry({ tools }: ToolRegistryProps) {
  return (
    <div className="card-grid">
      {tools.map((tool) => (
        <div key={tool.name} className="tool-card">
          <div className="tool-card-name">{tool.name}</div>
          <div className="tool-card-desc">{tool.description}</div>
          <div>
            {tool.fields.map((field) => (
              <div key={field.name} className="tool-field-row">
                <span className="tool-field-name">
                  {field.name}
                  {field.required ? "" : "?"}
                </span>
                <span className="tool-field-type">{field.type}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
