// app/api/email-reminder/route.js
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request) {
  try {
    console.log("🚀 Email reminder API started");

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
      .eq("status", true) // Only active records
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

    if (!expiringRecords || expiringRecords.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No expiring records found",
        details: {
          expiring_records: 0,
          emails_sent: 0,
          emails_failed: 0,
          recipients: 0,
        },
      });
    }

    // Get email recipients dari users table (admins/managers)
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("email, nama, role")
      .eq("email_verified", true) // Only verified users
      .in("role", ["admin", "manager"]); // Only admin and manager roles

    let recipients;
    if (usersError) {
      console.error("❌ Error fetching users:", usersError);
      // Fallback to default recipients if query fails
      recipients = [
        "admin@company.com",
        "manager@company.com",
        "eltutorial9560@gmail.com", // Your test email
      ];
    } else {
      // Use emails from database + fallback email
      recipients = [
        ...users.map((user) => user.email),
        "eltutorial9560@gmail.com", // Keep for monitoring
      ];

      // Remove duplicates
      recipients = [...new Set(recipients)];
    }

    if (recipients.length === 0) {
      console.log("⚠️ No recipients found - using fallback email");
      recipients = ["eltutorial9560@gmail.com"];
    }

    console.log(`📧 Preparing to send emails to: ${recipients.join(", ")}`);
    console.log(`👥 Found ${users?.length || 0} users in database`);

    // Send emails for each expiring record using Resend
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
          { name: "category", value: "mill-sheet-reminder" },
          {
            name: "material",
            value: record.material.replace(/[^a-zA-Z0-9]/g, "_"),
          },
          { name: "days_until_expiry", value: daysUntilExpiry.toString() },
        ],
      });
    });

    // Wait for all emails to be sent
    const emailResults = await Promise.allSettled(emailPromises);

    const successful = emailResults.filter(
      (result) => result.status === "fulfilled"
    ).length;
    const failed = emailResults.filter(
      (result) => result.status === "rejected"
    ).length;

    // Log failed emails
    emailResults.forEach((result, index) => {
      if (result.status === "rejected") {
        console.error(`❌ Email ${index + 1} failed:`, result.reason);
      } else {
        console.log(
          `✅ Email ${index + 1} sent successfully - ID: ${result.value?.data?.id}`
        );
      }
    });

    // Log the activity to Supabase
    try {
      const { error: logError } = await supabase.from("email_logs").insert({
        action: "expiry_reminder",
        records_count: expiringRecords.length,
        emails_sent: successful,
        emails_failed: failed,
        recipients: recipients,
        created_at: new Date().toISOString(),
      });

      if (logError) {
        console.warn("⚠️ Failed to log email activity:", logError);
      } else {
        console.log("📝 Activity logged to database");
      }
    } catch (logError) {
      console.warn("⚠️ Failed to log email activity:", logError);
    }

    return NextResponse.json({
      success: true,
      message: `Email reminders processed successfully`,
      details: {
        expiring_records: expiringRecords.length,
        emails_sent: successful,
        emails_failed: failed,
        recipients: recipients.length,
        failed_emails:
          failed > 0
            ? emailResults
                .filter((result) => result.status === "rejected")
                .map((result) => result.reason?.message || "Unknown error")
            : [],
      },
    });
  } catch (error) {
    console.error("💥 API error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Email HTML template generator
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
          <p>Immediate attention required</p>
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
          <p><small>This is an automated reminder sent daily at 09:00 WIB. Please do not reply to this email.</small></p>
        </div>
        
        <div class="powered-by">
          Powered by Next.js App Router & Resend
        </div>
      </div>
    </body>
    </html>
  `;
}
