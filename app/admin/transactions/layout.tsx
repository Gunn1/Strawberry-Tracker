import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

// Editing transactions is admins only.
export default async function TransactionsLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login?callbackUrl=/admin/transactions");
  if (session.user.role !== "ADMIN") redirect("/admin");
  return <>{children}</>;
}
