import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";

// Customer email addresses, so admins only.
export default async function SubscribersLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login?callbackUrl=/admin/subscribers");
  if (session.user.role !== "ADMIN") redirect("/admin");
  return <>{children}</>;
}
