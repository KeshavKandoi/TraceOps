import type { ToolMeta } from "../types";

interface ToolRegistryProps {
  tools: ToolMeta[];
}

export function ToolRegistry({ tools }: ToolRegistryProps) {
  return (
    <div className="card-grid">
      {tools.map((tool) => (
        <article key={tool.name} className="tool-card">
          <div className="tool-card-head">
            <span className="tool-card-name mono">{tool.name}</span>
            <span className="badge badge-neutral">{tool.fields.length} param{tool.fields.length === 1 ? "" : "s"}</span>
          </div>
          <p className="tool-card-desc">{tool.description}</p>
          <div className="tool-field-list">
            {tool.fields.map((field) => (
              <div key={field.name} className="tool-field-row">
                <div className="tool-field-name-col">
                  <span className="tool-field-name mono">{field.name}</span>
                  {field.description && <span className="tool-field-desc">{field.description}</span>}
                </div>
                <div className="tool-field-meta-col">
                  <span className="tool-field-type mono">{field.type}</span>
                  <span className={`badge ${field.required ? "badge-warning" : "badge-neutral"}`}>
                    {field.required ? "required" : "optional"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}
