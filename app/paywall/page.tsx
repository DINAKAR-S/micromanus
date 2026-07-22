import { redirect } from "next/navigation";
import { getSession } from "@/lib/profile";
import PaywallForm from "./PaywallForm";

export default async function Paywall({
  searchParams,
}: {
  searchParams: Promise<{ paid?: string }>;
}) {
  const { user, profile } = await getSession();
  if (!user) redirect("/login");
  // Already has credits -> straight to chat.
  if (profile && profile.credits > 0) redirect("/chat");

  const justPaid = (await searchParams).paid === "1";
  return <PaywallForm justPaid={justPaid} />;
}
