
'use client';

import Image from 'next/image';

export function BodyOutline() {
  return (
    <div className="w-full h-[400px] flex items-center justify-center">
      <Image
        src="https://i.imgur.com/tG3aG17.png"
        alt="Body outline"
        width={300}
        height={400}
        className="object-contain h-full w-auto"
        priority
      />
    </div>
  );
}
