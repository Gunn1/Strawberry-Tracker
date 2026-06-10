import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import AdminShell from "./AdminShell";

// Gate the whole /admin area behind staff sign-in, and wrap it in the admin
// navbar/chrome.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/api/auth/signin?callbackUrl=/admin");
  return (
    <AdminShell email={session.user.email} role={session.user.role}>
      {children}
    </AdminShell>
  );
}
