export interface InsightTypeDef {
  id: string;
  label: string;
  description: string;
  icon: string;
  configFields: { key: string; label: string; placeholder: string }[];
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
    description: "Event count over the last 7 days shown as a bar chart.",
    icon: "↗",
    configFields: [
      { key: "eventName", label: "Event name", placeholder: "user_signup" },
    ],
  },
];

export function getInsightType(id: string): InsightTypeDef {
  return INSIGHT_TYPES.find((t) => t.id === id) ?? INSIGHT_TYPES[0];
}
