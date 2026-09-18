const MAX_STRING_LENGTH = 160;
const MAX_ARRAY_ITEMS = 8;

function formatPrimitive(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "string") {
    return value.length > MAX_STRING_LENGTH ? `${value.slice(0, MAX_STRING_LENGTH)}…` : value;
  }
  return String(value);
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

interface DetailTreeProps {
  data: unknown;
  depth?: number;
}

export function DetailTree({ data, depth = 0 }: DetailTreeProps) {
  if (Array.isArray(data)) {
    const items = data.slice(0, MAX_ARRAY_ITEMS);
    const overflow = data.length - items.length;
    return (
      <div className="detail-list">
        {items.map((item, index) => (
          <div className="detail-row" key={index}>
            <span className="detail-key">[{index}]</span>
            <span className="detail-value">
              {isPlainRecord(item) || Array.isArray(item) ? (
                <DetailTree data={item} depth={depth + 1} />
              ) : (
                formatPrimitive(item)
              )}
            </span>
          </div>
        ))}
        {overflow > 0 && <div className="detail-truncated">+{overflow} more</div>}
      </div>
    );
  }

  if (isPlainRecord(data)) {
    const entries = Object.entries(data);
    if (entries.length === 0) {
      return <span className="detail-empty">no fields</span>;
    }
    return (
      <div className="detail-list">
        {entries.map(([key, value]) => (
          <div className="detail-row" key={key}>
            <span className="detail-key">{key}</span>
            <span className="detail-value">
              {isPlainRecord(value) || Array.isArray(value) ? (
                <DetailTree data={value} depth={depth + 1} />
              ) : (
                formatPrimitive(value)
              )}
            </span>
          </div>
        ))}
      </div>
    );
  }

  return <span className="detail-value">{formatPrimitive(data)}</span>;
}
