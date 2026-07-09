import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/server/auth";

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      username: true,
      name: true,
      role: true,
      isDisabled: true,
    },
  });

  if (!user || user.isDisabled) {
    return null;
  }

  return user;
}

export async function requireCurrentUser() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export async function requireAdminUser() {
  const user = await requireCurrentUser();
  if (user.role !== "admin") {
    notFound();
  }
  return user;
}
