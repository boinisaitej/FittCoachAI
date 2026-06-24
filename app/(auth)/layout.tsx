import Link from "next/link";
import { Dumbbell } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative grid min-h-screen lg:grid-cols-2">
      <div className="absolute inset-0 -z-10 bg-brand-mesh" />

      {/* Left brand panel */}
      <div className="relative hidden flex-col justify-between border-r bg-gradient-to-br from-brand-600 to-emerald-700 p-10 text-white lg:flex">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <Dumbbell className="h-6 w-6" /> FitCoachAI
        </Link>
        <div>
          <p className="text-2xl font-medium leading-snug">
            &ldquo;FitCoachAI replaced our Excel sheets and our trainer WhatsApp groups —
            and our retention jumped 18% in three months.&rdquo;
          </p>
          <p className="mt-4 text-sm text-white/80">— Sample testimonial</p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex items-center justify-center p-6 lg:p-10">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
