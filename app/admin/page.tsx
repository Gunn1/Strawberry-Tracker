import { redirect } from "next/navigation";

// The reservations dashboard lives on the feature/u-pick-reservations branch.
// While it's off main, /admin just points at the sales report.
export default function AdminIndex() {
  redirect("/admin/sales");
}
