/**
 * Abusive-language check for player-entered names (drone game pilot names).
 *
 * Shared by the client form, the server action and the leaderboard, so a name
 * is judged the same way everywhere. Covers English and Hindi/Hinglish abuse,
 * and the usual evasions: capitals, accents, leetspeak (s3x, f*ck), stretched
 * letters (fuuuck), spacing (s e x) and separators (l.u.n.d, chu-tiya).
 *
 * Two kinds of entry, to avoid flagging innocent names:
 * - WORDS match whole words only ("ass" is blocked, "Hassan" and "class" are not).
 * - FRAGMENTS are distinctive enough to block anywhere, even glued to other text.
 */

/** Whole-word matches. Short or ambiguous terms live here. */
const WORDS = [
  // English
  "sex", "sexy", "sexx", "porn", "porno", "nude", "nudes", "naked", "boob", "boobs", "tit", "tits", "titty", "titties",
  "ass", "arse", "asshole", "dick", "dicks", "cock", "cocks", "cunt", "cunts", "pussy", "slut", "sluts", "whore",
  "bitch", "bitches", "bastard", "fag", "fags", "faggot", "rape", "raped", "rapist", "penis", "vagina", "anal",
  "cum", "jizz", "horny", "milf", "dildo", "wank", "wanker", "twat", "prick", "hoe", "hoes", "shit", "shitty",
  "bullshit", "damnit", "nazi", "hitler", "retard", "retarded", "suck", "sucker", "blowjob", "handjob", "orgasm",
  "boner", "xxx", "nsfw", "fap", "thot", "stfu", "wtf", "kys",
  // Hindi / Hinglish
  "lund", "lun", "lauda", "lavda", "lawda", "loda", "lode", "lodu", "laude", "lavde", "lawde", "lowda",
  "chut", "choot", "chootiya", "chutiya", "chutiye", "chutia", "chutiyapa", "chodu", "chod", "chodna", "chudai",
  "chudna", "chudi", "chuda", "bhosdi", "bhosda", "bhosdike", "bhosadike", "bhosdiwale", "bsdk", "bkl",
  "mkc", "bhenchod", "behenchod", "bhanchod", "benchod", "bhenchood", "madarchod", "maderchod", "madarchood",
  "madarjat", "betichod", "gandu", "gaandu", "gaand", "gand", "gandi", "randi", "raand", "rand", "randwa",
  "harami", "haramkhor", "haramzada", "haramzade", "kutta", "kutte", "kutiya", "kamina", "kamine", "kaminey",
  "tatti", "jhant", "jhaant", "jhantu", "bhadwa", "bhadwe", "bhadva", "hijra", "chinal", "suar", "ullu",
] as const;

/**
 * Abbreviations that are abuse on their own ("bc", "mc") but also ordinary initials:
 * blocked only when they are the entire name, so "MC Stan fan" is fine.
 */
const STANDALONE = new Set(["bc", "mc", "mkc", "bkl"]);

/** Real words and names that happen to contain a fragment below; never flagged. */
const ALLOW = new Set([
  "scunthorpe", "shital", "kshitij", "shitij", "lunden", "lundgren", "lundberg", "lundqvist", "lundin", "lundy",
  "therapist", "grape", "drape", "skyrapers",
]);

/** Substring matches: unmistakable even when joined to other letters (e.g. "xXfuckerXx", "lundfakir"). */
const FRAGMENTS = [
  "fuck", "fuk", "phuck", "motherf", "shit", "sexy", "bitch", "pussy", "porn", "nigg", "dildo", "cunt", "whore", "slut",
  "rapist", "blowjob", "asshole", "faggot",
  "lund", "lauda", "lavda", "lawda", "chutiy", "chutia", "chootiy", "bhosd", "bhosad", "bhench", "behench",
  "bhanch", "benchod", "madarch", "maderch", "betich", "chudai", "gaandu", "haramz", "haramkh",
  "bhadw", "jhant",
] as const;


/** The built-in lists, for the admin's word-filter page. */
export const BUILT_IN = {
  words: [...WORDS] as string[],
  fragments: [...FRAGMENTS] as string[],
  standalone: [...STANDALONE],
};

/**
 * Admin edits, stored in Firestore and applied on top of the built-in lists.
 * - `block`: extra words; `anywhere` also catches them inside other text.
 * - `allow`: words that are never flagged, including built-in ones switched off.
 */
export type WordFilterConfig = {
  block: Array<{ word: string; anywhere: boolean }>;
  allow: string[];
};

export const EMPTY_FILTER: WordFilterConfig = { block: [], allow: [] };

/** Look-alike characters used to dodge filters. */
const LEET: Record<string, string> = {
  "0": "o", "1": "i", "!": "i", "|": "i", "3": "e", "4": "a", "@": "a", "5": "s", "$": "s", "7": "t", "+": "t",
  "8": "b", "9": "g", "2": "z", "*": "u",
};

/** Repeated letters squeezed to one: "fuuuuck" → "fuck", "boobs" → "bobs". */
const squeeze = (s: string) => s.replace(/(.)\1+/g, "$1");

function normalise(input: string) {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .toLowerCase()
    .replace(/[0-9!|@$*+]/g, (c) => LEET[c] ?? c);
}

/**
 * Admin-entered words become plain lowercase letters, the form the filter compares.
 * No look-alike mapping here: an admin typing "word!" means "word", not "wordi".
 */
export const cleanWord = (w: string) =>
  w
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");

type Compiled = {
  words: Set<string>;
  squeezedWords: Set<string>;
  fragments: string[];
  standalone: Set<string>;
  allow: Set<string>;
};

function compile(config: WordFilterConfig): Compiled {
  const allowed = new Set(config.allow.map(cleanWord).filter(Boolean));
  const words = new Set<string>([...WORDS, ...config.block.map((b) => cleanWord(b.word))].filter((w) => w && !allowed.has(w)));
  const fragments = [...FRAGMENTS, ...config.block.filter((b) => b.anywhere).map((b) => cleanWord(b.word))]
    .filter((f) => f && !allowed.has(f))
    .map(squeeze);
  return {
    words,
    squeezedWords: new Set([...words].map(squeeze)),
    fragments,
    standalone: new Set([...STANDALONE].filter((w) => !allowed.has(w))),
    allow: new Set([...ALLOW, ...allowed]),
  };
}

const builtIn = compile(EMPTY_FILTER);
const cache = new Map<string, Compiled>();

function compiled(config?: WordFilterConfig) {
  if (!config || (config.block.length === 0 && config.allow.length === 0)) return builtIn;
  const key = JSON.stringify(config);
  let c = cache.get(key);
  if (!c) {
    c = compile(config);
    if (cache.size > 20) cache.clear();
    cache.set(key, c);
  }
  return c;
}

/** The first word or fragment that flags the text, or null when it is clean. */
export function findProfanity(input: string, config?: WordFilterConfig): string | null {
  if (!input) return null;
  const c = compiled(config);
  const isBad = (token: string) => {
    if (c.words.has(token)) return token;
    // Stretched spellings only: "asss" is caught, but plain "as" never matches "ass".
    const sq = squeeze(token);
    if (sq !== token) for (const w of c.words) if (squeeze(w) === sq) return w;
    return null;
  };
  const text = normalise(input);

  // 1. Whole words, split on anything that isn't a letter. Known innocent words are set aside.
  const all = text.split(/[^a-z]+/).filter(Boolean);
  if (all.length === 1 && c.standalone.has(all[0])) return all[0];
  const tokens = all.filter((t) => !c.allow.has(t));
  for (const t of tokens) {
    const hit = isBad(t);
    if (hit) return hit;
  }

  // 2. Letters spelled out one by one ("s e x", "l.u.n.d"): join runs of single letters.
  let run = "";
  for (const t of [...tokens, ""]) {
    if (t.length === 1) {
      run += t;
      continue;
    }
    if (run.length >= 2) {
      const hit = isBad(run);
      if (hit) return hit;
    }
    run = "";
  }

  // 3. Distinctive fragments anywhere, with separators removed and letters squeezed.
  const joined = squeeze(tokens.join(""));
  return c.fragments.find((f) => joined.includes(f)) ?? null;
}

/** True when the text contains abusive language. Pass the admin's config to apply their edits. */
export function containsProfanity(input: string, config?: WordFilterConfig): boolean {
  return findProfanity(input, config) !== null;
}

/** Message shown when a name is rejected. */
export const PROFANITY_MESSAGE = "🙅 Please choose a different name. That one isn't allowed on the leaderboard.";
