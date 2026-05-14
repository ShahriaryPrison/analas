export interface InsightTypeDef {
  id: string;
  label: string;
  description: string;
  icon: string;
  configFields: {
    key: string;
    label: string;
    placeholder: string;
    options?: { label: string; value: string }[];
  }[];
}

export const INSIGHT_TYPES: InsightTypeDef[] = [
  {
    id: "count",
    label: "Count",
    description: "Total number of times an event occurred — all time, single number.",
    icon: "#",
    configFields: [
      { key: "eventName", label: "Event name", placeholder: "user_signup" },
    ],
  },
  {
    id: "trend",
    label: "Trend",
    description: "Event count over time.",
    icon: "↗",
    configFields: [
      { key: "eventName", label: "Event name", placeholder: "user_signup" },
      {
        key: "timeFrame",
        label: "Time frame",
        placeholder: "Select range",
        options: [
          { label: "Last 7 days", value: "7" },
          { label: "Last 30 days", value: "30" },
          { label: "Last 90 days", value: "90" },
        ],
      },
      {
        key: "displayType",
        label: "Display as",
        placeholder: "Select style",
        options: [
          { label: "Bar Chart", value: "bar" },
          { label: "Line Chart", value: "line" },
        ],
      },
    ],
  },
  {
    id: "breakdown",
    label: "Breakdown",
    description: "Top values for a specific property (e.g. top pages, top browsers).",
    icon: "≡",
    configFields: [
      { key: "eventName", label: "Event name", placeholder: "page_view" },
      { key: "property", label: "Property name", placeholder: "url" },
    ],
  },
  {
    id: "multi_trend",
    label: "Comparison",
    description: "Compare multiple event trends side-by-side.",
    icon: "⚔",
    configFields: [
      { key: "eventNames", label: "Events to compare", placeholder: "page_view, signup" },
      {
        key: "timeFrame",
        label: "Time frame",
        placeholder: "Select range",
        options: [
          { label: "Last 7 days", value: "7" },
          { label: "Last 30 days", value: "30" },
          { label: "Last 90 days", value: "90" },
        ],
      },
      {
        key: "displayType",
        label: "Display as",
        placeholder: "Select style",
        options: [
          { label: "Bar Chart", value: "bar" },
          { label: "Line Chart", value: "line" },
        ],
      },
    ],
  },
  {
    id: "funnel",
    label: "Funnel",
    description: "Conversion progression through multiple steps.",
    icon: "⬇",
    configFields: [
      { key: "eventSteps", label: "Funnel steps (in order)", placeholder: "page_view, signup, purchase" },
      { key: "distinctId", label: "User ID property", placeholder: "distinct_id" },
    ],
  },
  {
    id: "metric",
    label: "Metric",
    description: "Advanced aggregations (average, unique count, percentiles).",
    icon: "∑",
    configFields: [
      { key: "eventName", label: "Event name", placeholder: "page_loaded" },
      {
        key: "aggregation",
        label: "Aggregation type",
        placeholder: "Select aggregation",
        options: [
          { label: "Unique Count", value: "uniq" },
          { label: "Average", value: "avg" },
          { label: "Median (P50)", value: "p50" },
          { label: "95th Percentile (P95)", value: "p95" }
        ]
      },
      { key: "property", label: "Target property", placeholder: "user_id, latency_ms" },
      {
        key: "timeFrame",
        label: "Time frame",
        placeholder: "Select range",
        options: [
          { label: "Last 7 days", value: "7" },
          { label: "Last 30 days", value: "30" },
          { label: "Last 90 days", value: "90" },
        ],
      },
      {
        key: "displayType",
        label: "Display as",
        placeholder: "Select style",
        options: [
          { label: "Bar Chart", value: "bar" },
          { label: "Line Chart", value: "line" },
        ],
      },
    ],
  },
];

export function getInsightType(id: string): InsightTypeDef {
  return INSIGHT_TYPES.find((t) => t.id === id) ?? INSIGHT_TYPES[0];
}
