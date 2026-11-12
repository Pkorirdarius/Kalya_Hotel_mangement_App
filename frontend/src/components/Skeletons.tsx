/**
 * Loading skeletons that mirror the real card layouts, so content does not
 * jump when the API responds. Every skeleton respects reduced motion.
 */

import type { ReactNode } from 'react';

function Block({ className = '' }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`block animate-pulse rounded-xl bg-sand motion-reduce:animate-none ${className}`}
    />
  );
}

function LoadingLabel({ label }: { label: string }) {
  return (
    <span role="status" aria-live="polite" className="sr-only">
      {label}
    </span>
  );
}

export function RoomCardSkeleton() {
  return (
    <article className="overflow-hidden rounded-[28px] border border-line bg-white shadow-soft">
      <LoadingLabel label="Loading rooms" />
      <div className="grid lg:grid-cols-[1.08fr_1fr]">
        <div className="p-3 sm:p-4">
          <Block className="aspect-[16/11] rounded-2xl" />
          <div className="mt-3 grid grid-cols-4 gap-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Block key={index} className="aspect-[4/3] rounded-xl" />
            ))}
          </div>
        </div>
        <div className="flex flex-col p-6 sm:p-8">
          <Block className="h-3 w-24" />
          <Block className="mt-3 h-7 w-2/3" />
          <Block className="mt-4 h-3 w-full" />
          <Block className="mt-2 h-3 w-5/6" />
          <div className="mt-5 flex gap-4">
            <Block className="h-3 w-16" />
            <Block className="h-3 w-16" />
            <Block className="h-3 w-16" />
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2.5">
            {Array.from({ length: 6 }).map((_, index) => (
              <Block key={index} className="h-3 w-4/5" />
            ))}
          </div>
          <div className="mt-auto flex items-end justify-between gap-3 border-t border-line pt-5">
            <div className="w-1/2">
              <Block className="h-3 w-12" />
              <Block className="mt-2 h-7 w-32" />
            </div>
            <div className="flex gap-2">
              <Block className="h-9 w-28 rounded-full" />
              <Block className="h-9 w-20 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

export function OfferCardSkeleton() {
  return (
    <article className="flex flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-soft">
      <LoadingLabel label="Loading offers" />
      <Block className="aspect-[16/10] rounded-none" />
      <div className="flex flex-1 flex-col p-5">
        <Block className="h-2.5 w-20" />
        <Block className="mt-3 h-6 w-5/6" />
        <Block className="mt-3 h-3 w-full" />
        <Block className="mt-2 h-3 w-4/5" />
        <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
          <Block className="h-3 w-24" />
          <Block className="h-3 w-16" />
        </div>
      </div>
    </article>
  );
}

export function MenuListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-4">
      <LoadingLabel label="Loading menu" />
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-start justify-between gap-4 border-b border-line pb-4">
          <div className="flex-1">
            <Block className="h-5 w-2/3" />
            <Block className="mt-2 h-3 w-11/12" />
          </div>
          <Block className="h-5 w-16" />
        </div>
      ))}
    </div>
  );
}

export function FacilityCardSkeleton() {
  return (
    <article className="overflow-hidden rounded-3xl border border-line bg-white shadow-soft">
      <LoadingLabel label="Loading facilities" />
      <Block className="aspect-[4/3] rounded-none" />
      <div className="p-6">
        <Block className="h-3 w-20" />
        <Block className="mt-3 h-6 w-2/3" />
        <Block className="mt-3 h-3 w-full" />
        <Block className="mt-2 h-3 w-5/6" />
        <Block className="mt-5 h-9 w-32 rounded-full" />
      </div>
    </article>
  );
}

export function SkeletonGrid({
  count = 3,
  children,
}: {
  count?: number;
  children: (index: number) => ReactNode;
}) {
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index}>{children(index)}</div>
      ))}
    </div>
  );
}
