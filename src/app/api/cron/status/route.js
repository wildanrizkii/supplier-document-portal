// app/api/cron/status/route.js
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET() {
  try {
    console.log("📊 Fetching cron job status");

    // Get cron job summary from view
    const { data: summary, error: summaryError } = await supabase
      .from("cron_job_summary")
      .select("*");

    // Get recent executions (last 10)
    const { data: recentLogs, error: logsError } = await supabase
      .from("cron_logs")
      .select("*")
      .order("execution_time", { ascending: false })
      .limit(10);

    // Get email logs summary (last 30 days)
    const { data: emailStats, error: emailError } = await supabase
      .from("email_logs")
      .select("*")
      .gte(
        "created_at",
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      )
      .order("created_at", { ascending: false });

    // Check for errors
    if (summaryError || logsError || emailError) {
      console.error("Database errors:", {
        summaryError,
        logsError,
        emailError,
      });
      return NextResponse.json(
        {
          error: "Failed to fetch status data",
          details: {
            summaryError: summaryError?.message,
            logsError: logsError?.message,
            emailError: emailError?.message,
          },
        },
        { status: 500 }
      );
    }

    // Calculate email statistics
    const emailStatsCalculated = emailStats
      ? {
          total_emails_sent: emailStats.reduce(
            (sum, log) => sum + (log.emails_sent || 0),
            0
          ),
          total_reminders: emailStats.length,
          success_rate:
            emailStats.length > 0
              ? (
                  (emailStats.filter((log) => (log.emails_failed || 0) === 0)
                    .length /
                    emailStats.length) *
                  100
                ).toFixed(2)
              : 0,
          last_email_sent:
            emailStats.length > 0 ? emailStats[0].created_at : null,
        }
      : {
          total_emails_sent: 0,
          total_reminders: 0,
          success_rate: 0,
          last_email_sent: null,
        };

    // Get current expiring records count
    const today = new Date();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(today.getDate() + 3);

    const { data: currentExpiringRecords, error: currentError } = await supabase
      .from("material_control")
      .select("id_material_control, material, tanggal_expire")
      .eq("status", true)
      .gte("tanggal_expire", today.toISOString().split("T")[0])
      .lte("tanggal_expire", threeDaysFromNow.toISOString().split("T")[0]);

    const currentExpiringCount = currentExpiringRecords?.length || 0;

    // System health check
    const lastExecution =
      recentLogs && recentLogs.length > 0 ? recentLogs[0] : null;
    const hoursAgo = lastExecution
      ? Math.floor(
          (new Date() - new Date(lastExecution.execution_time)) /
            (1000 * 60 * 60)
        )
      : null;

    const systemHealth = {
      status: hoursAgo !== null && hoursAgo < 25 ? "healthy" : "warning", // Should run daily
      last_execution: lastExecution?.execution_time || null,
      hours_since_last_run: hoursAgo,
      current_expiring_records: currentExpiringCount,
      message:
        hoursAgo !== null && hoursAgo < 25
          ? "System running normally"
          : "Warning: No recent cron execution detected",
    };

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        system_health: systemHealth,
        cron_summary: summary || [],
        recent_executions: recentLogs || [],
        email_statistics: emailStatsCalculated,
        current_expiring_records: {
          count: currentExpiringCount,
          records: currentExpiringRecords || [],
        },
      },
    });
  } catch (error) {
    console.error("💥 Status API error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch cron status",
        message: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
