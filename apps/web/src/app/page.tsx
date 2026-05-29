import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function RootPage() {
  const cookie = (await cookies()).get("NEXT_LOCALE")?.value;
  const locale = cookie === "ar" ? "ar" : "en";
  redirect(`/${locale}`);
}
