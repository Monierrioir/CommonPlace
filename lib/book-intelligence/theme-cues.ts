// DEVELOPMENT PROTOTYPE — Book Intelligence research. Not used by the app.
import type { ThemeKey } from "@/lib/enrichment/theme-vocabulary";

/**
 * Cue lexicon v1: for each controlled theme, the everyday English words that name the
 * theme itself or its most direct expressions. Written from the theme definitions
 * before any text was analysed and not tuned to any book. A trailing * matches any
 * ending ("sloth*" → sloth, slothful). Multi-word cues match exact word sequences.
 *
 * A cue signals that a text talks about something often; it is not proof the book is
 * "about" the theme. Scores therefore always compare against a background corpus.
 */
export const THEME_CUE_VERSION = 1;

export const THEME_CUES = {
  friendship: ["friend", "friends", "friendship*", "friendly", "comrade*", "companion*"],
  family: [
    "family", "families", "father", "fathers", "mother", "mothers", "son", "sons", "daughter*", "brother", "brothers",
    "sister", "sisters", "parent*", "child", "children", "relatives", "grandfather*", "grandmother*", "nephew*", "niece*",
  ],
  love: ["love", "loved", "loves", "loving", "lover*", "beloved", "passion*", "adore*", "affection*", "darling", "kiss*", "sweetheart"],
  marriage: [
    "marry", "married", "marrying", "marriage*", "wedding*", "wife", "wives", "husband*", "bride*", "betroth*", "engaged",
    "engagement", "widow*",
  ],
  identity: ["identity", "identities", "self-knowledge", "individuality", "personality", "personalities", "true self", "sense of self"],
  coming_of_age: ["childhood", "boyhood", "girlhood", "youth", "youthful", "adolescen*", "grow up", "grew up", "growing up", "upbringing"],
  belonging: ["belong", "belonged", "belonging", "belongs", "home", "homes", "homesick*", "native land", "hearth", "acceptance"],
  loneliness: ["lonely", "loneliness", "alone", "solitude", "solitary", "isolated", "isolation", "forsaken", "abandon*"],
  alienation: ["alienat*", "estrang*", "stranger", "strangers", "outsider*", "outcast*", "detached", "detachment"],
  memory: [
    "memory", "memories", "remember*", "recollect*", "reminisc*", "recall*", "forgot", "forgotten", "forget", "forgets",
    "forgetting", "nostalgi*", "bygone",
  ],
  ambition: ["ambition*", "ambitious", "career*", "success", "successful", "aspir*", "striving", "advancement", "promotion", "fame", "glory"],
  obsession: ["obsess*", "fixation", "mania", "fixed idea", "compuls*", "fanatic*", "monomania*"],
  madness: ["mad", "madness", "madman", "madmen", "insane", "insanity", "lunatic*", "delirium", "delirious", "frenzy", "deranged", "raving"],
  idleness: [
    "idle", "idleness", "idler", "idlers", "idly", "lazy", "laziness", "lazily", "sloth*", "indolen*", "inert", "inertia",
    "apathy", "apathetic*", "torpor", "torpid", "lethargy", "lethargic", "sluggish*", "inaction", "inactive", "inactivity",
    "languor", "languid*", "listless*", "loaf", "loafing", "loafer*", "doing nothing", "do nothing",
  ],
  aging: ["old age", "aging", "ageing", "elderly", "decrepit*", "senile", "wrinkle*", "grey hair", "gray hair"],
  morality: ["moral", "morals", "morality", "immoral*", "conscience", "virtue*", "virtuous", "vice", "vices", "ethic*", "honest", "honesty", "dishonest*"],
  good_and_evil: ["evil", "evils", "wicked*", "sin", "sins", "sinful", "sinner*", "demon*", "satan", "devil*"],
  guilt: ["guilt", "guilty", "remorse*", "shame", "ashamed", "shameful", "self-reproach", "reproach*", "confess*"],
  redemption: ["redeem*", "redemption", "atone*", "forgive*", "forgiven", "forgiveness", "repent*", "salvation", "resurrection", "reborn", "regenerat*"],
  justice: ["justice", "injustice", "unjust", "law", "laws", "lawful", "court", "courts", "judge*", "trial", "trials", "punish*", "verdict*", "prison*", "convict*", "magistrate*", "lawyer*"],
  crime: ["crime*", "criminal*", "murder*", "kill", "killed", "killing", "thief", "thieves", "steal*", "stole", "stolen", "robbery", "robber*", "rob", "robbed", "swindl*", "fraud*", "police", "arrest*"],
  violence: ["violen*", "blow", "blows", "beaten", "beating", "blood", "bloody", "wound", "wounds", "wounded", "fight*", "fought", "brutal*", "cruel", "cruelty", "assault*"],
  revenge: ["reveng*", "vengean*", "avenge*", "retribution", "vindictive*", "grudge*", "spite*"],
  betrayal: ["betray*", "treacher*", "traitor*", "deceiv*", "deceit*", "deception", "faithless*", "unfaithful*", "infidelity"],
  sacrifice: ["sacrific*", "self-sacrifice", "selfless*", "martyr*", "renounc*", "renunciation"],
  duty: ["duty", "duties", "dutiful", "obligation*", "responsib*", "honour", "honor", "honourable", "honorable"],
  courage: ["courage*", "brave", "bravely", "bravery", "bold", "boldly", "boldness", "hero", "heroes", "heroic*", "heroism", "fearless*", "daring", "valour", "valor", "coward*"],
  free_will: [
    "free will", "freewill", "choice*", "choose*", "chose", "chosen", "decide*", "decision*", "decisive*", "indecision",
    "will-power", "willpower", "resolve", "resolution",
  ],
  fate: ["fate", "fates", "fated", "destiny", "destined", "doom*", "predestin*", "inevitabl*", "prophec*", "omen*", "fatal*"],
  religion: [
    "god", "gods", "church*", "pray*", "faith", "religio*", "holy", "saint*", "priest*", "icon", "icons", "sacred",
    "heaven*", "bible", "gospel*", "christ*", "monk", "monks", "monaster*", "worship*", "divine", "superstiti*",
  ],
  philosophy: ["philosoph*", "meaning of life", "existence", "truth", "metaphysic*", "thinker*", "contemplat*"],
  humanity: ["humanity", "human nature", "mankind", "humankind", "human being", "human beings", "humane", "inhuman*"],
  power: ["power", "powers", "powerful", "powerless*", "authority", "authorities", "domina*", "command*", "control*", "obey*", "obedien*", "submissi*"],
  politics: ["politic*", "government*", "minister*", "revolution*", "reform*", "parliament*", "election*", "elected"],
  war: ["war", "wars", "warfare", "battle*", "soldier*", "army", "armies", "military", "regiment*", "enemy", "enemies", "campaign*", "cannon*", "siege*"],
  oppression: ["oppress*", "tyran*", "despot*", "slave", "slaves", "slavery", "persecut*", "subjugat*", "enslav*", "yoke"],
  freedom: ["free", "freedom*", "liberty", "liberties", "liberat*", "independen*", "emancipat*"],
  class: [
    "class", "classes", "aristocra*", "noble", "nobles", "nobility", "nobleman", "noblemen", "gentry", "gentleman", "gentlemen",
    "peasant*", "serf", "serfs", "serfdom", "landowner*", "landlord*", "servant*", "footman", "footmen", "lackey*", "rank",
    "ranks", "bourgeois*", "merchant*",
  ],
  poverty: ["poor", "poverty", "beggar*", "beg", "begging", "destitut*", "penniless", "hunger", "hungry", "starv*", "rags", "ragged", "pauper*", "needy"],
  wealth: [
    "wealth*", "rich", "riches", "money", "fortune", "fortunes", "rouble*", "ruble*", "gold", "income*", "rent", "rents",
    "debt*", "estate", "estates", "property", "properties", "profit*", "capital", "inherit*", "greed*", "avarice", "miser",
    "misers", "miserly", "shilling*", "guinea*", "dollar*", "franc", "francs",
  ],
  society: ["society", "social", "fashionable", "salon*", "civiliz*", "civilis*", "culture", "manners", "etiquette", "propriety", "gossip*", "respectab*"],
  colonialism: ["colony", "colonies", "colonial*", "colonis*", "coloniz*", "empire*", "imperial*", "conquest*", "conquer*"],
  prejudice: ["prejudic*", "bigot*", "racis*", "discriminat*", "intoleran*", "xenophob*"],
  gender: ["manly", "womanly", "femin*", "mascul*", "womanhood", "manhood", "weaker sex", "fair sex"],
  education: ["school*", "educat*", "learn*", "lesson*", "teacher*", "tutor*", "student*", "study", "studies", "studied", "studying", "universit*", "scholar*", "knowledge", "professor*", "college*"],
  work: [
    "work", "worked", "working", "works", "labour*", "labor*", "toil*", "job", "jobs", "employment", "office", "offices",
    "official", "officials", "clerk*", "bureau*", "business*", "occupation*", "task", "tasks", "busy", "industrious",
    "diligen*", "activity", "active",
  ],
  nature: [
    "nature", "forest*", "woods", "tree", "trees", "field", "fields", "meadow*", "river*", "garden*", "flower*", "bird",
    "birds", "sky", "skies", "sun", "sunshine", "mountain*", "hill", "hills", "valley*", "grass", "landscape*", "countryside",
  ],
  ecology: ["ecolog*", "environment*", "pollut*", "climate", "conservation", "ecosystem*", "wildlife", "deforest*", "drought*", "erosion"],
  survival: ["surviv*", "perish*", "struggle for existence", "stay alive", "peril*"],
  technology: ["machine*", "engine*", "technolog*", "invent*", "science", "scientific", "scientist*", "railway*", "telegraph*", "steam", "factory", "factories", "electric*"],
  magic: ["magic*", "wizard*", "witch*", "sorcer*", "enchant*", "fairy", "fairies", "fairy-tale*", "supernatural", "ghost*", "legend*", "fable*", "miracle*"],
  grief: ["grief", "griev*", "mourn*", "bereave*", "loss", "losses", "lament*", "sorrow*", "weep*", "wept", "tears"],
  death: ["death*", "dead", "die", "died", "dies", "dying", "graves", "graveyard*", "funeral*", "corpse*", "coffin*", "mortal*", "suicide*", "buried", "burial"],
  suffering: ["suffer*", "pain", "pains", "painful*", "agony", "agonies", "anguish", "torment*", "misery", "miserable", "despair*", "wretched*", "affliction*", "hopeless*"],
  fear: ["fear", "fears", "feared", "fearing", "fearful*", "afraid", "terror*", "terrified", "dread*", "fright*", "horror*", "alarm*", "anxiety", "anxious*", "panic*", "scared", "timid*", "apprehens*"],
  trauma: ["trauma*", "shock", "shocked", "shocking", "nightmare*", "scar", "scars", "scarred", "haunted", "haunting", "shattered"],
  hope: ["hope", "hopes", "hoped", "hoping", "hopeful", "hopefully", "optimis*", "expectation*"],
  journeys: ["journey*", "travel*", "voyage*", "trip", "trips", "abroad", "departure*", "wander*", "pilgrim*", "expedition*", "sail", "sailed", "sailing"],
  art: [
    "artist*", "artistic", "painting", "paintings", "painter*", "music*", "poetry", "poet", "poets", "poem*", "sculpt*",
    "song*", "sing", "sings", "singing", "sang", "sung", "singer*", "piano*", "opera*", "theatre*", "theater*", "creativ*", "composer*",
  ],
} as const satisfies Record<ThemeKey, readonly string[]>;

export type CueMatcher = {
  /** Exact single words → [theme, cue] pairs. */
  exact: Map<string, { theme: ThemeKey; cue: string }[]>;
  prefixes: { prefix: string; theme: ThemeKey; cue: string }[];
  phrases: { words: string[]; theme: ThemeKey; cue: string }[];
};

function buildMatcher(): CueMatcher {
  const seen = new Map<string, ThemeKey>();
  const exact: CueMatcher["exact"] = new Map();
  const prefixes: CueMatcher["prefixes"] = [];
  const phrases: CueMatcher["phrases"] = [];
  for (const [theme, cues] of Object.entries(THEME_CUES) as [ThemeKey, readonly string[]][]) {
    for (const cue of cues) {
      const owner = seen.get(cue);
      if (owner) throw new Error(`Theme cue "${cue}" is listed under both ${owner} and ${theme}`);
      seen.set(cue, theme);
      if (cue.includes(" ")) phrases.push({ words: cue.split(" "), theme, cue });
      else if (cue.endsWith("*")) prefixes.push({ prefix: cue.slice(0, -1), theme, cue });
      else exact.set(cue, [...(exact.get(cue) ?? []), { theme, cue }]);
    }
  }
  return { exact, prefixes, phrases };
}

export const CUE_MATCHER = buildMatcher();

const memo = new Map<string, { theme: ThemeKey; cue: string }[]>();

/** Every [theme, cue] a single word triggers. */
export function cuesForWord(word: string): { theme: ThemeKey; cue: string }[] {
  const cached = memo.get(word);
  if (cached) return cached;
  const hits = [...(CUE_MATCHER.exact.get(word) ?? [])];
  for (const rule of CUE_MATCHER.prefixes) {
    if (word.startsWith(rule.prefix) && !hits.some((hit) => hit.theme === rule.theme)) hits.push({ theme: rule.theme, cue: rule.cue });
  }
  memo.set(word, hits);
  return hits;
}
