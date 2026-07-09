import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/server/auth";
import { hasAnyUsers } from "@/server/services/users";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    redirect("/dashboard");
  }

  if (!(await hasAnyUsers())) {
    redirect("/setup");
  }

  redirect("/login");
}
