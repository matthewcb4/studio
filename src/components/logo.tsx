import Image from 'next/image';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

const Logo = (props: ComponentProps<'div'>) => (
  <div {...props}>
    <Image
      src="https://raw.githubusercontent.com/matthewcb4/public_resources/481c0c57077c43a2a965c8531eb3fc1d60863e07/icon.png"
      alt="fOrganized Logo"
      width={400}
      height={400}
      className={cn('object-contain', props.className)}
      unoptimized
    />
  </div>
);

export default Logo;
