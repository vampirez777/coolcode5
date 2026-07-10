import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto max-w-4xl px-6 pt-32 pb-20">
        <h1 className="mb-8 text-4xl font-bold text-foreground">Terms of Service</h1>
        <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
          <p className="text-sm">Last updated: April 2026</p>
          
          <h2 className="text-xl font-semibold text-foreground">1. Acceptance of Terms</h2>
          <p>By accessing or using Halal MM's services, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.</p>

          <h2 className="text-xl font-semibold text-foreground">2. Description of Service</h2>
          <p>Halal MM provides an automated cryptocurrency escrow platform that facilitates secure transactions between users. Our service holds funds in escrow until both parties confirm completion of a deal.</p>

          <h2 className="text-xl font-semibold text-foreground">3. User Accounts</h2>
          <p>You must create an account to use our services. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.</p>

          <h2 className="text-xl font-semibold text-foreground">4. Escrow Services</h2>
          <p>When you create a deal, funds are held in our secure escrow system until both parties confirm the transaction is complete. Halal MM acts as a neutral intermediary and does not take sides in disputes.</p>

          <h2 className="text-xl font-semibold text-foreground">5. Fees</h2>
          <p>
            Halal MM charges service fees on deals to operate the escrow platform.
            Each deal has its own fee, set by an administrator and visible on the
            deal's information panel before any funds are released.
          </p>
          <p>
            <strong className="text-foreground">Fee changes on active deals.</strong>{" "}
            Administrators reserve the right to set or adjust the fee on any deal
            (including increasing the fee on an in-progress deal) when, in their sole
            judgement, the transaction profile, risk level, asset, or amount justifies
            it. Whenever a deal's fee is changed, both parties are automatically notified
            in-app and a system message is posted to the deal chat with the previous and
            new fee. By continuing the deal after such a notification, both parties accept
            the updated fee. Either party may instead cancel the deal under the normal
            cancellation rules.
          </p>

          <h2 className="text-xl font-semibold text-foreground">5b. Security holds on payouts</h2>
          <p>
            To protect the integrity of the platform, Halal MM may place a temporary
            <strong className="text-foreground"> security hold </strong> on a deal's
            payout — including after the buyer has confirmed receipt and released the
            crypto — if our team detects suspicious behaviour, mismatched information,
            potential fraud, sanctions risk, or any other indicator that warrants
            manual review.
          </p>
          <p>
            When a security hold is placed:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>The seller will not receive the funds until the hold is released.</li>
            <li>Both parties are notified and shown the reason for the hold.</li>
            <li>A support ticket is automatically opened so the parties can communicate with our team.</li>
            <li>Our team will review the deal and either release the hold or take further action as appropriate.</li>
          </ul>
          <p>
            Halal MM is not liable for delays in payout caused by a legitimate security
            review. By using the platform you acknowledge and accept that holds may
            occur and that final disposition of the funds is determined by Halal MM.
          </p>

          <h2 className="text-xl font-semibold text-foreground">6. Prohibited Activities</h2>
          <p>Users must not use the platform for illegal activities, fraud, money laundering, or any purpose that violates applicable laws. Violations may result in account suspension or termination.</p>

          <h2 className="text-xl font-semibold text-foreground">7. Dispute Resolution</h2>
          <p>In case of disputes between users, our support team will review transaction details and attempt to mediate a fair resolution. Users can open support tickets at any time.</p>

          <h2 className="text-xl font-semibold text-foreground">8. Limitation of Liability</h2>
          <p>Halal MM is not liable for losses resulting from cryptocurrency price fluctuations, network delays, or actions of other users on the platform.</p>

          <h2 className="text-xl font-semibold text-foreground">9. Changes to Terms</h2>
          <p>We reserve the right to modify these terms at any time. Continued use of the service after changes constitutes acceptance of the updated terms.</p>

          <h2 className="text-xl font-semibold text-foreground">10. Contact</h2>
          <p>For questions about these Terms of Service, please reach out to us through our Telegram or Discord communities.</p>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default TermsOfService;
