import { redirect } from "next/navigation";

export default function HallRedirect() {
  redirect("/dashboard");
}
