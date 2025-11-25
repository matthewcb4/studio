
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// This component is a temporary redirect to the correct settings page.
// The build was failing due to two pages resolving to the same "/settings" path.
export default function SettingsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);

  return null; // Render nothing while redirecting
}
