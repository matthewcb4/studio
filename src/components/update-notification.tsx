
'use client';

import { Button } from '@/components/ui/button';
import { ToastAction } from '@/components/ui/toast';
import { useToast } from '@/hooks/use-toast';

interface UpdateNotificationProps {
  wb: any;
}

export function UpdateNotification({ wb }: UpdateNotificationProps) {
  const { dismiss } = useToast();

  const handleUpdate = () => {
    // Tell the new service worker to take over.
    wb.messageSkipWaiting();
    // Refresh the page to load the new version.
    window.location.reload();
    dismiss();
  };

  return (
    <ToastAction asChild altText="Reload to update">
      <Button onClick={handleUpdate}>Reload</Button>
    </ToastAction>
  );
}
