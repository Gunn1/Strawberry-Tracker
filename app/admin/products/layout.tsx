import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

// Products & prices are admins only.
export default async function ProductsLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login?callbackUrl=/admin/products");
  if (session.user.role !== "ADMIN") redirect("/admin");
  return <>{children}</>;
}
