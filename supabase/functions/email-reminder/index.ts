// supabase/functions/email-reminder/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailRecord {
  id_material_control: number
  material: string
  tanggal_report: string | null
  tanggal_expire: string
  status: boolean
  supplier?: { nama: string } | null
  part_name?: { nama: string } | null
  part_number?: { nama: string } | null
  jenis_dokumen?: { nama: string } | null
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🚀 Email reminder function started')

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Calculate date range (3 days from now)
    const today = new Date()
    const threeDaysFromNow = new Date()
    threeDaysFromNow.setDate(today.getDate() + 3)

    const todayStr = today.toISOString().split('T')[0]
    const threeDaysStr = threeDaysFromNow.toISOString().split('T')[0]

    console.log(`📅 Checking expiry dates between ${todayStr} and ${threeDaysStr}`)

    // Get records expiring in the next 3 days
    const { data: expiringRecords, error: queryError } = await supabase
      .from('material_control')
      .select(`
        id_material_control,
        material,
        tanggal_report,
        tanggal_expire,
        status,
        supplier:id_supplier(nama),
        part_name:id_part_name(nama),
        part_number:id_part_number(nama),
        jenis_dokumen:id_jenis_dokumen(nama)
      `)
      .eq('status', true) // Only active records
      .gte('tanggal_expire', todayStr)
      .lte('tanggal_expire', threeDaysStr)

    if (queryError) {
      console.error('❌ Database query error:', queryError)
      throw queryError
    }

    console.log(`📊 Found ${expiringRecords?.length || 0} expiring records`)

    if (!expiringRecords || expiringRecords.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No expiring records found',
          count: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get Resend API key
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY not found in environment variables')
    }

    // Email recipients - you can make this configurable via Supabase table
    const recipients = [
      'admin@company.com',
      'manager@company.com',
      'wildanrizki9560@gmail.com', // Your test email
    ]

    console.log(`📧 Sending emails to: ${recipients.join(', ')}`)

    // Send emails for each expiring record using Resend
    const emailPromises = (expiringRecords as EmailRecord[]).map(async (record) => {
      const daysUntilExpiry = Math.ceil(
        (new Date(record.tanggal_expire).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      )

      const emailHTML = generateEmailHTML(record, daysUntilExpiry)
      const emailSubject = `🚨 URGENT: Mill Sheet Expiring in ${daysUntilExpiry} day(s) - ${record.material}`

      return await sendEmailViaResend({
        to: recipients,
        subject: emailSubject,
        html: emailHTML,
        record: record,
        resendApiKey: resendApiKey
      })
    })

    // Wait for all emails to be sent
    const emailResults = await Promise.allSettled(emailPromises)
    
    const successful = emailResults.filter(result => result.status === 'fulfilled').length
    const failed = emailResults.filter(result => result.status === 'rejected').length

    // Log failed emails
    emailResults.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`❌ Email ${index + 1} failed:`, result.reason)
      } else {
        console.log(`✅ Email ${index + 1} sent successfully`)
      }
    })

    // Log the activity to Supabase
    try {
      await supabase
        .from('email_logs')
        .insert({
          action: 'expiry_reminder',
          records_count: expiringRecords.length,
          emails_sent: successful,
          emails_failed: failed,
          recipients: recipients,
          created_at: new Date().toISOString()
        })
      console.log('📝 Activity logged to database')
    } catch (logError) {
      console.warn('⚠️ Failed to log email activity:', logError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Email reminders processed successfully`,
        details: {
          expiring_records: expiringRecords.length,
          emails_sent: successful,
          emails_failed: failed,
          recipients: recipients.length
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('💥 Function error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

// Email HTML template generator
function generateEmailHTML(record: EmailRecord, daysUntilExpiry: number): string {
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
              <td>${record.supplier?.nama || 'Not specified'}</td>
            </tr>
            <tr>
              <td>Part Number</td>
              <td>${record.part_number?.nama || 'Not specified'}</td>
            </tr>
            <tr>
              <td>Part Name</td>
              <td>${record.part_name?.nama || 'Not specified'}</td>
            </tr>
            <tr>
              <td>Document Type</td>
              <td>${record.jenis_dokumen?.nama || 'Not specified'}</td>
            </tr>
            <tr>
              <td>Report Date</td>
              <td>${record.tanggal_report ? new Date(record.tanggal_report).toLocaleDateString('id-ID') : 'Not specified'}</td>
            </tr>
            <tr>
              <td>Expire Date</td>
              <td class="urgent">${new Date(record.tanggal_expire).toLocaleDateString('id-ID')}</td>
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
      </div>
    </body>
    </html>
  `
}

// Email sending function using Resend API
async function sendEmailViaResend(options: {
  to: string[]
  subject: string
  html: string
  record: EmailRecord
  resendApiKey: string
}) {
  const { to, subject, html, record, resendApiKey } = options

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Mill Sheet System <onboarding@resend.dev>', // Use Resend's default sender
        to: to,
        subject: subject,
        html: html,
        tags: [
          { name: 'category', value: 'mill-sheet-reminder' },
          { name: 'material', value: record.material.replace(/[^a-zA-Z0-9]/g, '_') }
        ]
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`Resend API error: ${errorData.message || 'Unknown error'}`)
    }

    const result = await response.json()
    console.log(`📧 Email sent successfully via Resend:`, result.id)
    
    return { success: true, id: result.id, to, subject }
    
  } catch (error) {
    console.error('📧 Resend email sending error:', error)
    throw error
  }
}