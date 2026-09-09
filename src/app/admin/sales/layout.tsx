import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

// Sales reporting is admins only.
export default async function SalesLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login?callbackUrl=/admin/sales");
  if (session.user.role !== "ADMIN") redirect("/admin");
  return <>{children}</>;
}
