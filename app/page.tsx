import { redirect } from "next/navigation";

export default function Home() {
  // This instantly redirects anyone visiting the root URL (/) to /login
  redirect("/login");
}