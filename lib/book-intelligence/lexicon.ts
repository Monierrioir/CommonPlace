// DEVELOPMENT PROTOTYPE — Book Intelligence research. Not used by the app.
/**
 * Generic English word lists. Nothing here names or describes any particular book:
 * they encode how English marks people, places and function words.
 */

const words = (text: string) => new Set(text.trim().split(/\s+/));

export const STOPWORDS = words(`
a about above after again against all almost alone along already also although always am among an and another any anybody
anyone anything anyway anywhere are around as ask asked at away back be became because become becomes been before began
behind being below beside besides best better between beyond both brought but by came can cannot could did do does doing
done down during each either else enough even ever every everybody everyone everything everywhere except far few for found
from full further gave get gets getting give given go goes going gone got great had has have having he her here hers herself
him himself his how however i if in indeed instead into is it its itself just keep kept knew know known last least less let
like likely little long made make makes making many may me meanwhile might mine more moreover most mostly much must my myself
near nearly neither never nevertheless next no nobody none nor not nothing now nowhere of off often oh on once one only onto
or other others otherwise ought our ours ourselves out over own perhaps quite rather really right said same saw say says see
seemed seems seen several shall she should since so some somebody someone something sometimes somewhat somewhere soon still
such take taken than that the their theirs them themselves then there therefore these they thing things think this those
though thought through thus till to together too took toward towards under until up upon us used very was we well went were
what whatever when whenever where whereas wherever whether which while who whoever whole whom whose why will with within
without would yes yet you your yours yourself yourselves ah eh ha hm mr mrs sir madam let's don't didn't won't can't
couldn't wouldn't shouldn't isn't wasn't aren't weren't hasn't haven't hadn't i'm i've i'll i'd you're you've you'll he's
she's it's we're they're that's there's what's who's o yes no ay nay thee thou thy thine ye unto
`);

/** Capitalised words that are not names: pronouns, interjections, calendar words, address forms. */
export const CAPITALISED_NON_NAMES = words(`
i oh ah eh o yes no well now then there here what why how who when where come look good god lord christ heaven heavens
monday tuesday wednesday thursday friday saturday sunday january february march april may june july august september
october november december mr mrs miss sir madam madame monsieur mademoiselle master mistress mister dr
`);

/** Titles and address forms placed before a person's name. */
export const HONORIFICS = words(`
mr mrs miss ms sir madam madame monsieur mademoiselle mme mlle lady lord prince princess count countess baron baroness duke
duchess general colonel major captain lieutenant doctor dr professor father mother brother sister uncle aunt king queen
`);

export const SPEECH_VERBS = words(`
said says say asked asks replied replies answered answers exclaimed exclaims cried cries added adds continued continues
muttered mutters murmured murmurs whispered whispers shouted shouts called calls remarked remarks observed observes retorted
retorts rejoined rejoins inquired inquires enquired groaned groans sighed sighs grumbled grumbles began begins interrupted
interrupts repeated repeats protested protests declared declares went thought thinks
`);

export const STRONG_LOCATIVES = words("in at near into through across beyond throughout inside outside within");
export const WEAK_LOCATIVES = words("from to towards toward round around via");

/** Common nouns that head place names: "Nevsky Prospect", "the Vyborg Side". */
export const PLACE_NOUNS = words(`
street streets road lane avenue square prospect quay embankment bridge canal island river side quarter district province
village town city county parish estate hill hills mountain mountains valley lake sea bay park gardens garden hall church
cathedral monastery station gate gates market
`);

/** Proper nouns that name deities or abstractions rather than story characters. */
export const NON_CHARACTER_PROPER = words("god lord christ jesus heaven providence satan devil fate nature");

/** Determiners and possessives that typically precede a noun phrase. */
export const DETERMINERS = words("the a an his her their its my your our this that these those every each some no");
