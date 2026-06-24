import { z } from "zod";

const schema = z.object({
  NEXT_PUBLIC_APP_NAME: z.string().default("FitCoachAI"),
  NEXT_PUBLIC_APP_URL: z.string().default("http://localhost:3000"),

  // Supabase keys are technically required at runtime, but we keep them
  // optional in the schema so the app can boot to the /setup-required page
  // when they're missing (instead of crashing in layout.tsx).
  NEXT_PUBLIC_SUPABASE_URL: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(10).optional(),

  GOOGLE_API_KEY: z.string().optional(),
  // gemini-1.5-* was retired in Sep 2025; default to current free-tier names.
  GEMINI_MODEL: z.string().default("gemini-2.0-flash"),
  GEMINI_PRO_MODEL: z.string().default("gemini-2.5-pro"),

  MAIL_ENABLED: z.string().default("0"),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().optional(),

  RAZORPAY_ENABLED: z.string().default("0"),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  RAZORPAY_CURRENCY: z.string().default("INR"),

  TWILIO_ENABLED: z.string().default("0"),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_FROM_PHONE: z.string().optional(),

  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().optional(),
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().optional(),

  CRON_SECRET: z.string().default("dev-cron-secret"),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success && typeof window === "undefined") {
  console.warn(
    "[env] Some environment variables failed validation:",
    parsed.error.flatten().fieldErrors
  );
}

// Always apply defaults even on validation failure so the app can boot.
const fallback = schema.parse({});
export const env = (parsed.success ? parsed.data : { ...fallback, ...process.env }) as z.infer<typeof schema>;

export const flag = (key: string, fallback = false): boolean => {
  const v = process.env[`FEATURE_${key}`];
  if (v === undefined) return fallback;
  return v === "1" || v.toLowerCase() === "true";
};

export const isProd = () => env.NODE_ENV === "production";
