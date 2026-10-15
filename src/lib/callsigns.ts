import { containsProfanity } from "./profanity";

/**
 * Silly pilot callsigns, offered when a typed name is refused by the filter.
 * Built from a mood + a thing so there are hundreds of combinations.
 */
const MOODS = [
  "Captain", "Turbo", "Sleepy", "Chaotic", "Crispy", "Majestic", "Wobbly", "Sneaky", "Dizzy", "Spicy",
  "Fluffy", "Legendary", "Suspicious", "Unhinged", "Caffeinated", "Gigachad", "Lowkey", "Confused", "Dramatic", "Humble",
];

const THINGS = [
  "Samosa", "Propeller", "Pigeon", "Noodle", "Turbulence", "Chai", "Biryani", "Potato", "Jalebi", "Rocket",
  "Banana", "Crash Test", "Cloud", "Parrot", "Pakora", "Waffle", "Drone Dad", "Wi-Fi", "Panda", "Meteor",
];

const pick = <T,>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)];

/** A random callsign that is never itself flagged by the name filter, and never the one just shown. */
export function funnyCallsign(avoid?: string): string {
  for (let i = 0; i < 20; i++) {
    const name = `${pick(MOODS)} ${pick(THINGS)}`;
    if (name !== avoid && !containsProfanity(name)) return name;
  }
  return "Captain Samosa";
}

/** Cheeky lines shown while "air traffic control" pretends to deliberate. */
export const ATC_LINES = [
  "📡 Calling air traffic control…",
  "🤫 ATC is whispering to the other ATC…",
  "🐦 Consulting the council of pigeons…",
  "👩 Checking with your mom…",
  "⚖️ Running it past the leaderboard's lawyers…",
];

/** The verdicts, shown after the fake suspense. */
export const ATC_VERDICTS = [
  "🚫 Request denied. Not in this airspace.",
  "😂 ATC laughed. Then said no.",
  "😵 The leaderboard took one look and fainted.",
  "💅 Bold choice. Still no.",
  "🤷 We were not sure. Now we are. It's a no.",
];

export { pick };
