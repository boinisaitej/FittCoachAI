"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { AlertTriangle, HeartPulse, ShieldAlert, Sparkles, Leaf } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Props = {
  vegetarian: boolean;
  allergies: string[];
  injuries: { id: string; tag: string }[];
  openHealthIssues: number;
};

/**
 * Compact card showing the safety data shared with the trainer + AI:
 *  - veg flag · allergies · active injuries · unresolved health issues
 *  - call-to-action buttons jump to /client/health and /account
 */
export function HealthSummary({ vegetarian, allergies, injuries, openHealthIssues }: Props) {
  const hasAny = vegetarian || allergies.length > 0 || injuries.length > 0 || openHealthIssues > 0;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <HeartPulse className="h-4 w-4 text-primary" />
            Your health profile
          </CardTitle>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Sparkles className="h-3 w-3 text-primary" />
            Used by AI + trainer
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              icon={<Leaf className="h-3.5 w-3.5 text-emerald-600" />}
              label="Diet"
              value={vegetarian ? "Vegetarian" : "Non-veg"}
            />
            <Stat
              icon={<ShieldAlert className="h-3.5 w-3.5 text-amber-600" />}
              label="Allergies"
              value={allergies.length > 0 ? `${allergies.length} flagged` : "None"}
              tone={allergies.length > 0 ? "warn" : undefined}
            />
            <Stat
              icon={<AlertTriangle className="h-3.5 w-3.5 text-rose-600" />}
              label="Injuries"
              value={injuries.length > 0 ? `${injuries.length} active` : "None"}
              tone={injuries.length > 0 ? "bad" : undefined}
            />
            <Stat
              icon={<HeartPulse className="h-3.5 w-3.5 text-rose-600" />}
              label="Open health issues"
              value={openHealthIssues > 0 ? `${openHealthIssues}` : "0"}
              tone={openHealthIssues > 0 ? "bad" : undefined}
            />
          </div>

          {(allergies.length > 0 || injuries.length > 0) && (
            <div className="space-y-1.5">
              {allergies.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Allergens:
                  </span>
                  {allergies.map((a) => (
                    <Badge key={a} variant="warning" className="text-[10px]">
                      ⚠ {a}
                    </Badge>
                  ))}
                </div>
              )}
              {injuries.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Injuries:
                  </span>
                  {injuries.map((i) => (
                    <Badge key={i.id} variant="destructive" className="text-[10px]">
                      {i.tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {!hasAny && (
            <p className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
              No allergies, injuries, or open health issues. Add them so the AI and your trainer can build safer
              plans for you.
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href="/client/health">
                <AlertTriangle className="h-3.5 w-3.5" />
                Report an injury / issue
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/account">
                <ShieldAlert className="h-3.5 w-3.5" />
                Edit allergies & preferences
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function Stat({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: "warn" | "bad";
}) {
  const valueCls =
    tone === "bad"
      ? "text-rose-600 dark:text-rose-400"
      : tone === "warn"
        ? "text-amber-600 dark:text-amber-400"
        : "text-foreground";
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {icon} {label}
      </div>
      <div className={`mt-1 text-lg font-bold ${valueCls}`}>{value}</div>
    </div>
  );
}
