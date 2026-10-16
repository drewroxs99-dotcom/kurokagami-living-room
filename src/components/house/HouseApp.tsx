import { Chrome } from "./Chrome";
import { Stage } from "./Stage";

export function HouseApp() {
  return (
    <main className="relative h-dvh w-full overflow-hidden bg-lacquer text-paper">
      <Stage />
      <Chrome />
    </main>
  );
}
