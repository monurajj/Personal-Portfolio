/**
 * Nobody gets to claim to be Monu's parent, boss or creator on the leaderboard.
 * Fans are welcome: "Monu mera baap hai" (Monu is MY father) is allowed because
 * it says "mera" / "my" and not the other way round.
 */

const CLAIMS = [
  "papa", "pappa", "baap", "bap", "baapu", "dad", "daddy", "dada", "father", "pita", "pitaji", "abbu", "abba", "mummy",
  "mom", "mother", "maa", "mata", "boss", "owner", "ceo", "creator", "founder", "malik", "bhagwan", "god",
];

/** "Monu is my son / child" is a claim too, unless the player says they are the child. */
const CHILD = ["beta", "bete", "beti", "son", "bacha", "baccha", "putra", "pota", "ladka", "ladki"];
const POSSESSIVE = ["mera", "meri", "mere", "my"];
/** The player speaking as the child: "main Monu ka beta hu", "I am Monu's son". */
const SPEAKER = ["main", "mai", "mein", "hu", "hun", "hoon", "i", "im", "am"];

/** Words that show the player is on the fan side of the relationship. */
const FAN = ["mera", "meri", "mere", "my", "main", "mai", "mein", "beta", "bete", "beti", "son", "fan", "bhakt", "chela", "banda", "student"];

const norm = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[0-9]/g, (c) => ({ "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t" })[c] ?? c)
    .split(/[^a-z]+/)
    .filter(Boolean);

/** True when the name says "Monu's papa / dad / boss…" rather than "Monu is my papa". */
export function claimsToBeMonusFamily(input: string): boolean {
  const t = norm(input);
  if (!t.some((w) => w === "monu" || w === "monuraj" || w === "monoo")) return false;
  if (t.some((w) => CHILD.includes(w)) && t.some((w) => POSSESSIVE.includes(w)) && !t.some((w) => SPEAKER.includes(w))) return true;
  if (!t.some((w) => CLAIMS.includes(w))) return false;
  return !t.some((w) => FAN.includes(w));
}

/** Names that are allowed and make Monu proud. */
export const MONU_FAN_NAMES = [
  "Monu Mera Baap Hai",
  "Main Monu Ka Beta Hu",
  "Monu Ka Sabse Bada Fan",
  "Monu Ka Chela",
  "Mera Baap Monu Hai",
];
