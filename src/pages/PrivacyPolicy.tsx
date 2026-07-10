import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto max-w-4xl px-6 pt-32 pb-20">
        <h1 className="mb-8 text-4xl font-bold text-foreground">Privacy Policy</h1>
        <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
          <p className="text-sm">Last updated: April 2026</p>

          <h2 className="text-xl font-semibold text-foreground">1. Information We Collect</h2>
          <p>We collect information you provide when creating an account, including your email address and display name. We also collect transaction data related to deals made through our platform.</p>

          <h2 className="text-xl font-semibold text-foreground">2. How We Use Your Information</h2>
          <p>Your information is used to provide and improve our escrow services, process transactions, communicate important updates, and ensure platform security.</p>

          <h2 className="text-xl font-semibold text-foreground">3. Data Security</h2>
          <p>We implement industry-standard security measures to protect your personal information and cryptocurrency transactions. All data is encrypted in transit and at rest.</p>

          <h2 className="text-xl font-semibold text-foreground">4. Third-Party Services</h2>
          <p>We may use third-party services for analytics, payment processing, and infrastructure. These services have their own privacy policies governing data use.</p>

          <h2 className="text-xl font-semibold text-foreground">5. Cookies</h2>
          <p>We use cookies and similar technologies to maintain your session, remember preferences, and improve your experience on our platform.</p>

          <h2 className="text-xl font-semibold text-foreground">6. Data Retention</h2>
          <p>We retain your account and transaction data for as long as your account is active. You may request deletion of your account and associated data at any time.</p>

          <h2 className="text-xl font-semibold text-foreground">7. Your Rights</h2>
          <p>You have the right to access, correct, or delete your personal data. You can update your profile information at any time through your account settings.</p>

          <h2 className="text-xl font-semibold text-foreground">8. Changes to This Policy</h2>
          <p>We may update this privacy policy from time to time. We will notify you of significant changes through our platform or via email.</p>

          <h2 className="text-xl font-semibold text-foreground">9. Contact</h2>
          <p>For privacy-related inquiries, please reach out to us through our Telegram or Discord communities.</p>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
