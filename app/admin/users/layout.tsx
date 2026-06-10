import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

// User management is admins only.
export default async function UsersLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/api/auth/signin?callbackUrl=/admin/users");
  if (session.user.role !== "ADMIN") redirect("/admin");
  return <>{children}</>;
}
