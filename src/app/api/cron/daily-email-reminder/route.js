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
    const cronSecret = process.env.NEXT_PUBLIC_CRON_SECRET;

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

    console.log(`📧 Sending consolidated email to: ${recipients.join(", ")}`);
    console.log(`👤 Single recipient configured`);
    console.log(
      `📦 Consolidating ${expiringRecords.length} materials into 1 email`
    );

    // Send single consolidated email with all expiring records
    let emailResult;
    let successful = 0;
    let failed = 0;

    try {
      const emailHTML = generateConsolidatedEmailHTML(expiringRecords);
      const emailSubject = `🚨 URGENT: ${expiringRecords.length} Mill Sheet(s) Expiring Soon`;

      console.log(
        `📤 Sending consolidated email with subject: ${emailSubject}`
      );

      emailResult = await resend.emails.send({
        from: "Mill Sheet System <onboarding@resend.dev>",
        to: recipients,
        subject: emailSubject,
        html: emailHTML,
        tags: [
          { name: "source", value: isVercelCron ? "vercel-cron" : "manual" },
          { name: "category", value: "mill-sheet-reminder-consolidated" },
          { name: "material_count", value: expiringRecords.length.toString() },
          { name: "email_type", value: "consolidated" },
        ],
      });

      if (emailResult.data) {
        successful = 1;
        console.log(
          `✅ Consolidated email sent successfully - ID: ${emailResult.data.id}`
        );
      } else {
        failed = 1;
        console.error(
          `❌ Failed to send consolidated email:`,
          emailResult.error
        );
      }
    } catch (emailError) {
      failed = 1;
      console.error(`❌ Email sending error:`, emailError);
    }

    // Log to email_logs table
    const { error: emailLogError } = await supabase.from("email_logs").insert({
      action: "cron_expiry_reminder_consolidated",
      records_count: expiringRecords.length,
      emails_sent: successful,
      emails_failed: failed,
      recipients: recipients,
      created_at: new Date().toISOString(),
      details: {
        email_type: "consolidated",
        materials: expiringRecords.map((r) => r.material),
      },
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
      result:
        successful > 0
          ? `Successfully sent 1 consolidated email with ${expiringRecords.length} materials`
          : `Failed to send consolidated email`,
      completed_at: new Date().toISOString(),
    });

    if (cronLogError) {
      console.warn("Failed to log cron execution:", cronLogError);
    }

    console.log(
      `🎉 Cron job completed successfully - Consolidated Email: ${successful > 0 ? "Sent" : "Failed"}`
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
        email_type: "consolidated",
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

// Consolidated Email HTML template
function generateConsolidatedEmailHTML(records) {
  // Sort records by days until expiry (most urgent first)
  const sortedRecords = records.sort((a, b) => {
    const daysA = Math.ceil(
      (new Date(a.tanggal_expire).getTime() - new Date().getTime()) /
        (1000 * 60 * 60 * 24)
    );
    const daysB = Math.ceil(
      (new Date(b.tanggal_expire).getTime() - new Date().getTime()) /
        (1000 * 60 * 60 * 24)
    );
    return daysA - daysB;
  });

  // Generate summary statistics
  const today = new Date();
  const expiring1Day = sortedRecords.filter((r) => {
    const days = Math.ceil(
      (new Date(r.tanggal_expire).getTime() - today.getTime()) /
        (1000 * 60 * 60 * 24)
    );
    return days === 1;
  }).length;

  const expiring2Days = sortedRecords.filter((r) => {
    const days = Math.ceil(
      (new Date(r.tanggal_expire).getTime() - today.getTime()) /
        (1000 * 60 * 60 * 24)
    );
    return days === 2;
  }).length;

  const expiring3Days = sortedRecords.filter((r) => {
    const days = Math.ceil(
      (new Date(r.tanggal_expire).getTime() - today.getTime()) /
        (1000 * 60 * 60 * 24)
    );
    return days === 3;
  }).length;

  // Generate material cards HTML
  const materialsHTML = sortedRecords
    .map((record) => {
      const daysUntilExpiry = Math.ceil(
        (new Date(record.tanggal_expire).getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24)
      );

      const badgeClass =
        daysUntilExpiry === 1
          ? "critical"
          : daysUntilExpiry === 2
            ? "warning"
            : "alert";

      return `
      <div class="material-card">
        <div class="material-header">
          <h4>${record.material}</h4>
          <span class="badge ${badgeClass}">${daysUntilExpiry} day(s)</span>
        </div>
        <table class="info-table">
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
      </div>
    `;
    })
    .join("");

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Mill Sheet Expiry Reminder - ${records.length} Materials</title>
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
          max-width: 700px; 
          margin: 20px auto; 
          background-color: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
        }
        .header { 
          background: linear-gradient(135deg, #dc2626, #b91c1c);
          color: white; 
          padding: 40px 30px; 
          text-align: center; 
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 700;
          text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        .header p {
          margin: 12px 0 0 0;
          font-size: 18px;
          opacity: 0.95;
        }
        .content { 
          padding: 40px 30px;
        }
        .alert { 
          background: linear-gradient(135deg, #fef2f2, #fee2e2); 
          border-left: 6px solid #dc2626; 
          padding: 20px; 
          margin: 0 0 30px 0;
          border-radius: 0 8px 8px 0;
        }
        .alert strong {
          color: #dc2626;
          font-size: 16px;
        }
        .summary {
          background: linear-gradient(135deg, #f0f9ff, #e0f2fe);
          padding: 25px;
          border-radius: 8px;
          margin: 30px 0;
          border: 1px solid #bae6fd;
        }
        .summary h4 {
          margin: 0 0 15px 0;
          color: #0c4a6e;
          font-size: 18px;
        }
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 15px;
          margin-top: 15px;
        }
        .summary-item {
          text-align: center;
          padding: 15px;
          background: white;
          border-radius: 6px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        .summary-number {
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 5px;
        }
        .critical-number { color: #dc2626; }
        .warning-number { color: #f59e0b; }
        .alert-number { color: #3b82f6; }
        .material-card {
          margin: 25px 0;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
          transition: transform 0.2s ease;
        }
        .material-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 15px rgba(0, 0, 0, 0.1);
        }
        .material-header {
          background: linear-gradient(135deg, #f9fafb, #f3f4f6);
          padding: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #e5e7eb;
        }
        .material-header h4 {
          margin: 0;
          color: #1f2937;
          font-size: 18px;
          font-weight: 600;
        }
        .info-table { 
          width: 100%; 
          border-collapse: collapse;
        }
        .info-table td { 
          padding: 15px 20px; 
          border-bottom: 1px solid #f3f4f6; 
        }
        .info-table tr:last-child td {
          border-bottom: none;
        }
        .info-table td:first-child { 
          font-weight: 600; 
          background: #fafbfc; 
          width: 35%;
          color: #374151;
        }
        .urgent { 
          color: #dc2626; 
          font-weight: 700; 
        }
        .badge {
          display: inline-block;
          padding: 8px 16px;
          color: white;
          border-radius: 25px;
          font-size: 14px;
          font-weight: 600;
          text-shadow: 0 1px 2px rgba(0,0,0,0.2);
        }
        .badge.critical {
          background: linear-gradient(135deg, #dc2626, #b91c1c);
          animation: pulse 2s infinite;
        }
        .badge.warning {
          background: linear-gradient(135deg, #f59e0b, #d97706);
        }
        .badge.alert {
          background: linear-gradient(135deg, #3b82f6, #2563eb);
        }
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
        .actions { 
          background: linear-gradient(135deg, #f0f9ff, #e0f2fe); 
          padding: 25px; 
          border-radius: 8px; 
          margin: 30px 0;
          border: 1px solid #bae6fd;
        }
        .actions h4 {
          margin: 0 0 15px 0;
          color: #0c4a6e;
          font-size: 18px;
        }
        .actions ul {
          margin: 0;
          padding-left: 25px;
        }
        .actions li {
          margin: 10px 0;
          color: #374151;
          font-size: 15px;
        }
        .footer { 
          background: linear-gradient(135deg, #1f2937, #111827); 
          color: #d1d5db; 
          padding: 30px; 
          text-align: center; 
        }
        .footer p {
          margin: 0;
          font-size: 16px;
        }
        .footer small {
          opacity: 0.8;
          font-size: 14px;
        }
        .powered-by {
          background: #f8fafc;
          padding: 15px;
          text-align: center;
          border-top: 1px solid #e2e8f0;
          font-size: 12px;
          color: #64748b;
        }
        .timestamp {
          background: #f1f5f9;
          padding: 10px 20px;
          text-align: center;
          font-size: 12px;
          color: #64748b;
          border-top: 1px solid #e2e8f0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🚨 Mill Sheet Expiry Alert</h1>
          <p>${records.length} Material${records.length > 1 ? "s" : ""} Require${records.length === 1 ? "s" : ""} Immediate Attention</p>
        </div>
        
        <div class="content">
          <div class="alert">
            <strong>⚠️ Critical Warning:</strong> You have <strong>${records.length} mill sheet${records.length > 1 ? "s" : ""}</strong> expiring in the next 3 days. Immediate action is required to maintain compliance.
          </div>
          
          <div class="summary">
            <h4>📊 Expiry Summary</h4>
            <div class="summary-grid">
              <div class="summary-item">
                <div class="summary-number critical-number">${expiring1Day}</div>
                <div>Tomorrow</div>
              </div>
              <div class="summary-item">
                <div class="summary-number warning-number">${expiring2Days}</div>
                <div>2 Days</div>
              </div>
              <div class="summary-item">
                <div class="summary-number alert-number">${expiring3Days}</div>
                <div>3 Days</div>
              </div>
            </div>
          </div>
          
          <h3 style="margin: 30px 0 20px 0; color: #1f2937; font-size: 22px;">📋 Material Details (${records.length})</h3>
          ${materialsHTML}
          
          <div class="actions">
            <h4>🔧 Required Actions</h4>
            <ul>
              <li><strong>Immediate Review:</strong> Verify all expiring materials and their compliance status</li>
              <li><strong>Contact Suppliers:</strong> Request updated mill sheet certificates from relevant suppliers</li>
              <li><strong>Document Management:</strong> Upload renewed certificates to the system</li>
              <li><strong>Quality Assurance:</strong> Ensure all materials meet current specifications</li>
              <li><strong>System Update:</strong> Update material records with new expiry dates</li>
              <li><strong>Stakeholder Notification:</strong> Inform relevant teams about material status</li>
            </ul>
          </div>
        </div>
        
        <div class="footer">
          <p><strong>Mill Sheet Management System</strong></p>
          <p><small>This consolidated report is sent daily at 23:00 UTC. Please do not reply to this email.</small></p>
        </div>
        
        <div class="timestamp">
          Generated on ${new Date().toLocaleString("id-ID", {
            timeZone: "Asia/Jakarta",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })} WIB
        </div>
        
        <div class="powered-by">
          Powered by Vercel Cron Jobs & Resend | Consolidated Email System
        </div>
      </div>
    </body>
    </html>
  `;
}
