import { createFileRoute } from "@tanstack/react-router";
import { HouseApp } from "@/components/house/HouseApp";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <HouseApp />;
}
