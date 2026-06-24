import { Scan } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { Scanner } from "./scanner";

export default async function ScanPage() {
  await requireRole("client");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Scan className="h-5 w-5 text-primary" />
          AI food scanner
        </h1>
        <p className="text-sm text-muted-foreground">
          Snap or upload a food photo — Gemini Vision detects items, estimates calories, protein, carbs and fat.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Scan a meal</CardTitle>
          <CardDescription>
            Tip: take the photo from above with the whole plate visible. Accuracy improves with clear lighting.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Scanner />
        </CardContent>
      </Card>
    </div>
  );
}
