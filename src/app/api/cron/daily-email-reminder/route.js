// app/api/cron/daily-email-reminder/route.js
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const resend = new Resend(process.env.RESEND_API_KEY);

// Handle GET requests from Vercel Cron (default behavior)
export async function GET(request) {
  return handleCronRequest(request, "GET");
}

// Handle POST requests for manual testing
export async function POST(request) {
  return handleCronRequest(request, "POST");
}

// Shared function untuk handle cron logic
async function handleCronRequest(request, method) {
  try {
    // Verify this is a cron job request
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // Check for Vercel cron headers OR manual authorization
    const isVercelCron = request.headers
      .get("user-agent")
      ?.includes("vercel-cron");
    const isAuthorized = authHeader === `Bearer ${cronSecret}`;

    if (!isVercelCron && !isAuthorized) {
      console.log("⚠️ Unauthorized cron job attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log(
      "🕐 Daily email reminder cron job started at:",
      new Date().toISOString()
    );
    console.log("📡 Request source:", isVercelCron ? "Vercel Cron" : "Manual");
    console.log("🔧 Request method:", method);

    // Calculate date range (3 days from now)
    const today = new Date();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(today.getDate() + 3);

    const todayStr = today.toISOString().split("T")[0];
    const threeDaysStr = threeDaysFromNow.toISOString().split("T")[0];

    console.log(
      `📅 Checking expiry dates between ${todayStr} and ${threeDaysStr}`
    );

    // Get records expiring in the next 3 days
    const { data: expiringRecords, error: queryError } = await supabase
      .from("material_control")
      .select(
        `
        id_material_control,
        material,
        tanggal_report,
        tanggal_expire,
        status,
        supplier:id_supplier(nama),
        part_name:id_part_name(nama),
        part_number:id_part_number(nama),
        jenis_dokumen:id_jenis_dokumen(nama)
      `
      )
      .eq("status", true)
      .gte("tanggal_expire", todayStr)
      .lte("tanggal_expire", threeDaysStr);

    if (queryError) {
      console.error("❌ Database query error:", queryError);
      return NextResponse.json(
        { error: `Database error: ${queryError.message}` },
        { status: 500 }
      );
    }

    console.log(`📊 Found ${expiringRecords?.length || 0} expiring records`);

    // Always log cron job execution
    const cronLogData = {
      job_name: "daily-email-reminder",
      execution_time: new Date().toISOString(),
      records_found: expiringRecords?.length || 0,
      status: "started",
      details: {
        date_range: { from: todayStr, to: threeDaysStr },
        method: method,
        source: isVercelCron ? "vercel-cron" : "manual",
        expiring_records:
          expiringRecords?.map((r) => ({
            material: r.material,
            expire_date: r.tanggal_expire,
          })) || [],
      },
    };

    if (!expiringRecords || expiringRecords.length === 0) {
      console.log(
        "✅ No expiring records found - cron job completed successfully"
      );

      // Log to database
      const { error: logError } = await supabase.from("cron_logs").insert({
        ...cronLogData,
        status: "completed",
        emails_sent: 0,
        result: "No expiring records found",
      });

      if (logError) {
        console.warn("Failed to log cron execution:", logError);
      }

      return NextResponse.json({
        success: true,
        message: "Cron job completed - no expiring records found",
        timestamp: new Date().toISOString(),
        details: {
          expiring_records: 0,
          emails_sent: 0,
          method: method,
          source: isVercelCron ? "vercel-cron" : "manual",
        },
      });
    }

    // Email recipients - hanya 1 email
    const recipients = ["eltutorial9560@gmail.com"];

    console.log(`📧 Sending emails to: ${recipients.join(", ")}`);
    console.log(`👤 Single recipient configured`);

    // Send emails
    const emailPromises = expiringRecords.map(async (record) => {
      const daysUntilExpiry = Math.ceil(
        (new Date(record.tanggal_expire).getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24)
      );

      const emailHTML = generateEmailHTML(record, daysUntilExpiry);
      const emailSubject = `🚨 URGENT: Mill Sheet Expiring in ${daysUntilExpiry} day(s) - ${record.material}`;

      return await resend.emails.send({
        from: "Mill Sheet System <onboarding@resend.dev>",
        to: recipients,
        subject: emailSubject,
        html: emailHTML,
        tags: [
          { name: "source", value: isVercelCron ? "vercel-cron" : "manual" },
          { name: "category", value: "mill-sheet-reminder" },
          {
            name: "material",
            value: record.material.replace(/[^a-zA-Z0-9]/g, "_"),
          },
        ],
      });
    });

    const emailResults = await Promise.allSettled(emailPromises);

    const successful = emailResults.filter(
      (result) => result.status === "fulfilled"
    ).length;
    const failed = emailResults.filter(
      (result) => result.status === "rejected"
    ).length;

    // Log results
    emailResults.forEach((result, index) => {
      if (result.status === "rejected") {
        console.error(`❌ Email ${index + 1} failed:`, result.reason);
      } else {
        console.log(
          `✅ Email ${index + 1} sent successfully - ID: ${result.value?.data?.id}`
        );
      }
    });

    // Log to email_logs table
    const { error: emailLogError } = await supabase.from("email_logs").insert({
      action: "cron_expiry_reminder",
      records_count: expiringRecords.length,
      emails_sent: successful,
      emails_failed: failed,
      recipients: recipients,
      created_at: new Date().toISOString(),
    });

    if (emailLogError) {
      console.warn("Failed to log email activity:", emailLogError);
    }

    // Log to cron_logs table
    const { error: cronLogError } = await supabase.from("cron_logs").insert({
      ...cronLogData,
      status: "completed",
      emails_sent: successful,
      emails_failed: failed,
      result: `Successfully sent ${successful} emails, ${failed} failed`,
      completed_at: new Date().toISOString(),
    });

    if (cronLogError) {
      console.warn("Failed to log cron execution:", cronLogError);
    }

    console.log(
      `🎉 Cron job completed successfully - Sent: ${successful}, Failed: ${failed}`
    );

    return NextResponse.json({
      success: true,
      message: "Daily email reminder cron job completed successfully",
      timestamp: new Date().toISOString(),
      details: {
        expiring_records: expiringRecords.length,
        emails_sent: successful,
        emails_failed: failed,
        recipients: recipients.length,
        method: method,
        source: isVercelCron ? "vercel-cron" : "manual",
      },
    });
  } catch (error) {
    console.error("💥 Cron job error:", error);

    // Log error to database
    const { error: logError } = await supabase.from("cron_logs").insert({
      job_name: "daily-email-reminder",
      execution_time: new Date().toISOString(),
      status: "failed",
      result: `Error: ${error.message}`,
      error_details: error.stack,
    });

    if (logError) {
      console.warn("Failed to log cron error:", logError);
    }

    return NextResponse.json(
      {
        error: "Cron job failed",
        message: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Email HTML template
function generateEmailHTML(record, daysUntilExpiry) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Mill Sheet Expiry Reminder</title>
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6; 
          color: #333; 
          margin: 0; 
          padding: 0; 
          background-color: #f5f5f5;
        }
        .container { 
          max-width: 600px; 
          margin: 20px auto; 
          background-color: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header { 
          background: linear-gradient(135deg, #dc2626, #b91c1c);
          color: white; 
          padding: 30px 20px; 
          text-align: center; 
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 700;
        }
        .header p {
          margin: 8px 0 0 0;
          font-size: 16px;
          opacity: 0.9;
        }
        .content { 
          padding: 30px 20px;
        }
        .alert { 
          background: #fef2f2; 
          border-left: 4px solid #dc2626; 
          padding: 16px; 
          margin: 0 0 24px 0;
          border-radius: 0 4px 4px 0;
        }
        .alert strong {
          color: #dc2626;
        }
        .info-table { 
          width: 100%; 
          border-collapse: collapse; 
          margin: 20px 0;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          overflow: hidden;
        }
        .info-table td { 
          padding: 12px 16px; 
          border-bottom: 1px solid #e5e7eb; 
        }
        .info-table td:last-child {
          border-bottom: none;
        }
        .info-table td:first-child { 
          font-weight: 600; 
          background: #f9fafb; 
          width: 35%;
          color: #374151;
        }
        .urgent { 
          color: #dc2626; 
          font-weight: 700; 
        }
        .actions { 
          background: #f0f9ff; 
          padding: 20px; 
          border-radius: 6px; 
          margin: 24px 0;
          border: 1px solid #bae6fd;
        }
        .actions h4 {
          margin: 0 0 12px 0;
          color: #0c4a6e;
        }
        .actions ul {
          margin: 0;
          padding-left: 20px;
        }
        .actions li {
          margin: 8px 0;
          color: #374151;
        }
        .footer { 
          background: #1f2937; 
          color: #d1d5db; 
          padding: 20px; 
          text-align: center; 
        }
        .footer p {
          margin: 0;
        }
        .footer small {
          opacity: 0.8;
        }
        .badge {
          display: inline-block;
          padding: 4px 12px;
          background: #dc2626;
          color: white;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 600;
        }
        .powered-by {
          background: #f8fafc;
          padding: 12px;
          text-align: center;
          border-top: 1px solid #e2e8f0;
          font-size: 12px;
          color: #64748b;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🚨 Mill Sheet Expiry Alert</h1>
          <p>Automatic Daily Reminder</p>
        </div>
        
        <div class="content">
          <div class="alert">
            <strong>⚠️ Warning:</strong> The following mill sheet will expire in 
            <span class="badge">${daysUntilExpiry} day(s)</span>
          </div>
          
          <h3 style="margin: 0 0 16px 0; color: #1f2937;">Mill Sheet Details:</h3>
          <table class="info-table">
            <tr>
              <td>Material</td>
              <td><strong>${record.material}</strong></td>
            </tr>
            <tr>
              <td>Supplier</td>
              <td>${record.supplier?.nama || "Not specified"}</td>
            </tr>
            <tr>
              <td>Part Number</td>
              <td>${record.part_number?.nama || "Not specified"}</td>
            </tr>
            <tr>
              <td>Part Name</td>
              <td>${record.part_name?.nama || "Not specified"}</td>
            </tr>
            <tr>
              <td>Document Type</td>
              <td>${record.jenis_dokumen?.nama || "Not specified"}</td>
            </tr>
            <tr>
              <td>Report Date</td>
              <td>${record.tanggal_report ? new Date(record.tanggal_report).toLocaleDateString("id-ID") : "Not specified"}</td>
            </tr>
            <tr>
              <td>Expire Date</td>
              <td class="urgent">${new Date(record.tanggal_expire).toLocaleDateString("id-ID")}</td>
            </tr>
          </table>
          
          <div class="actions">
            <h4>🔧 Required Actions:</h4>
            <ul>
              <li>Review and renew the mill sheet certificate</li>
              <li>Contact supplier for updated documentation</li>
              <li>Update system records with new expiry date</li>
              <li>Verify material compliance status</li>
              <li>Upload new document to the system</li>
            </ul>
          </div>
        </div>
        
        <div class="footer">
          <p><strong>Mill Sheet Management System</strong></p>
          <p><small>This is an automated daily reminder sent at 23:00 UTC. Please do not reply to this email.</small></p>
        </div>
        
        <div class="powered-by">
          Automated by Vercel Cron Jobs & Resend
        </div>
      </div>
    </body>
    </html>
  `;
}
