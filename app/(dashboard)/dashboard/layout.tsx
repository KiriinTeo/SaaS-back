'use client';

export default function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="w-full min-h-[calc(100dvh-64px)] text-slate-100">
      {children}
    </div>
  );
}
