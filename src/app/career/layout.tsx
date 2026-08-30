import { CareerLayoutShell } from "@/components/career-layout-shell";

export default function CareerLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <CareerLayoutShell>{children}</CareerLayoutShell>;
}