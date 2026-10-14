import type { Metadata } from "next";
import { FlySim } from "@/components/fly/FlySim";

export const metadata: Metadata = {
  title: "Fly the drone",
  description: "A small browser drone simulator. Steer with the arrow keys and fly through every gate.",
};

export default function FlyPage() {
  return <FlySim />;
}
