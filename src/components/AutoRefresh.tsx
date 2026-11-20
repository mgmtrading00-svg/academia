'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Vuelve a pedir la página cada pocos segundos mientras haya trabajo en marcha. */
export default function AutoRefresh({ active, every = 4000 }: { active: boolean; every?: number }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => router.refresh(), every);
    return () => clearInterval(t);
  }, [active, every, router]);
  return null;
}
