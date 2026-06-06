import { redirect } from "next/navigation";

export default function BookPage() {
  redirect("/contact?source=book-retired");
}
