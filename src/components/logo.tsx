import Image from 'next/image';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

const Logo = (props: ComponentProps<'div'>) => (
  <div {...props}>
    <Image
      src="/logo.png"
      alt="fRepo Logo"
      width={400}
      height={400}
      className={cn('object-contain', props.className)}
      unoptimized
    />
  </div>
);

export default Logo;
