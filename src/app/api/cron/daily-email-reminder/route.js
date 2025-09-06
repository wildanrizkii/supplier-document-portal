// app/api/cron/daily-email-reminder/route.js
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

  // Test endpoint untuk simulasi data expire
  if (body.test === "simulate_expiry_data") {
    try {
      // Ambil sample data untuk simulasi
      const { data: sampleData, error: sampleError } = await supabase
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
        .eq("status", true)
        .limit(5);

      if (sampleError) {
        return NextResponse.json({
          success: false,
          error: "Failed to fetch sample data",
          details: sampleError.message,
        });
      }

      // Simulasi categorize berdasarkan bulan
      const today = new Date();

      const oneMonth = new Date(today);
      oneMonth.setMonth(today.getMonth() + 1);

      const twoMonths = new Date(today);
      twoMonths.setMonth(today.getMonth() + 2);

      const threeMonths = new Date(today);
      threeMonths.setMonth(today.getMonth() + 3);

      const simulatedData = sampleData?.map((item, index) => {
        let expireDate;
        let category;

        if (index % 3 === 0) {
          expireDate = oneMonth;
          category = "1_month";
        } else if (index % 3 === 1) {
          expireDate = twoMonths;
          category = "2_months";
        } else {
          expireDate = threeMonths;
          category = "3_months";
        }

        return {
          ...item,
          tanggal_expire: expireDate.toISOString().split("T")[0],
          simulated_category: category,
          months_until_expiry: Math.ceil(
            (expireDate.getTime() - today.getTime()) /
              (1000 * 60 * 60 * 24 * 30)
          ),
        };
      });

      return NextResponse.json({
        success: true,
        message: "Simulated expiry data generated",
        timestamp: new Date().toISOString(),
        data: simulatedData,
        summary: {
          total_records: simulatedData?.length || 0,
          categories: {
            one_month:
              simulatedData?.filter((d) => d.simulated_category === "1_month")
                .length || 0,
            two_months:
              simulatedData?.filter((d) => d.simulated_category === "2_months")
                .length || 0,
            three_months:
              simulatedData?.filter((d) => d.simulated_category === "3_months")
                .length || 0,
          },
        },
      });
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: "Simulation failed",
          message: error.message,
        },
        { status: 500 }
      );
    }
  }

  // Test endpoint untuk preview email template
  if (body.test === "preview_email_template") {
    try {
      // Generate sample data untuk template
      const sampleRecords = [
        {
          material: "Sample Material 1",
          supplier: { nama: "PT Sample Supplier 1" },
          part_number: { nama: "PN-001" },
          part_name: { nama: "Sample Part 1" },
          jenis_dokumen: { nama: "Certificate" },
          tanggal_report: new Date().toISOString(),
          tanggal_expire: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000
          ).toISOString(), // 1 month
        },
        {
          material: "Sample Material 2",
          supplier: { nama: "PT Sample Supplier 2" },
          part_number: { nama: "PN-002" },
          part_name: { nama: "Sample Part 2" },
          jenis_dokumen: { nama: "Test Report" },
          tanggal_report: new Date().toISOString(),
          tanggal_expire: new Date(
            Date.now() + 60 * 24 * 60 * 60 * 1000
          ).toISOString(), // 2 months
        },
        {
          material: "Sample Material 3",
          supplier: { nama: "PT Sample Supplier 3" },
          part_number: { nama: "PN-003" },
          part_name: { nama: "Sample Part 3" },
          jenis_dokumen: { nama: "Inspection Report" },
          tanggal_report: new Date().toISOString(),
          tanggal_expire: new Date(
            Date.now() + 90 * 24 * 60 * 60 * 1000
          ).toISOString(), // 3 months
        },
      ];

      const sampleCategories = {
        oneMonth: [sampleRecords[0]],
        twoMonths: [sampleRecords[1]],
        threeMonths: [sampleRecords[2]],
      };

      const emailHTML = generateMonthlyEmailHTML(
        sampleRecords,
        sampleCategories
      );

      return NextResponse.json({
        success: true,
        message: "Email template preview generated",
        timestamp: new Date().toISOString(),
        preview_data: {
          total_records: sampleRecords.length,
          categories: sampleCategories,
        },
        html_content: emailHTML,
      });
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: "Template preview failed",
          message: error.message,
        },
        { status: 500 }
      );
    }
  }

  // NEW: Test endpoint untuk validate milestone logic
  if (body.test === "validate_milestones") {
    try {
      debugMonthlyMilestones();

      // Ambil sample data
      const { data: sampleData, error: sampleError } = await supabase
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
        .eq("status", true)
        .limit(10);

      if (sampleError) {
        return NextResponse.json({
          success: false,
          error: "Failed to fetch sample data",
          details: sampleError.message,
        });
      }

      const categories = await testMilestoneLogic(sampleData || []);
      const { shouldSend, milestoneRecords, breakdown } =
        shouldSendMonthlyEmail(categories);

      return NextResponse.json({
        success: true,
        message: "Milestone validation completed",
        shouldSendEmail: shouldSend,
        milestoneRecords: milestoneRecords.length,
        breakdown: breakdown,
        categories: categories,
      });
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: "Milestone validation failed",
          message: error.message,
        },
        { status: 500 }
      );
    }
  }

  return handleCronRequest(request, "POST");
}

// UPDATED: Helper functions untuk milestone calculation
function calculateMonthlyMilestones() {
  const today = new Date();

  // Tepat 1 bulan dari sekarang (toleransi ±1 hari untuk akurasi)
  const oneMonthFromNow = new Date();
  oneMonthFromNow.setMonth(today.getMonth() + 1);
  const oneMonthRange = {
    start: new Date(oneMonthFromNow.getTime() - 1 * 24 * 60 * 60 * 1000), // 1 hari sebelum
    end: new Date(oneMonthFromNow.getTime() + 1 * 24 * 60 * 60 * 1000), // 1 hari setelah
  };

  // Tepat 2 bulan dari sekarang
  const twoMonthsFromNow = new Date();
  twoMonthsFromNow.setMonth(today.getMonth() + 2);
  const twoMonthsRange = {
    start: new Date(twoMonthsFromNow.getTime() - 1 * 24 * 60 * 60 * 1000),
    end: new Date(twoMonthsFromNow.getTime() + 1 * 24 * 60 * 60 * 1000),
  };

  // Tepat 3 bulan dari sekarang
  const threeMonthsFromNow = new Date();
  threeMonthsFromNow.setMonth(today.getMonth() + 3);
  const threeMonthsRange = {
    start: new Date(threeMonthsFromNow.getTime() - 1 * 24 * 60 * 60 * 1000),
    end: new Date(threeMonthsFromNow.getTime() + 1 * 24 * 60 * 60 * 1000),
  };

  return { oneMonthRange, twoMonthsRange, threeMonthsRange };
}

function isExactlyNMonthsAway(expireDate, monthsAway) {
  const today = new Date();
  const targetDate = new Date();
  targetDate.setMonth(today.getMonth() + monthsAway);

  // Toleransi ±1 hari untuk akurasi
  const diffInDays = Math.abs(
    (expireDate.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  return diffInDays <= 1;
}

function categorizeRecordsByExactMonths(records) {
  const categories = {
    threeMonths: [],
    twoMonths: [],
    oneMonth: [],
    others: [],
  };

  if (!records) return categories;

  records.forEach((record) => {
    const expireDate = new Date(record.tanggal_expire);

    if (isExactlyNMonthsAway(expireDate, 1)) {
      categories.oneMonth.push(record);
    } else if (isExactlyNMonthsAway(expireDate, 2)) {
      categories.twoMonths.push(record);
    } else if (isExactlyNMonthsAway(expireDate, 3)) {
      categories.threeMonths.push(record);
    } else {
      categories.others.push(record);
    }
  });

  return categories;
}

function shouldSendMonthlyEmail(categories) {
  const milestoneRecords = [
    ...categories.threeMonths,
    ...categories.twoMonths,
    ...categories.oneMonth,
  ];

  const shouldSend = milestoneRecords.length > 0;

  console.log(
    `📧 Should send email: ${shouldSend} (${milestoneRecords.length} milestone records)`
  );

  return {
    shouldSend,
    milestoneRecords,
    breakdown: {
      oneMonth: categories.oneMonth.length,
      twoMonths: categories.twoMonths.length,
      threeMonths: categories.threeMonths.length,
      others: categories.others.length,
    },
  };
}

function debugMonthlyMilestones() {
  const today = new Date();
  console.log("🔍 Debug Monthly Milestones:");
  console.log("Today:", today.toISOString().split("T")[0]);

  const { oneMonthRange, twoMonthsRange, threeMonthsRange } =
    calculateMonthlyMilestones();

  console.log("1 Month Range:", {
    start: oneMonthRange.start.toISOString().split("T")[0],
    end: oneMonthRange.end.toISOString().split("T")[0],
  });

  console.log("2 Months Range:", {
    start: twoMonthsRange.start.toISOString().split("T")[0],
    end: twoMonthsRange.end.toISOString().split("T")[0],
  });

  console.log("3 Months Range:", {
    start: threeMonthsRange.start.toISOString().split("T")[0],
    end: threeMonthsRange.end.toISOString().split("T")[0],
  });
}

async function testMilestoneLogic(sampleRecords) {
  console.log("🧪 Testing Milestone Logic:");

  const categories = categorizeRecordsByExactMonths(sampleRecords);

  console.log("Milestone Results:", {
    oneMonth: categories.oneMonth.length,
    twoMonths: categories.twoMonths.length,
    threeMonths: categories.threeMonths.length,
    others: categories.others.length,
  });

  // Detail per kategori
  categories.oneMonth.forEach((record) => {
    console.log(
      `📅 1 Month: ${record.material} - expires ${record.tanggal_expire}`
    );
  });

  categories.twoMonths.forEach((record) => {
    console.log(
      `📅 2 Months: ${record.material} - expires ${record.tanggal_expire}`
    );
  });

  categories.threeMonths.forEach((record) => {
    console.log(
      `📅 3 Months: ${record.material} - expires ${record.tanggal_expire}`
    );
  });

  return categories;
}

// UPDATED: Shared function untuk handle cron logic dengan logika baru
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

    // UPDATED: Calculate precise monthly milestones instead of wide ranges
    const { oneMonthRange, twoMonthsRange, threeMonthsRange } =
      calculateMonthlyMilestones();

    // Debug milestone ranges
    console.log("📅 Milestone Ranges:");
    console.log("1 Month:", {
      start: oneMonthRange.start.toISOString().split("T")[0],
      end: oneMonthRange.end.toISOString().split("T")[0],
    });
    console.log("2 Months:", {
      start: twoMonthsRange.start.toISOString().split("T")[0],
      end: twoMonthsRange.end.toISOString().split("T")[0],
    });
    console.log("3 Months:", {
      start: threeMonthsRange.start.toISOString().split("T")[0],
      end: threeMonthsRange.end.toISOString().split("T")[0],
    });

    // Get records for broader range to analyze (but we'll filter precisely later)
    const todayStr = dayjs().format("YYYY-MM-DD");
    const threeMonthsMaxStr = dayjs()
      .add(3, "month")
      .add(5, "day")
      .format("YYYY-MM-DD"); // Buffer untuk akurasi

    console.log(
      `📅 Querying expiry dates between ${todayStr} and ${threeMonthsMaxStr}`
    );

    // Get records expiring within the next ~3 months (with buffer)
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
      `📊 Found ${expiringRecords?.length || 0} records within query range`
    );

    // UPDATED: Use exact monthly milestone categorization
    const monthlyCategories = categorizeRecordsByExactMonths(expiringRecords);

    console.log("📊 Exact Monthly Milestone breakdown:", {
      threeMonths: monthlyCategories.threeMonths.length,
      twoMonths: monthlyCategories.twoMonths.length,
      oneMonth: monthlyCategories.oneMonth.length,
      others: monthlyCategories.others.length,
    });

    // UPDATED: Check if we should send emails (only for exact milestones)
    const { shouldSend, milestoneRecords, breakdown } =
      shouldSendMonthlyEmail(monthlyCategories);

    if (!shouldSend) {
      console.log(
        "✅ No exact monthly milestone records found - cron job completed successfully"
      );

      // Log to database
      const { error: logError } = await supabase.from("cron_logs").insert({
        job_name: "monthly-email-reminder",
        execution_time: new Date().toISOString(),
        records_found: expiringRecords?.length || 0,
        status: "completed",
        emails_sent: 0,
        result: "No exact monthly milestone records found",
        details: {
          total_queried: expiringRecords?.length || 0,
          exact_milestones: 0,
          monthly_breakdown: breakdown,
          method: method,
          source: isVercelCron ? "vercel-cron" : "manual",
        },
      });

      if (logError) {
        console.warn("Failed to log cron execution:", logError);
      }

      return NextResponse.json({
        success: true,
        message:
          "Cron job completed - no exact monthly milestone records found",
        timestamp: new Date().toISOString(),
        details: {
          total_queried_records: expiringRecords?.length || 0,
          exact_milestone_records: 0,
          emails_sent: 0,
          method: method,
          source: isVercelCron ? "vercel-cron" : "manual",
          breakdown: breakdown,
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

    const groupedByUser = groupByUser(milestoneRecords);
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
        // Categorize this user's milestone records
        const userCategories = categorizeRecordsByExactMonths(records);

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
            email_type: "monthly_reminder_milestone",
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
            email_type: "monthly_reminder_milestone",
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
      records_found: milestoneRecords.length,
      status: "completed",
      emails_sent: totalEmailsSent,
      emails_failed: totalEmailsFailed,
      result: `Berhasil mengirim ${totalEmailsSent} email untuk ${milestoneRecords.length} milestone materials`,
      completed_at: new Date().toISOString(),
      details: {
        total_queried: expiringRecords?.length || 0,
        exact_milestone_records: milestoneRecords.length,
        monthly_breakdown: breakdown,
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
        total_queried_records: expiringRecords?.length || 0,
        exact_milestone_records: milestoneRecords.length,
        emails_sent: totalEmailsSent,
        emails_failed: totalEmailsFailed,
        email_type: "monthly_reminder_milestone",
        method: method,
        source: isVercelCron ? "vercel-cron" : "manual",
        breakdown: breakdown,
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

// REMOVED: Old categorizeRecordsByMonth function - replaced with categorizeRecordsByExactMonths

// Monthly Email HTML template (unchanged)
function generateMonthlyEmailHTML(records, categories) {
  // Sort records by months until expiry (most urgent first)
  const sortedRecords = records.sort((a, b) => {
    const monthsA = Math.ceil(
      (new Date(a.tanggal_expire).getTime() - new Date().getTime()) /
        (1000 * 60 * 60 * 24 * 30)
    );
    const monthsB = Math.ceil(
      (new Date(b.tanggal_expire).getTime() - new Date().getTime()) /
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
        const today = new Date();
        const expireDate = new Date(record.tanggal_expire);

        let monthsUntilExpiry =
          (expireDate.getFullYear() - today.getFullYear()) * 12 +
          (expireDate.getMonth() - today.getMonth());

        // Koreksi kalau hari expire < hari sekarang
        if (expireDate.getDate() < today.getDate()) {
          monthsUntilExpiry -= 1;
        }

        console.log(monthsUntilExpiry);
        return `
<div class="material-card" style="
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
">
  <!-- Header Section -->
  <div class="card-header" style="
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 16px;
    flex-wrap: wrap;
  ">
    <h3 style="
      font-size: 16px;
      font-weight: bold;
      margin: 0;
      flex: 1;
      min-width: 200px;
      line-height: 1.3;
    ">
      ${record.material}
    </h3>
    <span class="badge badge-${badgeClass}" style="
      display: inline-block;
      padding: 6px 12px;
      background-color: ${badgeClass === "critical" ? "#dc2626" : badgeClass === "warning" ? "#f59e0b" : "#3b82f6"};
      color: #ffffff;
      font-size: 14px;
      font-weight: bold;
      border-radius: 12px;
      text-align: center;
      white-space: nowrap;
      flex-shrink: 0;
    ">
      ${monthsUntilExpiry} bulan lagi
    </span>
  </div>

  <!-- Info Table -->
  <table class="info-table" style="
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
  ">
    <tr>
      <td style="
        padding: 8px 0;
        font-weight: 500;
        width: 30%;
        vertical-align: top;
        border-bottom: 1px solid #f0f0f0;
      ">Supplier</td>
      <td style="
        padding: 8px 0;
        padding-left: 16px;
        border-bottom: 1px solid #f0f0f0;
        word-break: break-word;
      ">${record.supplier?.nama || "Tidak ditentukan"}</td>
    </tr>
    <tr>
      <td style="
        padding: 8px 0;
        font-weight: 500;
        width: 30%;
        vertical-align: top;
        border-bottom: 1px solid #f0f0f0;
      ">Part Number</td>
      <td style="
        padding: 8px 0;
        padding-left: 16px;
        border-bottom: 1px solid #f0f0f0;
        word-break: break-word;
      ">${record.part_number?.nama || "Tidak ditentukan"}</td>
    </tr>
    <tr>
      <td style="
        padding: 8px 0;
        font-weight: 500;
        width: 30%;
        vertical-align: top;
        border-bottom: 1px solid #f0f0f0;
      ">Part Name</td>
      <td style="
        padding: 8px 0;
        padding-left: 16px;
        border-bottom: 1px solid #f0f0f0;
        word-break: break-word;
      ">${record.part_name?.nama || "Tidak ditentukan"}</td>
    </tr>
    <tr>
      <td style="
        padding: 8px 0;
        font-weight: 500;
        width: 30%;
        vertical-align: top;
        border-bottom: 1px solid #f0f0f0;
      ">Jenis Dokumen</td>
      <td style="
        padding: 8px 0;
        padding-left: 16px;
        border-bottom: 1px solid #f0f0f0;
        word-break: break-word;
      ">${record.jenis_dokumen?.nama || "Tidak ditentukan"}</td>
    </tr>
    <tr>
      <td style="
        padding: 8px 0;
        font-weight: 500;
        width: 30%;
        vertical-align: top;
        border-bottom: 1px solid #f0f0f0;
      ">Tanggal Laporan</td>
      <td style="
        padding: 8px 0;
        padding-left: 16px;
        border-bottom: 1px solid #f0f0f0;
        word-break: break-word;
      ">${
        record.tanggal_report
          ? new Date(record.tanggal_report).toLocaleDateString("id-ID")
          : "Tidak ditentukan"
      }</td>
    </tr>
    <tr>
      <td style="
        padding: 8px 0;
        font-weight: 500;
        width: 30%;
        vertical-align: top;
      ">Tanggal Kedaluwarsa</td>
      <td class="urgent" style="
        padding: 8px 0;
        padding-left: 16px;
        color: #dc3545;
        font-weight: bold;
        word-break: break-word;
      ">${new Date(record.tanggal_expire).toLocaleDateString("id-ID")}</td>
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
    "📋 Expire dalam 1 Bulan",
    "critical"
  );
  const twoMonthsHTML = generateMaterialCards(
    categories.twoMonths,
    "📋 Expire dalam 2 Bulan",
    "warning"
  );
  const threeMonthsHTML = generateMaterialCards(
    categories.threeMonths,
    "📋 Expire dalam 3 Bulan",
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
           <h1>📅 Pengingat Milestone Dokumen</h1>
           <p>${records.length} Dokumen Mencapai Milestone Bulanan</p>
         </div>
         
         <div class="content">
           <div class="alert">
             <strong>🎯 Milestone Alert:</strong> Anda memiliki <strong>${
               records.length
             } dokumen</strong> yang tepat mencapai milestone 1, 2, atau 3 bulan sebelum expire. Ini adalah pengingat bulanan yang dikirim hanya pada tanggal milestone.
           </div>
           
           <div class="summary">
             <h4>📊 Breakdown Milestone Bulanan</h4>
             <div class="summary-grid">
               <div class="summary-item">
                 <div class="summary-number critical-number">${categories.oneMonth.length}</div>
                 <div>Tepat 1 Bulan</div>
               </div>
               <div class="summary-item">
                 <div class="summary-number warning-number">${categories.twoMonths.length}</div>
                 <div>Tepat 2 Bulan</div>
               </div>
               <div class="summary-item">
                 <div class="summary-number alert-number">${categories.threeMonths.length}</div>
                 <div>Tepat 3 Bulan</div>
               </div>
             </div>
           </div>
           
           ${oneMonthHTML}
           ${twoMonthsHTML}
           ${threeMonthsHTML}
           
           <div class="actions">
             <h4>🔧 Action Plan Berdasarkan Milestone</h4>
             <ul>
                <li><strong>1 Bulan (URGENT):</strong> Segera hubungi supplier dan mulai proses renewal dokumen</li>
                <li><strong>2 Bulan (PRIORITAS):</strong> Mulai koordinasi dengan tim dan persiapan dokumen renewal</li>
                <li><strong>3 Bulan (PERENCANAAN):</strong> Evaluasi dokumen dan buat jadwal renewal dengan supplier</li>
                <li><strong>Tracking:</strong> Monitor progress melalui sistem dan set reminder berkala</li>
                <li><strong>Quality Check:</strong> Pastikan dokumen renewal memenuhi standar terbaru</li>
                <li><strong>Documentation:</strong> Update sistem dengan dokumen dan tanggal expire baru</li>
                <li><strong>Stakeholder Notification:</strong> Informasikan tim terkait tentang status renewal</li>
             </ul>
           </div>
         </div>
         
         <div class="footer">
           <p><strong>Sistem Manajemen Portal Dokumen</strong></p>
           <p><small>Email dikirim dari: ${process.env.SMTP_FROM}
           <p><small>Email ini dikirim HANYA ketika dokumen mencapai milestone tepat 1, 2, atau 3 bulan sebelum expire. Mohon untuk tidak membalas email ini.</small></p>
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
           Didukung oleh Vercel Cron Jobs & Nodemailer | Sistem Portal Dokumen - Milestone Alert System
         </div>
       </div>
     </body>
     </html>
   `;
}
