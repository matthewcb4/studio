import Image from 'next/image';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

const Logo = (props: ComponentProps<'div'>) => (
  <div {...props}>
    <Image
      src="https://raw.githubusercontent.com/matthewcb4/public_resources/a7992f6720a20666e8ce3c757fa0671f45af779b/fRepo_L.png"
      alt="fRepo Logo"
      width={400}
      height={400}
      className={cn('object-contain', props.className)}
      unoptimized
    />
  </div>
);

export default Logo;
