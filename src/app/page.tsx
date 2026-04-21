import { redirect } from "next/navigation";

// The middleware already redirects unauthenticated requests to `/login`, so by
// the time a request reaches this Server Component the user is signed in.
export default function RootPage() {
  redirect("/dashboard");
}
