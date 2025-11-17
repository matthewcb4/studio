
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
            <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
            
            <p>Please read these terms of service carefully before using Our Service.</p>

            <h3 className="text-xl font-semibold">1. Acknowledgment</h3>
            <p>These are the Terms of Service governing the use of this Service and the agreement that operates between You and fRepo. These Terms of Service set out the rights and obligations of all users regarding the use of the Service.</p>
            <p>Your access to and use of the Service is conditioned on Your acceptance of and compliance with these Terms of Service. These Terms of Service apply to all visitors, users and others who access or use the Service.</p>

            <h3 className="text-xl font-semibold">2. User Accounts</h3>
            <p>When You create an account with Us, You must provide Us information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of Your account on Our Service.</p>

            <h3 className="text-xl font-semibold">3. Content</h3>
            <p>Our Service allows You to post Content. You are responsible for the Content that You post to the Service, including its legality, reliability, and appropriateness. By posting Content to the Service, You grant Us the right and license to use, modify, publicly perform, publicly display, reproduce, and distribute such Content on and through the Service.</p>

            <h3 className="text-xl font-semibold">4. Intellectual Property</h3>
            <p>The Service and its original content (excluding Content provided by You or other users), features and functionality are and will remain the exclusive property of fRepo and its licensors.</p>
            
            <h3 className="text-xl font-semibold">5. Limitation of Liability</h3>
            <p>To the maximum extent permitted by applicable law, in no event shall fRepo or its suppliers be liable for any special, incidental, indirect, or consequential damages whatsoever (including, but not limited to, damages for loss of profits, for loss of data or other information, for business interruption, for personal injury, for loss of privacy arising out of or in any way related to the use of or inability to use the Service).</p>

            <p className="font-bold text-center mt-8">[You must replace this placeholder text with your own Terms of Service.]</p>
        </div>
        <div className="mt-8 text-center">
            <Link href="/" className="text-sm underline text-muted-foreground">Back to Login</Link>
        </div>
      </div>
    </div>
  );
}
