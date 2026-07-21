"use client";

import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatDuration } from "@/lib/formatters";
import type { PageBreakdown } from "@/types/index";

// Lowest opacity a bar can have — keeps the least-attended page visibly a
// tinted version of --primary rather than fading to nothing, while the
// most-attended page(s) render at full strength (opacity 1). Same hue
// throughout, just a lighter tint for lower attention, per US-45.
const MIN_BAR_OPACITY = 0.25;

interface PageHeatmapChartProps {
  data: PageBreakdown[];
}

function PageHeatmapTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: PageBreakdown }[];
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const point = payload[0]!.payload;

  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-sm shadow-sm">
      <p className="font-medium">Página {point.page_number}</p>
      <p className="text-muted-foreground">
        {formatDuration(point.avg_time_seconds)} em média · {point.view_count}{" "}
        visualiz
        {point.view_count === 1 ? "ação" : "ações"}
      </p>
    </div>
  );
}

export function PageHeatmapChart({ data }: PageHeatmapChartProps) {
  const maxTime = Math.max(...data.map((point) => point.avg_time_seconds), 0);

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <XAxis
            dataKey="page_number"
            tick={{ fontSize: 12 }}
            tickFormatter={(value: number) => `${value}`}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 12 }}
            tickFormatter={(value: number) => formatDuration(value)}
          />
          <Tooltip content={<PageHeatmapTooltip />} />
          <Bar
            dataKey="avg_time_seconds"
            fill="var(--color-primary)"
            radius={[4, 4, 0, 0]}
          >
            {data.map((point) => {
              const ratio = maxTime > 0 ? point.avg_time_seconds / maxTime : 1;
              const opacity = MIN_BAR_OPACITY + (1 - MIN_BAR_OPACITY) * ratio;

              return <Cell key={point.page_number} fillOpacity={opacity} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
