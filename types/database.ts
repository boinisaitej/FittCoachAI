/**
 * Hand-crafted Database type. Regenerate after running migrations:
 *   npm run db:types
 * (uses `supabase gen types typescript` — requires the Supabase CLI logged in
 *  with SUPABASE_PROJECT_ID set in env).
 *
 * Until then, this file is the source of truth for compile-time typing.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      gyms: Row<{
        id: string;
        name: string;
        slug: string | null;
        address: string | null;
        logo_url: string | null;
        primary_color: string;
        currency: string;
        timezone: string;
        language: string;
        owner_user_id: string | null;
        specializations: string[];
        created_at: string;
        updated_at: string;
      }>;
      profiles: Row<{
        id: string;
        gym_id: string | null;
        role: "owner" | "trainer" | "client";
        full_name: string | null;
        email: string | null;
        phone: string | null;
        avatar_url: string | null;
        gender: "male" | "female" | "other" | null;
        dob: string | null;
        height_cm: number | null;
        weight_kg: number | null;
        specialization: string | null;
        trainer_type: "general" | "personal" | "specialized" | null;
        availability: Json;
        address: string | null;
        active: boolean;
        must_change_password: boolean;
        language: string;
        created_at: string;
        updated_at: string;
      }>;
      plans: Row<{
        id: string;
        gym_id: string | null;
        kind: "basic" | "pro";
        name: string;
        price_cents: number;
        duration_days: number;
        features: Json;
        active: boolean;
        created_at: string;
      }>;
      subscriptions: Row<{
        id: string;
        client_id: string;
        plan_id: string;
        start_date: string;
        end_date: string;
        discount_pct: number;
        status: "active" | "expired" | "cancelled" | "grace";
        razorpay_subscription_id: string | null;
        created_at: string;
        updated_at: string;
      }>;
      trainer_clients: Row<{
        id: string;
        trainer_id: string;
        client_id: string;
        assigned_at: string;
        ended_at: string | null;
        is_active: boolean;
      }>;
      client_preferences: Row<{
        client_id: string;
        exercise_types: string[];
        is_vegetarian: boolean;
        ai_diet_enabled: boolean;
        ai_workout_enabled: boolean;
        water_goal_glasses: number;
        dietary_restrictions: string[] | null;
        allergies: string[] | null;
        updated_at: string;
      }>;
      daily_plans: Row<{
        id: string;
        client_id: string;
        trainer_id: string | null;
        plan_date: string;
        ai_generated: boolean;
        created_at: string;
      }>;
      daily_plan_items: Row<{
        id: string;
        daily_plan_id: string;
        kind: "food" | "exercise" | "water" | "sleep" | "note";
        title: string;
        description: string | null;
        quantity: string | null;
        ai_reason: string | null;
        position: number;
        created_at: string;
      }>;
      todo_completions: Row<{
        id: string;
        daily_plan_item_id: string;
        client_id: string;
        status: "pending" | "completed" | "partial" | "skipped";
        note: string | null;
        completed_at: string;
      }>;
      cheat_days: Row<{
        id: string;
        client_id: string;
        trainer_id: string | null;
        cheat_date: string;
        reason: string | null;
        created_at: string;
      }>;
      bmi_logs: Row<{
        id: string;
        client_id: string;
        height_cm: number;
        weight_kg: number;
        bmi: number;
        logged_at: string;
      }>;
      health_issues: Row<{
        id: string;
        client_id: string;
        problem: string;
        severity: "mild" | "moderate" | "severe";
        ai_foods: Json | null;
        ai_exercises: Json | null;
        ai_tips: Json | null;
        resolved_at: string | null;
        created_at: string;
      }>;
      injuries: Row<{
        id: string;
        client_id: string;
        tag: string;
        severity: "mild" | "moderate" | "severe";
        notes: string | null;
        resolved_at: string | null;
        created_at: string;
      }>;
      water_logs: Row<{
        id: string;
        client_id: string;
        log_date: string;
        glasses: number;
        updated_at: string;
      }>;
      sleep_logs: Row<{
        id: string;
        client_id: string;
        log_date: string;
        hours: number;
        notes: string | null;
        created_at: string;
      }>;
      junk_food_logs: Row<{
        id: string;
        client_id: string;
        log_date: string;
        item: string;
        quantity: string | null;
        created_at: string;
      }>;
      progress_photos: Row<{
        id: string;
        client_id: string;
        kind: "before" | "progress" | "after";
        storage_path: string;
        notes: string | null;
        taken_at: string;
      }>;
      chat_threads: Row<{
        id: string;
        gym_id: string | null;
        kind: "trainer_client" | "owner_client" | "owner_trainer" | "broadcast";
        participant_ids: string[];
        title: string | null;
        created_at: string;
      }>;
      chat_messages: Row<{
        id: string;
        thread_id: string;
        sender_id: string;
        body: string;
        deleted_at: string | null;
        created_at: string;
      }>;
      ai_chat_sessions: Row<{
        id: string;
        client_id: string;
        title: string;
        created_at: string;
        updated_at: string;
      }>;
      ai_chat_messages: Row<{
        id: string;
        session_id: string;
        role: "user" | "assistant" | "system";
        content: string;
        created_at: string;
      }>;
      ai_chat_daily_usage: Row<{
        client_id: string;
        usage_date: string;
        count: number;
      }>;
      ai_diet_plans: Row<{
        id: string;
        client_id: string;
        scope: "day" | "week";
        start_date: string;
        plan: Json;
        applied_to_todos: boolean;
        created_at: string;
      }>;
      ai_workout_plans: Row<{
        id: string;
        client_id: string;
        scope: "day" | "week";
        start_date: string;
        plan: Json;
        applied_to_todos: boolean;
        created_at: string;
      }>;
      nutrition_kb_docs: Row<{
        id: string;
        title: string;
        content: string;
        source: string | null;
        created_at: string;
      }>;
      nutrition_kb_queries: Row<{
        id: string;
        client_id: string;
        query: string;
        results: Json | null;
        vector_live: boolean;
        created_at: string;
      }>;
      grocery_lists: Row<{
        id: string;
        client_id: string;
        title: string;
        date_from: string;
        date_to: string;
        items: Json;
        checked: Json;
        total_inr: number;
        created_at: string;
      }>;
      invoices: Row<{
        id: string;
        gym_id: string;
        client_id: string;
        subscription_id: string | null;
        invoice_number: string;
        fiscal_year: string;
        amount_cents: number;
        gst_cents: number;
        total_cents: number;
        currency: string;
        status: "issued" | "paid" | "cancelled" | "refunded";
        pdf_path: string | null;
        razorpay_payment_id: string | null;
        issued_at: string;
        paid_at: string | null;
      }>;
      weekly_reports: Row<{
        id: string;
        client_id: string;
        week_start: string;
        adherence_pct: number;
        total_points: number;
        ai_summary: string | null;
        pdf_path: string | null;
        created_at: string;
      }>;
      trainer_summaries: Row<{
        id: string;
        trainer_id: string;
        week_start: string;
        body: string;
        created_at: string;
      }>;
      notifications: Row<{
        id: string;
        recipient_id: string;
        kind:
          | "welcome"
          | "plan_assigned"
          | "plan_extended"
          | "invoice"
          | "report"
          | "announcement"
          | "broadcast"
          | "todo_reminder"
          | "streak_reward"
          | "alert"
          | "message"
          | "system";
        title: string;
        body: string | null;
        link: string | null;
        read_at: string | null;
        scheduled_for: string | null;
        recurrence: string | null;
        sent_at: string | null;
        created_at: string;
      }>;
      announcements: Row<{
        id: string;
        gym_id: string;
        author_id: string | null;
        title: string;
        body: string;
        audience: Json;
        scheduled_for: string | null;
        sent_at: string | null;
        created_at: string;
      }>;
      email_log: Row<{
        id: string;
        recipient_email: string;
        subject: string;
        template: string | null;
        status: string;
        provider_msg_id: string | null;
        opened_at: string | null;
        clicked_at: string | null;
        bounced_at: string | null;
        error: string | null;
        created_at: string;
      }>;
      push_subscriptions: Row<{
        id: string;
        user_id: string;
        endpoint: string;
        p256dh: string;
        auth: string;
        ua: string | null;
        created_at: string;
      }>;
      trainer_alerts: Row<{
        id: string;
        trainer_id: string;
        client_id: string;
        kind:
          | "sleep_low"
          | "severe_health"
          | "injury"
          | "junk_excess"
          | "missed_workout"
          | "stale_todos";
        payload: Json | null;
        resolved_at: string | null;
        created_at: string;
      }>;
      points_log: Row<{
        id: string;
        client_id: string;
        points: number;
        reason: string;
        todo_completion_id: string | null;
        created_at: string;
      }>;
      streaks: Row<{
        client_id: string;
        current_streak: number;
        longest_streak: number;
        last_completion_date: string | null;
        updated_at: string;
      }>;
      rewards: Row<{
        id: string;
        client_id: string;
        milestone: number;
        extension_days: number;
        granted_at: string;
      }>;
      ratings: Row<{
        id: string;
        week_start: string;
        rater_id: string;
        ratee_id: string;
        stars: number;
        comment: string | null;
        created_at: string;
      }>;
      slogans: Row<{
        id: string;
        gym_id: string | null;
        text: string;
        source: "default" | "ai" | "owner";
        active: boolean;
        created_at: string;
      }>;
      festivals: Row<{
        id: string;
        name: string;
        festival_date: string;
        country_code: string;
        is_veg_only: boolean;
      }>;
      leads: Row<{
        id: string;
        gym_id: string;
        full_name: string;
        email: string | null;
        phone: string | null;
        source: string;
        notes: string | null;
        stage: "new" | "trial" | "paid" | "lost";
        converted_client_id: string | null;
        created_at: string;
        updated_at: string;
      }>;
      gym_classes: Row<{
        id: string;
        gym_id: string;
        trainer_id: string | null;
        title: string;
        category: string;
        start_at: string;
        end_at: string;
        capacity: number;
        status: "scheduled" | "live" | "done" | "cancelled";
        notes: string | null;
        created_at: string;
      }>;
      class_bookings: Row<{
        id: string;
        class_id: string;
        client_id: string;
        status: "confirmed" | "waitlist" | "cancelled" | "attended" | "no_show";
        created_at: string;
      }>;
      audit_log: Row<{
        id: string;
        gym_id: string | null;
        actor_id: string | null;
        action: string;
        target_kind: string | null;
        target_id: string | null;
        payload: Json | null;
        created_at: string;
      }>;
    };
    Views: Record<string, never>;
    Functions: {
      recompute_streak: {
        Args: { p_client: string };
        Returns: { current_streak: number; longest_streak: number; milestone_hit: number }[];
      };
      next_invoice_number: {
        Args: { p_gym: string };
        Returns: { invoice_number: string; fiscal_year: string }[];
      };
      adherence_pct: {
        Args: { p_client: string; p_from: string; p_to: string };
        Returns: number;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

type Row<T> = {
  Row: T;
  Insert: Partial<T>;
  Update: Partial<T>;
};
