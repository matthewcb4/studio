
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
            <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
            
            <p>This Privacy Policy describes Our policies and procedures on the collection, use and disclosure of Your information when You use the Service and tells You about Your privacy rights and how the law protects You.</p>

            <h3 className="text-xl font-semibold">1. Information We Collect</h3>
            <p>We may collect several different types of information for various purposes to provide and improve our Service to you. This may include, but is not limited to, personal data such as your email address, name, and usage data.</p>

            <h3 className="text-xl font-semibold">2. Use of Your Personal Data</h3>
            <p>fRepo may use Personal Data for the following purposes: to provide and maintain our Service, to manage Your account, to contact You, and to provide You with news and general information about our services.</p>

            <h3 className="text-xl font-semibold">3. Disclosure of Your Personal Data</h3>
            <p>We may share Your personal information in specific situations, such as with service providers to monitor and analyze the use of our service, or with your consent.</p>
            
            <h3 className="text-xl font-semibold">4. Security of Your Personal Data</h3>
            <p>The security of Your Personal Data is important to Us, but remember that no method of transmission over the Internet, or method of electronic storage is 100% secure. While We strive to use commercially acceptable means to protect Your Personal Data, We cannot guarantee its absolute security.</p>

            <p className="font-bold text-center mt-8">[You must replace this placeholder text with your own Privacy Policy.]</p>
        </div>
        <div className="mt-8 text-center">
            <Link href="/" className="text-sm underline text-muted-foreground">Back to Login</Link>
        </div>
      </div>
    </div>
  );
}
