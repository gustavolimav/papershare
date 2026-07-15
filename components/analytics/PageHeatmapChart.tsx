"use client";

import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatDuration } from "@/lib/formatters";
import type { PageBreakdown } from "@/types/index";

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
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
