import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

// Managing locations is admins only.
export default async function LocationsLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login?callbackUrl=/admin/locations");
  if (session.user.role !== "ADMIN") redirect("/admin");
  return <>{children}</>;
}
