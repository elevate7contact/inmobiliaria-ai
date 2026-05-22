import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function AuthRedirectPage() {
  const user = await currentUser();
  if (!user) redirect("/login");

  const role = (user.publicMetadata?.role as string) ?? "SEARCHER";

  if (role === "REALTOR") redirect("/dashboard");
  if (role === "ADMIN") redirect("/admin");
  redirect("/search");
}
