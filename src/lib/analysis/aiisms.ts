// Words and constructions that make text read as machine-written. Shared by the prompt (so models
// avoid them), the detector (so the user can see them) and the fixer (so they can be undone).

export interface AiIsm {
  /** Regex source, matched case-insensitively on word boundaries. */
  pattern: string
  /** Plain-English replacement, or '' to delete. null = flag only, needs a human rewrite. */
  fix: string | null
  why: string
}

export const AI_ISMS: AiIsm[] = [
  { pattern: 'delv(?:e|es|ed|ing)(?: into)?', fix: 'dig into', why: 'Classic AI tell' },
  { pattern: 'a rich tapestry of|tapestry of', fix: 'a mix of', why: 'Classic AI tell' },
  { pattern: 'tapestry', fix: 'mix', why: 'Classic AI tell' },
  { pattern: 'is a testament to', fix: 'shows', why: 'Inflated phrasing' },
  { pattern: 'testament to', fix: 'proof of', why: 'Inflated phrasing' },
  { pattern: 'in the realm of', fix: 'in', why: 'Inflated phrasing' },
  { pattern: 'in today\'s (?:fast-paced|digital|modern) (?:world|age|landscape)', fix: 'today', why: 'Stock opener' },
  { pattern: 'ever-evolving|ever-changing', fix: 'changing', why: 'Stock phrase' },
  { pattern: 'navigat(?:e|ing) the complexities of', fix: 'dealing with', why: 'Stock phrase' },
  { pattern: 'it(?:\'s| is) (?:worth noting|important to note) that', fix: '', why: 'Throat-clearing' },
  { pattern: 'it(?:\'s| is) worth noting', fix: '', why: 'Throat-clearing' },
  { pattern: 'in conclusion,?', fix: '', why: 'Essay-template sign-off' },
  { pattern: 'in summary,?', fix: '', why: 'Essay-template sign-off' },
  { pattern: 'furthermore,?', fix: 'also,', why: 'Stiff transition' },
  { pattern: 'moreover,?', fix: 'also,', why: 'Stiff transition' },
  { pattern: 'additionally,?', fix: 'also,', why: 'Stiff transition' },
  { pattern: 'utiliz(?:e|es|ed|ing)', fix: 'use', why: 'Use the plain word' },
  { pattern: 'leverag(?:e|es|ed|ing)', fix: 'use', why: 'Corporate jargon' },
  { pattern: 'seamless(?:ly)?', fix: 'smooth', why: 'Marketing word' },
  { pattern: 'elevate(?:s|d)? (?:your|the|my)', fix: null, why: 'Marketing word' },
  { pattern: 'unlock(?:s|ed|ing)? the (?:power|potential)', fix: null, why: 'Marketing cliché' },
  { pattern: 'game[- ]changer', fix: 'big deal', why: 'Cliché' },
  { pattern: 'robust', fix: 'solid', why: 'Jargon' },
  { pattern: 'foster(?:s|ed|ing)?', fix: 'build', why: 'Jargon' },
  { pattern: 'pivotal', fix: 'key', why: 'Inflated word' },
  { pattern: 'crucial(?:ly)?', fix: 'important', why: 'Inflated word' },
  { pattern: 'embark(?:s|ed|ing)? on', fix: 'start', why: 'Inflated phrasing' },
  { pattern: 'a journey of', fix: null, why: 'Cliché' },
  { pattern: 'the landscape of', fix: '', why: 'Cliché' },
  { pattern: 'let(?:\'s| us) dive in', fix: '', why: 'Stock opener' },
  { pattern: 'dive deep(?:er)? into', fix: 'look at', why: 'Stock phrase' },
  { pattern: 'not (?:just|only) [^.,;]{1,40}?, but (?:also )?', fix: null, why: '"Not just X, but Y" pattern' },
  { pattern: 'whether you(?:\'re| are) a [^.,;]{1,40} or a', fix: null, why: 'Stock framing' },
  { pattern: 'buckle up', fix: '', why: 'Cliché' },
  { pattern: 'resonate(?:s|d)? with', fix: 'connect with', why: 'Overused' },
  { pattern: 'meticulous(?:ly)?', fix: 'careful', why: 'Overused by models' },
  { pattern: 'boast(?:s|ed|ing)?', fix: 'has', why: 'Marketing word' },
  { pattern: 'showcas(?:e|es|ed|ing)', fix: 'show', why: 'Marketing word' },
  { pattern: 'harness(?:es|ed|ing)? the', fix: 'use the', why: 'Marketing cliché' },
  { pattern: 'plethora of', fix: 'lots of', why: 'Inflated word' },
  { pattern: 'myriad(?: of)?', fix: 'lots of', why: 'Inflated word' },
]

/** Short list for prompts: the words models reach for most. */
export const AI_ISM_PROMPT_LIST = [
  'delve',
  'tapestry',
  'testament',
  'realm',
  'landscape',
  'navigate',
  'elevate',
  'unlock',
  'seamless',
  'leverage',
  'utilize',
  'robust',
  'crucial',
  'pivotal',
  'foster',
  'game-changer',
  'embark',
  'in today\'s fast-paced world',
  'it\'s worth noting',
  'furthermore',
  'moreover',
  'in conclusion',
  'let\'s dive in',
  'not just X, but Y',
]
