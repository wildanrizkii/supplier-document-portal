import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import dayjs from "dayjs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Konfigurasi email transporter (sama dengan API verifikasi)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST, // smtp.gmail.com
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Handle GET requests from Vercel Cron (default behavior)
export async function GET(request) {
  return handleCronRequest(request, "GET");
}

// Handle POST requests for manual testing
export async function POST(request) {
  const body = await request.json().catch(() => ({}));

  // Test endpoint untuk debugging
  if (body.test === "email_config") {
    return NextResponse.json({
      smtp_from: process.env.SMTP_FROM,
      smtp_user: process.env.SMTP_USER,
      smtp_host: process.env.SMTP_HOST,
      recipients: "",
      timestamp: new Date().toISOString(),
      app_url: process.env.NEXT_PUBLIC_APP_URL,
    });
  }

  // Test endpoint untuk kirim email langsung
  if (body.test === "send_test_email") {
    try {
      const testResult = await transporter.sendMail({
        from: `"Sistem Portal Dokumen" <${process.env.SMTP_FROM}>`,
        to: "wildanrizki9560@gmail.com",
        subject: "Test Email - Sistem Pengingat Bulanan",
        html: `
          <h2>Test Email Berhasil</h2>
          <p><strong>From:</strong> ${process.env.SMTP_FROM}</p>
          <p><strong>To:</strong> wildanrizki9560@gmail.com</p>
          <p><strong>Time:</strong> ${new Date().toISOString()}</p>
          <p><strong>SMTP User:</strong> ${process.env.SMTP_USER}</p>
         `,
      });

      return NextResponse.json({
        success: true,
        messageId: testResult.messageId,
        from: process.env.SMTP_FROM,
        to: "wildanrizki9560@gmail.com",
        response: testResult.response,
      });
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          code: error.code,
        },
        { status: 500 }
      );
    }
  }

  // Test endpoint untuk menjalankan cronjob manual
  if (body.test === "run_monthly_cron") {
    console.log("🔧 Manual monthly cron test started");

    // Clone headers asli lalu tambahkan authorization
    const newHeaders = new Headers(request.headers);
    newHeaders.set(
      "authorization",
      `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET}`
    );

    // Buat Request baru dengan headers yang sudah di-override
    const testRequest = new Request(request.url, {
      method: request.method,
      headers: newHeaders,
    });

    return handleCronRequest(testRequest, "POST-TEST");
  }

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

    // DEBUG: Log konfigurasi environment
    console.log("🔍 Environment Configuration:");
    console.log("SMTP_FROM:", process.env.SMTP_FROM);
    console.log("SMTP_USER:", process.env.SMTP_USER);
    console.log("SMTP_HOST:", process.env.SMTP_HOST);
    console.log("Recipients target: wildanrizki9560@gmail.com");

    console.log(
      "🕐 Monthly email reminder cron job started at:",
      new Date().toISOString()
    );
    console.log("📡 Request source:", isVercelCron ? "Vercel Cron" : "Manual");
    console.log("🔧 Request method:", method);

    // Calculate date ranges for 1, 2, and 3 months from report date
    const today = new Date();

    // 3 months from report date (90 days tolerance)
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(today.getMonth() + 3);
    const threeMonthsRange = {
      start: new Date(threeMonthsFromNow.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days before
      end: new Date(threeMonthsFromNow.getTime() + 3 * 24 * 60 * 60 * 1000), // 3 days after
    };

    // 2 months from report date
    const twoMonthsFromNow = new Date();
    twoMonthsFromNow.setMonth(today.getMonth() + 2);
    const twoMonthsRange = {
      start: new Date(twoMonthsFromNow.getTime() - 3 * 24 * 60 * 60 * 1000),
      end: new Date(twoMonthsFromNow.getTime() + 3 * 24 * 60 * 60 * 1000),
    };

    // 1 month from report date
    const oneMonthFromNow = new Date();
    oneMonthFromNow.setMonth(today.getMonth() + 1);
    const oneMonthRange = {
      start: new Date(oneMonthFromNow.getTime() - 3 * 24 * 60 * 60 * 1000),
      end: new Date(oneMonthFromNow.getTime() + 3 * 24 * 60 * 60 * 1000),
    };

    // Also check for documents expiring within 3 months from report date
    const threeMonthsMax = new Date();
    threeMonthsMax.setMonth(today.getMonth() + 3);

    const todayStr = dayjs().format("YYYY-MM-DD");
    const threeMonthsMaxStr = dayjs().add(3, "month").format("YYYY-MM-DD");

    console.log(
      `📅 Checking expiry dates between ${todayStr} and ${threeMonthsMaxStr} (from report date)`
    );

    // Get records expiring within the next 3 months from report date
    const { data: expiringRecords, error: queryError } = await supabase
      .from("material_control")
      .select(
        `
    id_material_control,
    material,
    tanggal_report,
    tanggal_expire,
    status,
    id_user,
    email:users(email),
    supplier:id_supplier(nama),
    part_name:id_part_name(nama),
    part_number:id_part_number(nama),
    jenis_dokumen:id_jenis_dokumen(nama)
    `
      )
      .gte("tanggal_expire", todayStr)
      .lte("tanggal_expire", threeMonthsMaxStr);

    if (queryError) {
      console.error("❌ Database query error:", queryError);
      return NextResponse.json(
        { error: `Database error: ${queryError.message}` },
        { status: 500 }
      );
    }

    console.log(
      `📊 Found ${expiringRecords?.length || 0} expiring records within 3 months`
    );

    // Filter records into monthly categories based on report date
    const monthlyCategories = categorizeRecordsByMonthFromReportDate(
      expiringRecords,
      {
        oneMonth: oneMonthRange,
        twoMonths: twoMonthsRange,
        threeMonths: threeMonthsRange,
      }
    );

    console.log("📊 Monthly breakdown:", {
      threeMonths: monthlyCategories.threeMonths.length,
      twoMonths: monthlyCategories.twoMonths.length,
      oneMonth: monthlyCategories.oneMonth.length,
      others: monthlyCategories.others.length,
    });

    // Check if we should send emails today (only send for specific monthly milestones)
    const recordsToNotify = [
      ...monthlyCategories.threeMonths,
      ...monthlyCategories.twoMonths,
      ...monthlyCategories.oneMonth,
    ];

    if (!recordsToNotify || recordsToNotify.length === 0) {
      console.log(
        "✅ No monthly milestone records found - cron job completed successfully"
      );

      // Log to database
      const { error: logError } = await supabase.from("cron_logs").insert({
        job_name: "monthly-email-reminder",
        execution_time: new Date().toISOString(),
        records_found: expiringRecords?.length || 0,
        status: "completed",
        emails_sent: 0,
        result: "No monthly milestone records found",
        details: {
          total_within_3months: expiringRecords?.length || 0,
          monthly_breakdown: {
            three_months: monthlyCategories.threeMonths.length,
            two_months: monthlyCategories.twoMonths.length,
            one_month: monthlyCategories.oneMonth.length,
            others: monthlyCategories.others.length,
          },
          method: method,
          source: isVercelCron ? "vercel-cron" : "manual",
        },
      });

      if (logError) {
        console.warn("Failed to log cron execution:", logError);
      }

      return NextResponse.json({
        success: true,
        message: "Cron job completed - no monthly milestone records found",
        timestamp: new Date().toISOString(),
        details: {
          total_expiring_records: expiringRecords?.length || 0,
          monthly_milestones: 0,
          emails_sent: 0,
          method: method,
          source: isVercelCron ? "vercel-cron" : "manual",
          breakdown: {
            three_months: monthlyCategories.threeMonths.length,
            two_months: monthlyCategories.twoMonths.length,
            one_month: monthlyCategories.oneMonth.length,
            others: monthlyCategories.others.length,
          },
        },
      });
    }

    function delay(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }

    function groupByUser(records) {
      const grouped = {};
      for (const record of records) {
        const userId = record.id_user;
        const email = record.email;
        if (!email) continue;

        if (!grouped[userId]) {
          grouped[userId] = {
            email,
            records: [],
          };
        }

        grouped[userId].records.push(record);
      }
      return grouped;
    }

    const groupedByUser = groupByUser(recordsToNotify);
    console.log("👥 Users to notify:", Object.keys(groupedByUser).length);

    let totalEmailsSent = 0;
    let totalEmailsFailed = 0;

    for (const [
      userId,
      {
        email: { email },
        records,
      },
    ] of Object.entries(groupedByUser)) {
      try {
        // Categorize this user's records
        const userCategories = categorizeRecordsByMonthFromReportDate(records, {
          oneMonth: oneMonthRange,
          twoMonths: twoMonthsRange,
          threeMonths: threeMonthsRange,
        });

        const emailHTML = generateMonthlyEmailHTML(records, userCategories);
        const emailSubject = `📅 Pengingat Bulanan: ${records.length} Dokumen Anda Akan Kedaluwarsa`;

        const emailResult = await transporter.sendMail({
          from: `"Portal Dokumen" <${process.env.SMTP_FROM}>`,
          to: email,
          subject: emailSubject,
          html: emailHTML,
        });

        totalEmailsSent++;

        await supabase.from("email_logs").insert({
          action: "cron_monthly_expiry_reminder",
          id_user: userId,
          records_count: records.length,
          emails_sent: 1,
          emails_failed: 0,
          recipients: email,
          created_at: new Date().toISOString(),
          details: {
            email_type: "monthly_reminder",
            materials: records.map((r) => r.material),
            message_id: emailResult?.messageId || null,
            monthly_breakdown: {
              three_months: userCategories.threeMonths.length,
              two_months: userCategories.twoMonths.length,
              one_month: userCategories.oneMonth.length,
            },
          },
        });

        // delay 5 detik sebelum kirim email berikutnya
        await delay(5000);
      } catch (emailError) {
        totalEmailsFailed++;

        await supabase.from("email_logs").insert({
          action: "cron_monthly_expiry_reminder",
          id_user: userId,
          records_count: records.length,
          emails_sent: 0,
          emails_failed: 1,
          recipients: email,
          created_at: new Date().toISOString(),
          details: {
            error: emailError.message,
            email_type: "monthly_reminder",
            materials: records.map((r) => r.material),
          },
        });

        console.error(
          `❌ Gagal mengirim email ke ${email}:`,
          emailError.message
        );

        // Delay juga setelah error agar tetap konsisten
        await delay(5000);
      }
    }

    // Log to cron_logs table
    const { error: cronLogError } = await supabase.from("cron_logs").insert({
      job_name: "monthly-email-reminder",
      execution_time: new Date().toISOString(),
      records_found: recordsToNotify.length,
      status: "completed",
      emails_sent: totalEmailsSent,
      emails_failed: totalEmailsFailed,
      result: `Berhasil mengirim ${totalEmailsSent} email bulanan dengan ${recordsToNotify.length} material`,
      completed_at: new Date().toISOString(),
      details: {
        total_within_3months: expiringRecords?.length || 0,
        monthly_breakdown: {
          three_months: monthlyCategories.threeMonths.length,
          two_months: monthlyCategories.twoMonths.length,
          one_month: monthlyCategories.oneMonth.length,
          others: monthlyCategories.others.length,
        },
        method: method,
        source: isVercelCron ? "vercel-cron" : "manual",
      },
    });

    if (cronLogError) {
      console.warn("Failed to log cron execution:", cronLogError);
    }

    console.log(
      `🎉 Monthly cron job completed successfully - Emails sent: ${totalEmailsSent}, Failed: ${totalEmailsFailed}`
    );

    return NextResponse.json({
      success: true,
      message: "Monthly email reminder cron job completed successfully",
      timestamp: new Date().toISOString(),
      details: {
        total_expiring_records: expiringRecords?.length || 0,
        monthly_milestone_records: recordsToNotify.length,
        emails_sent: totalEmailsSent,
        emails_failed: totalEmailsFailed,
        email_type: "monthly_reminder",
        method: method,
        source: isVercelCron ? "vercel-cron" : "manual",
        breakdown: {
          three_months: monthlyCategories.threeMonths.length,
          two_months: monthlyCategories.twoMonths.length,
          one_month: monthlyCategories.oneMonth.length,
          others: monthlyCategories.others.length,
        },
        smtp_config: {
          from: process.env.SMTP_FROM,
          user: process.env.SMTP_USER,
          host: process.env.SMTP_HOST,
        },
      },
    });
  } catch (error) {
    console.error("💥 Cron job error:", error);

    // Log error to database
    const { error: logError } = await supabase.from("cron_logs").insert({
      job_name: "monthly-email-reminder",
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
        error: "Monthly cron job failed",
        message: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Helper function to categorize records by monthly milestones from report date
function categorizeRecordsByMonthFromReportDate(records, ranges) {
  const categories = {
    threeMonths: [],
    twoMonths: [],
    oneMonth: [],
    others: [],
  };

  if (!records) return categories;

  records.forEach((record) => {
    const reportDate = new Date(record.tanggal_report);
    const expireDate = new Date(record.tanggal_expire);

    // Calculate months from report date to expiry
    const monthsFromReport = Math.floor(
      (expireDate.getTime() - reportDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
    );

    // Check if it's close to 3 months from report date (within 3 days tolerance)
    const threeMonthsFromReport = new Date(reportDate);
    threeMonthsFromReport.setMonth(reportDate.getMonth() + 3);

    const twoMonthsFromReport = new Date(reportDate);
    twoMonthsFromReport.setMonth(reportDate.getMonth() + 2);

    const oneMonthFromReport = new Date(reportDate);
    oneMonthFromReport.setMonth(reportDate.getMonth() + 1);

    // Check with 3 days tolerance
    const tolerance = 3 * 24 * 60 * 60 * 1000; // 3 days in milliseconds

    if (
      Math.abs(expireDate.getTime() - threeMonthsFromReport.getTime()) <=
      tolerance
    ) {
      categories.threeMonths.push(record);
    } else if (
      Math.abs(expireDate.getTime() - twoMonthsFromReport.getTime()) <=
      tolerance
    ) {
      categories.twoMonths.push(record);
    } else if (
      Math.abs(expireDate.getTime() - oneMonthFromReport.getTime()) <= tolerance
    ) {
      categories.oneMonth.push(record);
    } else {
      categories.others.push(record);
    }
  });

  return categories;
}

// Monthly Email HTML template
function generateMonthlyEmailHTML(records, categories) {
  // Sort records by months until expiry (most urgent first)
  const sortedRecords = records.sort((a, b) => {
    const reportDateA = new Date(a.tanggal_report);
    const expireDateA = new Date(a.tanggal_expire);
    const reportDateB = new Date(b.tanggal_report);
    const expireDateB = new Date(b.tanggal_expire);

    const monthsA = Math.ceil(
      (expireDateA.getTime() - reportDateA.getTime()) /
        (1000 * 60 * 60 * 24 * 30)
    );
    const monthsB = Math.ceil(
      (expireDateB.getTime() - reportDateB.getTime()) /
        (1000 * 60 * 60 * 24 * 30)
    );

    return monthsA - monthsB;
  });

  // Generate material cards HTML grouped by months
  const generateMaterialCards = (
    categoryRecords,
    categoryTitle,
    badgeClass
  ) => {
    if (categoryRecords.length === 0) return "";

    const cardsHTML = categoryRecords
      .map((record) => {
        const reportDate = new Date(record.tanggal_report);
        const expireDate = new Date(record.tanggal_expire);
        const monthsFromReport = Math.floor(
          (expireDate.getTime() - reportDate.getTime()) /
            (1000 * 60 * 60 * 24 * 30)
        );

        return `
         <div class="material-card">
           <div class="material-header">
             <h4>${record.material}</h4>
             <span class="badge ${badgeClass}">${monthsFromReport} bulan dari laporan</span>
           </div>
           <table class="info-table">
             <tr>
               <td>Supplier</td>
               <td>${record.supplier?.nama || "Tidak ditentukan"}</td>
             </tr>
             <tr>
               <td>Part Number</td>
               <td>${record.part_number?.nama || "Tidak ditentukan"}</td>
             </tr>
             <tr>
               <td>Part Name</td>
               <td>${record.part_name?.nama || "Tidak ditentukan"}</td>
             </tr>
             <tr>
               <td>Jenis Dokumen</td>
               <td>${record.jenis_dokumen?.nama || "Tidak ditentukan"}</td>
             </tr>
             <tr>
               <td>Tanggal Laporan</td>
               <td>${
                 record.tanggal_report
                   ? new Date(record.tanggal_report).toLocaleDateString("id-ID")
                   : "Tidak ditentukan"
               }</td>
             </tr>
             <tr>
               <td>Tanggal Kedaluwarsa</td>
               <td class="urgent">${new Date(
                 record.tanggal_expire
               ).toLocaleDateString("id-ID")}</td>
             </tr>
           </table>
         </div>
       `;
      })
      .join("");

    return `
      <div class="category-section">
        <h3 class="category-title">${categoryTitle} (${categoryRecords.length})</h3>
        ${cardsHTML}
      </div>
    `;
  };

  const oneMonthHTML = generateMaterialCards(
    categories.oneMonth,
    "📋 1 Bulan dari Tanggal Laporan",
    "critical"
  );
  const twoMonthsHTML = generateMaterialCards(
    categories.twoMonths,
    "📋 2 Bulan dari Tanggal Laporan",
    "warning"
  );
  const threeMonthsHTML = generateMaterialCards(
    categories.threeMonths,
    "📋 3 Bulan dari Tanggal Laporan",
    "alert"
  );

  return `
     <!DOCTYPE html>
     <html>
     <head>
       <meta charset="utf-8">
       <meta name="viewport" content="width=device-width, initial-scale=1.0">
       <title>Pengingat Bulanan Kedaluwarsa Dokumen - ${records.length} Material</title>
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
           background: linear-gradient(135deg, #3b82f6, #2563eb);
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
           background: linear-gradient(135deg, #eff6ff, #dbeafe); 
           border-left: 6px solid #3b82f6; 
           padding: 20px; 
           margin: 0 0 30px 0;
           border-radius: 0 8px 8px 0;
         }
         .alert strong {
           color: #1d4ed8;
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
         .category-section {
           margin: 30px 0;
         }
         .category-title {
           margin: 30px 0 20px 0; 
           color: #1f2937; 
           font-size: 22px;
           padding-bottom: 10px;
           border-bottom: 3px solid #e5e7eb;
         }
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
           padding: 16px 24px;
           display: flex;
           align-items: center;
           border-bottom: 1px solid #e5e7eb;
         }
         .material-header h4 {
           margin: 0;
           color: #1f2937;
           font-size: 22px;
           font-weight: 700;
           line-height: 1;
         }
         .material-header .badge {
           padding: 4px 12px;
           border-radius: 20px;
           font-size: 13px;
           font-weight: 600;
           white-space: nowrap;
           margin-left: auto;
           line-height: 1;
           display: inline-flex;
           align-items: center;
           justify-content: center;
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
           <h1>📅 Pengingat Bulanan Dokumen</h1>
           <p>${records.length} Dokumen Memerlukan Perhatian Berdasarkan Tanggal Laporan</p>
         </div>
         
         <div class="content">
           <div class="alert">
             <strong>📊 Pengingat Bulanan:</strong> Anda memiliki <strong>${
               records.length
             } dokumen</strong> yang mencapai milestone 1, 2, atau 3 bulan dari tanggal laporan. Mohon rencanakan pembaruan dokumen sesuai timeline.
           </div>
           
           <div class="summary">
             <h4>📊 Ringkasan Bulanan Berdasarkan Tanggal Laporan</h4>
             <div class="summary-grid">
               <div class="summary-item">
                 <div class="summary-number critical-number">${categories.oneMonth.length}</div>
                 <div>1 Bulan</div>
               </div>
               <div class="summary-item">
                 <div class="summary-number warning-number">${categories.twoMonths.length}</div>
                 <div>2 Bulan</div>
               </div>
               <div class="summary-item">
                 <div class="summary-number alert-number">${categories.threeMonths.length}</div>
                 <div>3 Bulan</div>
               </div>
             </div>
           </div>
           
           ${oneMonthHTML}
           ${twoMonthsHTML}
           ${threeMonthsHTML}
           
           <div class="actions">
             <h4>🔧 Rencana Tindakan Bulanan</h4>
             <ul>
                <li><strong>Review Berkala:</strong> Evaluasi status dokumen setiap bulan berdasarkan tanggal laporan dan prioritaskan yang sudah mencapai milestone</li>
                <li><strong>Koordinasi Supplier:</strong> Hubungi pemasok untuk meminta pembaruan dokumen yang sudah mencapai milestone dari tanggal laporan</li>
                <li><strong>Tracking System:</strong> Pantau progress pembaruan dokumen melalui sistem portal</li>
                <li><strong>Quality Assurance:</strong> Pastikan dokumen yang diperbarui memenuhi standar terbaru</li>
                <li><strong>Documentation:</strong> Update catatan material dengan sertifikat dan tanggal expire baru</li>
                <li><strong>Stakeholder Notification:</strong> Informasikan tim terkait tentang jadwal pembaruan dokumen</li>
                <li><strong>Contingency Planning:</strong> Siapkan rencana alternatif jika ada kendala pembaruan dokumen</li>
             </ul>
           </div>
         </div>
         
         <div class="footer">
           <p><strong>Sistem Manajemen Portal Dokumen</strong></p>
           <p><small>Email dikirim dari: ${
             process.env.SMTP_FROM
           } ke: wildanrizki9560@gmail.com</small></p>
           <p><small>Pengingat bulanan ini dikirim setiap hari pada pukul 23:00 UTC untuk milestone 1, 2, dan 3 bulan dari tanggal laporan. Mohon untuk tidak membalas email ini.</small></p>
         </div>
         
         <div class="timestamp">
           Dibuat pada ${new Date().toLocaleString("id-ID", {
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
           Didukung oleh Vercel Cron Jobs & Nodemailer | Sistem Portal Dokumen
         </div>
       </div>
     </body>
     </html>
   `;
}
