import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

// Prices are admins only.
export default async function PricesLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/api/auth/signin?callbackUrl=/admin/prices");
  if (session.user.role !== "ADMIN") redirect("/admin");
  return <>{children}</>;
}
