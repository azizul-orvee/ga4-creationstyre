// Placeholder shown while the first fetch is in flight. It mirrors the real
// layout so nothing jumps around once the numbers arrive.
export default function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-3 sm:gap-4" aria-busy="true">
      <span className="sr-only">Loading your enquiry figures…</span>
      <Block className="h-48" />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Block key={i} className="h-[132px]" />
        ))}
      </div>
      <Block className="h-[360px]" />
    </div>
  );
}

function Block({ className }: { className: string }) {
  return <div className={`card rounded-2xl border animate-pulse opacity-60 ${className}`} aria-hidden="true" />;
}
