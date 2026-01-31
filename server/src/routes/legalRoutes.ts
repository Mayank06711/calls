import express, { Request, Response } from "express";
import { rateLimit } from "express-rate-limit";

const router = express.Router();

// Rate limiter for legal pages (30 requests per 15 minutes)
const legalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: "Too many requests, please try again later.",
});

router.use(legalLimiter);

router.get("/terms", (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    data: {
      title: "Terms and Conditions",
      lastUpdated: "2026-01-29",
      html: `
        <h1>Terms and Conditions</h1>
        <p><strong>Last updated:</strong> January 29, 2026</p>

        <h2>1. Acceptance of Terms</h2>
        <p>By accessing or using the Know Your Style ("KYS") platform, you agree to be bound by these Terms and Conditions. If you do not agree with any part of these terms, you must not use the platform.</p>

        <h2>2. Description of Service</h2>
        <p>KYS is a fashion and styling consultation platform that connects users with expert stylists through video calls, real-time chat, and personalized recommendations. The platform offers subscription-based access to expert consultations and styling features.</p>

        <h2>3. User Accounts</h2>
        <p>You must provide accurate and complete information when creating an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must notify us immediately of any unauthorized use.</p>

        <h2>4. Subscription Plans</h2>
        <p>KYS offers multiple subscription tiers (Free, Silver, Gold, Platinum) with varying levels of access to expert consultations and features. Subscription fees are billed according to the plan selected. You may upgrade, downgrade, or cancel your subscription at any time. Refunds are subject to our refund policy.</p>

        <h2>5. Video Consultations</h2>
        <p>Video calls with experts are subject to availability and subscription limits. Calls are limited to 30 minutes per session. Expert consultations are for informational and styling guidance purposes only. Call recordings are not permitted without explicit consent from all parties.</p>

        <h2>6. User Conduct</h2>
        <p>You agree not to: use the platform for any unlawful purpose; harass, abuse, or harm other users or experts; share inappropriate or offensive content; attempt to access another user's account; interfere with the platform's operation or security.</p>

        <h2>7. Intellectual Property</h2>
        <p>All content, features, and functionality of the platform are owned by KYS and are protected by copyright, trademark, and other intellectual property laws. You may not reproduce, distribute, or create derivative works without our express written permission.</p>

        <h2>8. Privacy</h2>
        <p>Your use of the platform is also governed by our <a href="/privacy">Privacy Policy</a>, which describes how we collect, use, and protect your personal information.</p>

        <h2>9. Limitation of Liability</h2>
        <p>KYS is provided "as is" without warranties of any kind. We are not liable for any indirect, incidental, or consequential damages arising from your use of the platform. Our total liability shall not exceed the amount paid by you in the preceding 12 months.</p>

        <h2>10. Termination</h2>
        <p>We reserve the right to suspend or terminate your account at any time for violation of these terms or for any other reason at our discretion. Upon termination, your right to use the platform ceases immediately.</p>

        <h2>11. Changes to Terms</h2>
        <p>We may update these terms from time to time. Continued use of the platform after changes constitutes acceptance of the updated terms. We will notify users of significant changes via email or platform notification.</p>

        <h2>12. Contact</h2>
        <p>For questions about these Terms and Conditions, contact us at <strong>support@knowyourstyle.com</strong>.</p>
      `,
    },
  });
});

router.get("/privacy", (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    data: {
      title: "Privacy Policy",
      lastUpdated: "2026-01-29",
      html: `
        <h1>Privacy Policy</h1>
        <p><strong>Last updated:</strong> January 29, 2026</p>

        <h2>1. Information We Collect</h2>
        <p><strong>Account Information:</strong> Name, email address, phone number, and profile details provided during registration.</p>
        <p><strong>Usage Data:</strong> Information about how you use the platform, including pages visited, features used, session duration, and interaction patterns.</p>
        <p><strong>Device Information:</strong> Browser type, operating system, device identifiers, and IP address.</p>
        <p><strong>Communication Data:</strong> Chat messages, call metadata (duration, participants), and feedback submissions.</p>

        <h2>2. How We Use Your Information</h2>
        <p>We use collected information to: provide and maintain the platform; match you with appropriate style experts; process subscriptions and payments; send notifications and updates; improve our services and user experience; ensure platform security and prevent fraud; comply with legal obligations.</p>

        <h2>3. Data Sharing</h2>
        <p>We do not sell your personal information. We may share data with: expert stylists (limited profile information for consultations); payment processors (for subscription billing); cloud service providers (for hosting and storage); law enforcement (when required by law).</p>

        <h2>4. Video Call Privacy</h2>
        <p>Video calls use WebRTC with DTLS-SRTP encryption for secure peer-to-peer communication. Call content is not recorded or stored by the platform. Call metadata (duration, timestamp, participants) is stored for billing and service improvement.</p>

        <h2>5. Cookies and Tracking</h2>
        <p>We use cookies and similar technologies for: authentication and session management; remembering user preferences; analytics and performance monitoring. You can control cookie settings through your browser preferences.</p>

        <h2>6. Data Security</h2>
        <p>We implement industry-standard security measures including: encrypted data transmission (TLS/SSL); secure token-based authentication (JWT); session management with automatic expiration; rate limiting and input sanitization; regular security audits.</p>

        <h2>7. Data Retention</h2>
        <p>We retain your data for as long as your account is active or as needed to provide services. You may request deletion of your account and associated data at any time. Some data may be retained for legal or compliance purposes.</p>

        <h2>8. Your Rights</h2>
        <p>You have the right to: access your personal information; correct inaccurate data; request deletion of your data; export your data in a portable format; opt out of non-essential communications; withdraw consent for data processing.</p>

        <h2>9. Children's Privacy</h2>
        <p>The platform is not intended for users under the age of 13. We do not knowingly collect information from children. If we discover that a child has provided personal information, we will delete it promptly.</p>

        <h2>10. Changes to This Policy</h2>
        <p>We may update this Privacy Policy from time to time. We will notify users of significant changes via email or platform notification. Continued use after changes constitutes acceptance.</p>

        <h2>11. Contact</h2>
        <p>For privacy-related inquiries, contact us at <strong>privacy@knowyourstyle.com</strong>.</p>
      `,
    },
  });
});

export default router;
