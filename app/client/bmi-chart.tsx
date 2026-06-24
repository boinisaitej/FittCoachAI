"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";

// Lazy-load recharts (~100 kB) only when this chart actually renders.
const ChartInner = dynamic(() => import("./bmi-chart-inner").then((m) => m.ChartInner), {
  ssr: false,
  loading: () => <Skeleton className="h-[220px] w-full" />,
});

export function BmiChart({ data }: { data: { bmi: number; logged_at: string }[] }) {
  if (!data.length) {
    return (
      <p className="py-6 text-sm text-muted-foreground">
        No BMI logs yet. Go to{" "}
        <a href="/client/bmi" className="text-primary hover:underline">
          BMI
        </a>{" "}
        to add one.
      </p>
    );
  }
  const chartData = data.map((d) => ({
    date: formatDate(d.logged_at, { day: "2-digit", month: "short" }),
    bmi: d.bmi,
  }));
  return <ChartInner data={chartData} />;
}
