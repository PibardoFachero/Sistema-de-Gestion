import { Sidebar } from '@/components/layout/Sidebar';
import { MobileNav } from '@/components/layout/MobileNav';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main id="contenido" className="flex-1 pb-20 md:pb-0 max-w-full overflow-x-hidden">
        <div className="mx-auto max-w-5xl px-4 md:px-8 py-6 md:py-10">
          {children}
        </div>
      </main>
      <MobileNav />
    </div>
  );
}
