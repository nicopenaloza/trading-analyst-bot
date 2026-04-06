import Dashboard from "@/components/Dashboard";

// This is a Server Component — just renders the client dashboard shell.
// All data fetching happens client-side so the page hydrates immediately.
export default function Page() {
  return <Dashboard />;
}
