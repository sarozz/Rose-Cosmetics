import { redirect } from "next/navigation";

export default function ProfitReportRedirect() {
  redirect("/reports?section=profit");
}
