import * as React from "react";
import { Tooltip as RechartsTooltip } from "recharts";

/* ------------------------------------------------------------------ */
/*  Chart config type                                                   */
/* ------------------------------------------------------------------ */

export type ChartConfig = Record<
  string,
  { label: string; color?: string }
>;

/* ------------------------------------------------------------------ */
/*  ChartContainer                                                      */
/* ------------------------------------------------------------------ */

interface ChartContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  config: ChartConfig;
}

export function ChartContainer({
  config,
  children,
  className,
  ...props
}: ChartContainerProps) {
  const cssVars = React.useMemo(() => {
    const vars: Record<string, string> = {};
    for (const [key, val] of Object.entries(config)) {
      if (val.color) vars[`--color-${key}`] = val.color;
    }
    return vars;
  }, [config]);

  return (
    <div
      className={className}
      style={cssVars as React.CSSProperties}
      {...props}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ChartTooltip + ChartTooltipContent                                  */
/* ------------------------------------------------------------------ */

export const ChartTooltip = RechartsTooltip;

interface ChartTooltipContentProps {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string; dataKey?: string }>;
  label?: string;
  hideLabel?: boolean;
  nameKey?: string;
  labelFormatter?: (label: string) => string;
  className?: string;
}

export function ChartTooltipContent({
  active,
  payload,
  label,
  hideLabel,
  nameKey,
  labelFormatter,
  className,
}: ChartTooltipContentProps) {
  if (!active || !payload?.length) return null;

  const displayLabel = labelFormatter ? labelFormatter(String(label)) : label;

  return (
    <div
      className={`rounded-lg border border-border bg-background px-3 py-2 text-xs shadow-md ${className ?? ""}`}
    >
      {!hideLabel && displayLabel && (
        <p className="font-medium text-foreground mb-1">{displayLabel}</p>
      )}
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full shrink-0"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">
            {nameKey && entry.name ? entry.name : (entry.dataKey ?? "")}
          </span>
          <span className="font-medium text-foreground ml-auto tabular-nums">
            {entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}
