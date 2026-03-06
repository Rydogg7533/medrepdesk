import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Briefcase } from 'lucide-react';

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900">
      <div className="sticky top-0 z-10 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="pt-safe-top" />
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-5 py-8">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-800">
            <Briefcase className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Privacy Policy</h1>
        </div>

        <p className="mb-6 text-xs text-gray-400 dark:text-gray-500">Last updated: March 2026</p>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6 text-gray-700 dark:text-gray-300">
          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">1. Introduction</h2>
            <p>MedRepDesk LLC ("we," "us," or "our") respects your privacy. This Privacy Policy explains how we collect, use, disclose, and protect your information when you use the MedRepDesk platform ("the Service").</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">2. Information We Collect</h2>
            <p><strong>Account Information:</strong> Name, email address, phone number, mailing address, and timezone when you register.</p>
            <p><strong>Business Data:</strong> Distributor details, facility names, surgeon names, case schedules, purchase order numbers, invoice numbers, commission amounts, and related business records you enter into the Service.</p>
            <p><strong>Payment Information:</strong> Billing details processed securely through Stripe. We do not store your full credit card number on our servers.</p>
            <p><strong>Usage Data:</strong> Device information, browser type, IP address, pages visited, and feature usage patterns collected automatically.</p>
            <p><strong>Voice Data:</strong> When you use voice features, audio is processed in real-time for transcription. We do not store audio recordings.</p>
            <p className="font-medium">MedRepDesk does not collect, store, or process Protected Health Information (PHI) as defined by HIPAA. The Service handles business and financial data only (e.g., invoice numbers, PO numbers, case schedules).</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">3. How We Use Your Information</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Provide, maintain, and improve the Service</li>
              <li>Process your subscription payments</li>
              <li>Send transactional notifications (PO reminders, follow-up alerts, digest emails)</li>
              <li>Provide customer support</li>
              <li>Analyze usage to improve features and user experience</li>
              <li>Administer the referral program</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">4. Information Sharing</h2>
            <p>We do not sell your personal information. We may share your information with:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Service Providers:</strong> Third parties that help us operate the Service (e.g., Stripe for payments, Supabase for data hosting, Vercel for hosting)</li>
              <li><strong>Legal Requirements:</strong> When required by law, court order, or governmental regulation</li>
              <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">5. Data Security</h2>
            <p>We implement industry-standard security measures including encryption in transit (TLS) and at rest, row-level security policies, and regular security reviews. However, no method of transmission or storage is 100% secure, and we cannot guarantee absolute security.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">6. Data Retention</h2>
            <p>We retain your data for as long as your account is active. Upon account deletion, your data will be permanently removed within 30 days, except where retention is required by law. You may request data export at any time.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">7. Push Notifications</h2>
            <p>With your permission, we send push notifications for PO follow-up reminders, promised date alerts, and other time-sensitive updates. You can disable notifications at any time through your browser or device settings.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">8. Cookies and Tracking</h2>
            <p>We use essential cookies for authentication and session management. We may use analytics tools to understand how the Service is used. We do not use third-party advertising trackers.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">9. Your Rights</h2>
            <p>Depending on your jurisdiction, you may have the right to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Export your data in a portable format</li>
              <li>Opt out of non-essential communications</li>
            </ul>
            <p>To exercise these rights, contact us at <a href="mailto:legal@medrepdesk.io" className="text-brand-800 dark:text-brand-400 underline">legal@medrepdesk.io</a>.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">10. Children's Privacy</h2>
            <p>The Service is not intended for individuals under 18 years of age. We do not knowingly collect information from children.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">11. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. We will notify you of material changes via email or in-app notification. Continued use of the Service after changes constitutes acceptance of the updated Policy.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">12. Contact Us</h2>
            <p>For questions about this Privacy Policy, contact us at <a href="mailto:legal@medrepdesk.io" className="text-brand-800 dark:text-brand-400 underline">legal@medrepdesk.io</a>.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
