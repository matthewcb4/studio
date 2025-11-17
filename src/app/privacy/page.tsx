
import Link from 'next/link';
import Logo from '@/components/logo';

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="max-w-2xl w-full">
        <div className="flex justify-center items-center gap-2 mb-8">
            <Logo className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">fRepo</h1>
        </div>
        <div className="space-y-6 text-foreground">
            <h2 className="text-2xl font-semibold">Privacy Policy</h2>
            <p className="text-muted-foreground">Last updated: November 15, 2025</p>
            
            <p>This Privacy Policy describes the policies and procedures of **fRepo, LLC** ("fRepo", "We", "Us", or "Our") on the collection, use, and disclosure of Your information when You use the fRepo mobile application (via the Play Store) and website (the "Service"). It also informs You about Your privacy rights and how the law protects You. By using the Service, You agree to the collection and use of information in accordance with this Privacy Policy.</p>

            <h3 className="text-xl font-semibold">1. Information We Collect (Including Sensitive Data)</h3>
            <p>We collect several types of information to provide and improve Our Service, some of which may be considered **Sensitive Personal Information** related to your health and fitness.</p>

            <h4 className="text-lg font-semibold mt-4">1.1. Personal Identifiable Information (PII)</h4>
            <ul className="list-disc list-inside space-y-2">
                <li>**Account Data:** Your name, email address, and password (encrypted) when You create an account.</li>
                <li>**Contact Information:** Information you provide when contacting us for support, feedback, or inquiries.</li>
            </ul>

            <h4 className="text-lg font-semibold mt-4">1.2. Sensitive Health and Fitness Data (Explicit Consent Required)</h4>
            <p>As fRepo is a fitness tracking application, we collect the following data, which is essential to the Service's core functionality. **By entering this data, You explicitly consent to its collection and processing for the purposes listed in Section 2.**</p>
            <ul className="list-disc list-inside space-y-2">
                <li>**Body Metrics:** Weight, height, age, gender, and fitness goals.</li>
                <li>**Workout Data:** Progress tracking, workout history, exercises performed, sets, reps, load/weight lifted, time of workout, and training results.</li>
                <li>**Health App Integration Data:** If You grant permission, We may read and/or write data from Your device's native health application (e.g., Google Fit), which may include Active Calories, Steps, or Exercise Minutes.</li>
            </ul>

            <h4 className="text-lg font-semibold mt-4">1.3. Usage and Technical Data</h4>
            <ul className="list-disc list-inside space-y-2">
                <li>**Usage Data:** Information on how the Service is accessed and used, such as Your device's Internet Protocol address (IP address), operating system, app version, mobile network information, and pages/features visited.</li>
                <li>**Device Information:** Unique device identifiers, device model, and operating system.</li>
                <li>**Diagnostic Data:** Crash logs and performance data to maintain and improve the Service.</li>
            </ul>

            <h3 className="text-xl font-semibold">2. Use of Your Personal Data</h3>
            <p>fRepo may use Personal Data for the following purposes:</p>
            <ul className="list-disc list-inside space-y-2">
                <li>**To Provide and Maintain Our Service:** Including monitoring the usage and providing core fitness tracking features.</li>
                <li>**To Manage Your Account:** To manage your registration as a user of the Service.</li>
                <li>**To Contact You:** To provide You with necessary updates or informational communications related to the Service.</li>
                <li>**For Improvement and Analytics:** To analyze data, identify trends, and evaluate the performance of Our products to improve the user experience.</li>
                <li>**To Enforce Terms:** To enforce Our Terms of Service and prevent fraud or malicious activity.</li>
            </ul>

            <h3 className="text-xl font-semibold">3. Disclosure of Your Personal Data</h3>
            <p>We may share Your personal information in the following situations:</p>
            <ul className="list-disc list-inside space-y-2">
                <li>**With Service Providers:** We may share Your data with trusted third-party vendors (e.g., Firebase, analytics providers) to monitor and analyze the use of our Service, to process payments, or for data hosting.</li>
                <li>**For Business Transfers:** In connection with, or during negotiations of, any merger, sale of company assets, financing, or acquisition of all or a portion of Our business.</li>
                <li>**With Your Consent:** We may disclose Your personal information for any other purpose with Your explicit consent.</li>
                <li>**For Legal Compliance:** When we believe in good faith that disclosure is necessary to comply with a legal obligation, protect and defend the rights or property of fRepo, or prevent fraud.</li>
            </ul>
            
            <h3 className="text-xl font-semibold">4. Data Security and Retention</h3>
            <p>The security of Your Personal Data is important to Us. While We strive to use commercially acceptable means to protect Your Personal Data (including encryption), We cannot guarantee its absolute security.</p>
            <p>We will retain Your Personal Data only for as long as is necessary for the purposes set out in this Privacy Policy, or as required by law (e.g., to comply with our legal obligations, resolve disputes, and enforce our agreements).</p>

            <h3 className="text-xl font-semibold">5. Your Data Protection Rights</h3>
            <p>Depending on Your location (e.g., EU, California), You may have the following rights regarding Your Personal Data:</p>
            <ul className="list-disc list-inside space-y-2">
                <li>**Right to Access/Know:** The right to obtain confirmation regarding whether We are processing Your Personal Data and to receive a copy of that data.</li>
                <li>**Right to Correction/Rectification:** The right to have inaccurate Personal Data corrected.</li>
                <li>**Right to Deletion ("Right to be Forgotten"):** The right to request that We delete Your Personal Data, subject to certain exceptions.</li>
                <li>**Right to Opt-Out:** The right to opt out of the “sale” or “sharing” of Your Personal Data, or the processing of Your Personal Data for targeted advertising.</li>
            </ul>

            <h4 className="text-lg font-semibold mt-4">5.1. Account and Data Deletion (Google Play Requirement)</h4>
            <p>If You wish to delete Your fRepo account and all associated data, you may do so through:</p>
            <ul className="list-disc list-inside space-y-2">
                <li>**In-App:** Navigate to the "Settings" menu within the fRepo app and follow the steps for "Account Deletion."</li>
                <li>**Web Request:** Submit an account deletion request by emailing us at **matthewcb4+frepo@gmail.com**.</li>
            </ul>
            <p>We will process Your request and delete Your personal data in accordance with applicable laws.</p>
            
            <h3 className="text-xl font-semibold">6. Children's Privacy</h3>
            <p>Our Service does not address anyone under the age of 13. We do not knowingly collect personally identifiable information from anyone under the age of 13. If You are a parent or guardian and You are aware that Your child has provided Us with Personal Data, please contact Us.</p>

            <h3 className="text-xl font-semibold">7. Contact Us</h3>
            <p>If You have any questions about this Privacy Policy, You can contact us:</p>
            <ul className="list-disc list-inside space-y-2">
                <li>**By email:** **matthewcb4+frepo@gmail.com**</li>
                <li>**By mail:** **9060 Canyon St. West Des Moines, IA 50266**</li>
            </ul>
        </div>
        <div className="mt-8 text-center">
            <Link href="/" className="text-sm underline text-muted-foreground">Back to Login</Link>
        </div>
      </div>
    </div>
  );
}
