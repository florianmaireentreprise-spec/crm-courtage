import { redirect } from "next/navigation";

export const metadata = { title: "Emails urgents — CRM Courtage" };

export default function UrgentEmailsPage() {
  redirect("/emails?tab=actions");
}
