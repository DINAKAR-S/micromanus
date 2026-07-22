import { redirect } from "next/navigation";
import { getSession } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import ChatApp from "./ChatApp";

export default async function ChatPage() {
  const { user, profile } = await getSession();
  if (!user) redirect("/login");
  if (!profile || profile.credits <= 0) redirect("/paywall");

  const supabase = await createClient();
  const { data: threads } = await supabase
    .from("threads")
    .select("id, title, created_at")
    .order("created_at", { ascending: false });

  return (
    <ChatApp
      initialThreads={threads || []}
      credits={profile.credits}
      email={user.email || ""}
    />
  );
}
