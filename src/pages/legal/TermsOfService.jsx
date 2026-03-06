import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Briefcase } from 'lucide-react';

export default function TermsOfService() {
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Terms of Service</h1>
        </div>

        <p className="mb-6 text-xs text-gray-400 dark:text-gray-500">Last updated: March 2026</p>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6 text-gray-700 dark:text-gray-300">
          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">1. Acceptance of Terms</h2>
            <p>By accessing or using MedRepDesk ("the Service"), operated by MedRepDesk LLC ("we," "us," or "our"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">2. Description of Service</h2>
            <p>MedRepDesk is a SaaS platform designed for medical device sales representatives to manage surgical cases, track purchase orders, monitor commissions, and streamline their sales workflow. The Service processes business data such as case schedules, invoice numbers, PO numbers, and commission amounts. MedRepDesk does not store, process, or transmit Protected Health Information (PHI) as defined by HIPAA.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">3. Account Registration</h2>
            <p>You must provide accurate, complete information when creating an account. You are responsible for maintaining the confidentiality of your login credentials and for all activities under your account. You must notify us immediately of any unauthorized use.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">4. Subscription and Payment</h2>
            <p>Access to MedRepDesk requires a paid subscription after any applicable trial period. Subscription fees are billed in advance on a recurring basis. You authorize us to charge your payment method on file. Prices may change with 30 days' notice. Refunds are handled on a case-by-case basis at our discretion.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">5. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Use the Service for any unlawful purpose</li>
              <li>Upload or transmit malicious code or content</li>
              <li>Attempt to gain unauthorized access to the Service or its systems</li>
              <li>Interfere with or disrupt the Service or servers</li>
              <li>Store Protected Health Information (PHI) in any field of the application</li>
              <li>Share your account credentials with third parties</li>
              <li>Resell or redistribute the Service without authorization</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">6. Data Ownership</h2>
            <p>You retain all rights to the data you enter into MedRepDesk. We do not claim ownership of your business data. We will not sell, share, or use your data for purposes other than providing and improving the Service. You may export or delete your data at any time.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">7. Referral Program</h2>
            <p>MedRepDesk offers a referral program. Eligible users earn 25% of the referred user's subscription fee for up to 12 months. Referral commissions are subject to the referred user maintaining an active, paid subscription. We reserve the right to modify or discontinue the referral program at any time.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">8. Intellectual Property</h2>
            <p>The Service, including its design, features, and content, is owned by MedRepDesk LLC and is protected by copyright, trademark, and other intellectual property laws. You may not copy, modify, or create derivative works of the Service.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">9. Limitation of Liability</h2>
            <p>To the maximum extent permitted by law, MedRepDesk LLC shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, or business opportunities. Our total liability shall not exceed the amount you paid for the Service in the 12 months preceding the claim.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">10. Disclaimer of Warranties</h2>
            <p>The Service is provided "as is" and "as available" without warranties of any kind, express or implied. We do not guarantee that the Service will be uninterrupted, error-free, or secure. We are not responsible for the accuracy of commission calculations, PO tracking, or any financial data entered by users.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">11. Termination</h2>
            <p>We may suspend or terminate your account if you violate these Terms. You may cancel your subscription at any time through your account settings. Upon termination, your right to use the Service ceases, but your data will remain accessible for 30 days for export purposes.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">12. Changes to Terms</h2>
            <p>We may update these Terms at any time. Material changes will be communicated via email or in-app notification at least 30 days before taking effect. Continued use of the Service after changes constitutes acceptance of the updated Terms.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">13. Governing Law</h2>
            <p>These Terms are governed by the laws of the State of Delaware, without regard to conflict of law principles. Any disputes shall be resolved in the state or federal courts located in Delaware.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">14. Contact</h2>
            <p>For questions about these Terms, contact us at <a href="mailto:legal@medrepdesk.io" className="text-brand-800 dark:text-brand-400 underline">legal@medrepdesk.io</a>.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
