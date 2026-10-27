import HomePage from "@/components/HomePage";
import { getHomeStats } from "@/lib/home-stats";

// The home page itself is a client component (src/components/HomePage.tsx);
// this server wrapper only hands it the hero numbers read at build time.
export default async function Home() {
  return <HomePage initialStats={await getHomeStats()} />;
}
