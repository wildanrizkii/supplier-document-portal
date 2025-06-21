// pages/admin/test-cron.js atau app/admin/test-cron/page.js
"use client";
import { useState } from "react";

export default function TestCronPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const testEmailCron = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/cron/daily-email-reminder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
      } else {
        setError(data);
      }
    } catch (err) {
      setError({ message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const testStatusAPI = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/cron/status");
      const data = await response.json();

      if (response.ok) {
        setResult(data);
      } else {
        setError(data);
      }
    } catch (err) {
      setError({ message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          🧪 Cron Job Testing Dashboard Enhanced
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Test Email Cron */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              📧 Test Email Cron
            </h2>
            <p className="text-gray-600 mb-4">
              Manually trigger the daily email reminder cron job
            </p>
            <button
              onClick={testEmailCron}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              {loading ? "⏳ Running..." : "🚀 Test Email Cron"}
            </button>
          </div>

          {/* Test Status API */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              📊 Test Status API
            </h2>
            <p className="text-gray-600 mb-4">
              Check current status and expiring records
            </p>
            <button
              onClick={testStatusAPI}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              {loading ? "⏳ Loading..." : "📈 Check Status"}
            </button>
          </div>
        </div>

        {/* Results */}
        {result && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h3 className="text-xl font-semibold text-green-800 mb-4">
              ✅ Success Result
            </h3>
            <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-sm">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}

        {/* Errors */}
        {error && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h3 className="text-xl font-semibold text-red-800 mb-4">
              ❌ Error Result
            </h3>
            <pre className="bg-red-50 p-4 rounded-lg overflow-auto text-sm border border-red-200">
              {JSON.stringify(error, null, 2)}
            </pre>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-3">
            📋 Testing Instructions
          </h3>
          <div className="space-y-2 text-blue-700">
            <p>
              1. <strong>Test Status API first</strong> to see how many records
              are expiring
            </p>
            <p>
              2. <strong>Test Email Cron</strong> to see if all emails are sent
            </p>
            <p>
              3. <strong>Compare the numbers</strong> between status and email
              results
            </p>
            <p>
              4. <strong>Check the console/network tab</strong> for additional
              debug info
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
