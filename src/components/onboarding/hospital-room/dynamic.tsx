'use client';

import dynamic from 'next/dynamic';

export const DynamicHospitalRoom = dynamic(
  () => import('./Room').then((m) => m.Room),
  {
    ssr: false,
    loading: () => <div className="absolute inset-0 bg-[#f4f5f3]" />,
  }
);
