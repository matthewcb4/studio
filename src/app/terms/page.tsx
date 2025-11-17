
import Link from 'next/link';
import Logo from '@/components/logo';

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="max-w-2xl w-full">
        <div className="flex justify-center items-center gap-2 mb-8">
            <Logo className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">fRepo</h1>
        </div>
        <div className="space-y-6 text-foreground">
            <h2 className="text-2xl font-semibold">Terms of Service</h2>
            <p className="text-muted-foreground">Last updated: November 15, 2025</p>
            
            <p>Please read these Terms of Service ("Terms", "Terms of Service") carefully before using the fRepo mobile application or website (the "Service") operated by **fRepo, LLC** ("fRepo," "Us," "We," or "Our").</p>

            <h3 className="text-xl font-semibold">1. Acknowledgment</h3>
            <p>These Terms govern Your use of the Service and form the agreement that operates between You and fRepo. Your access to and use of the Service is conditioned on Your acceptance of and compliance with these Terms. These Terms apply to all visitors, users, and others who access or use the Service.</p>

            <h3 className="text-xl font-semibold">2. User Accounts</h3>
            <p>When You create an account with Us, You must provide information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of Your account. You are responsible for safeguarding the password that You use to access the Service and for any activities or actions under Your password.</p>

            <h3 className="text-xl font-semibold">3. User Content and License Grant</h3>
            <p>Our Service allows You to post, link, store, share and otherwise make available certain information, text, graphics, videos, or other material ("Content"). You are responsible for the Content that You post to the Service, including its legality, reliability, and appropriateness.</p>
            <p>By posting Content, You grant fRepo a worldwide, non-exclusive, royalty-free, transferable license to use, modify, publicly perform, publicly display, reproduce, and distribute such Content on and through the Service for the purposes of operating, developing, and promoting the Service.</p>

            <h3 className="text-xl font-semibold">4. Prohibited Uses</h3>
            <p>You may use the Service only for lawful purposes and in accordance with the Terms. You agree not to use the Service:</p>
            <ul className="list-disc list-inside space-y-2">
                <li>In any way that violates any applicable national or international law or regulation.</li>
                <li>For the purpose of exploiting, harming, or attempting to exploit or harm minors in any way.</li>
                <li>To transmit, or procure the sending of, any advertising or promotional material, including any "junk mail," "chain letter," "spam," or any other similar solicitation.</li>
                <li>To infringe upon the rights of others, or in any way that is illegal, threatening, fraudulent, or harmful.</li>
                <li>To engage in any conduct that restricts or inhibits anyone's use or enjoyment of the Service, or which, as determined by Us, may harm fRepo or users of the Service.</li>
            </ul>

            <h3 className="text-xl font-semibold">5. Intellectual Property</h3>
            <p>The Service and its original content (excluding Content provided by You), features, and functionality are and will remain the exclusive property of fRepo and its licensors. The Service is protected by copyright, trademark, and other laws of both the United States and foreign countries.</p>

            <h3 className="text-xl font-semibold">6. Medical and Results Disclaimer</h3>
            <p>fRepo provides fitness and health information for informational purposes only. You expressly acknowledge and agree that:</p>
            <ul className="list-disc list-inside space-y-2">
                <li>**The Service is not a substitute for professional medical advice, diagnosis, or treatment.** Always consult with a qualified health professional before starting any new diet or fitness program.</li>
                <li>**fRepo does not guarantee specific results.** Results may vary due to individual differences, adherence to the program, and existing health conditions.</li>
            </ul>

            <h3 className="text-xl font-semibold">7. App Store Terms (Google Play)</h3>
            <p>If You access or download the Service from the Google Play Store, You acknowledge that Your use of the Service is also governed by the then-current Google Play Terms of Service. You agree that the App Store is a third-party beneficiary of these Terms and has the right to enforce them against You.</p>

            <h3 className="text-xl font-semibold">8. Termination</h3>
            <p>We may terminate or suspend Your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if You breach these Terms of Service.</p>
            <p>Upon termination, Your right to use the Service will immediately cease. If You wish to terminate Your account, You may simply discontinue using the Service or follow the account deletion process outlined in the Privacy Policy.</p>

            <h3 className="text-xl font-semibold">9. Limitation of Liability</h3>
            <p>To the maximum extent permitted by applicable law, in no event shall fRepo or its suppliers be liable for any special, incidental, indirect, or consequential damages whatsoever (including, but not limited to, damages for loss of profits, for loss of data or other information, for business interruption, for personal injury, for loss of privacy arising out of or in any way related to the use of or inability to use the Service).</p>

            <h3 className="text-xl font-semibold">10. Governing Law and Dispute Resolution</h3>
            <p>These Terms shall be governed and construed in accordance with the laws of **The laws of the State of Iowa, without regard to its conflict of law principles.**</p>
            <p>Any dispute arising out of or relating to these Terms will be resolved through final and binding arbitration, rather than in court, except that You may assert claims in small claims court if Your claims qualify.</p>

            <h3 className="text-xl font-semibold">11. Contact Us</h3>
            <p>If You have any questions about these Terms of Service, please contact us:</p>
            <ul className="list-disc list-inside space-y-2">
                <li>**By email:** **matthewcb4+frepo@gmail.com**</li>
            </ul>
        </div>
        <div className="mt-8 text-center">
            <Link href="/" className="text-sm underline text-muted-foreground">Back to Login</Link>
        </div>
      </div>
    </div>
  );
}
