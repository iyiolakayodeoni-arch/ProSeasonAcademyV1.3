// ─────────────────────────────────────────────────────────────
// THE HONESTY GUARD — automated nonsense & evasion detection.
// "The app records the evidence; it never does your thinking for you."
//
// In ProSeasonAcademy, players are required to answer honestly in
// their own words. Because we cannot read a player's mind to detect
// a lie, we ensure honesty by detecting when someone types nonsense,
// keyboard mashing, repeated filler, evasive shortcuts ("idk",
// "nothing"), or copies the prompt back to us.
//
// Used across the Mirror Session, Baseline Week, Stage Scans,
// Loss Journal, and Match Vault notes.
// ─────────────────────────────────────────────────────────────

export type HonestyViolation =
  | 'too_short'
  | 'keyboard_mash'
  | 'gibberish'
  | 'repetitive'
  | 'filler_phrase'
  | 'not_enough_words'
  | 'copied_prompt';

export interface HonestyCheckResult {
  /** true when the text is real words and passes all honesty/nonsense checks */
  ok: boolean;
  /** which specific honesty rule was violated (if any) */
  violation?: HonestyViolation;
  /** coach-voiced feedback explaining why the input does not pass muster */
  feedback?: string;
  /** quality score 0..1 (0 = nonsense/evasion, 1 = substantive honest text) */
  score: number;
  /** clean word count (words with 2+ letters) */
  wordCount: number;
  /** character count (trimmed) */
  charCount: number;
}

export interface HonestyOptions {
  /** minimum character length (default: 4) */
  minLength?: number;
  /** minimum distinct word count (default: 1 for short inputs, 2 for inputs >= 10 chars) */
  minWords?: number;
  /** optional prompt or question text to prevent copy-pasting the question */
  prompt?: string;
  /** coach identity for voice-tailored feedback */
  coachId?: string;
}

/** Known evasive non-answers that players use to skip thinking */
const EVASION_PHRASES = new Set([
  'idk',
  'i dont know',
  'i do not know',
  'idk why',
  'dont know',
  'don t know',
  'no idea',
  'who knows',
  'not sure',
  'nothing',
  'nothing happened',
  'nothing much',
  'nothing special',
  'none',
  'na',
  'n a',
  'null',
  'nil',
  'zero',
  'no',
  'yes',
  'ok',
  'okay',
  'good',
  'bad',
  'fine',
  'whatever',
  'stuff',
  'things',
  'same',
  'same as before',
  'same thing',
  'same as usual',
  'same as always',
  'skip',
  'skipped',
  'pass',
  'test',
  'testing',
  'test test',
  'abc',
  'abcd',
  'abcde',
  '123',
  '1234',
  '12345',
  '123456',
  'played',
  'played game',
  'just played',
  'played match',
  'lost',
  'won',
  'football',
  'soccer',
  'the ball',
]);

/**
 * Check whether player input is genuine, honest text rather than nonsense,
 * keyboard mashing, repeated words, or evasion shortcuts.
 */
export function checkHonesty(text: string, options?: HonestyOptions): HonestyCheckResult {
  const minLength = options?.minLength ?? 4;
  const trimmed = String(text ?? '').trim();
  const charCount = trimmed.length;

  // 1. Too Short
  if (charCount < minLength) {
    return {
      ok: false,
      violation: 'too_short',
      feedback:
        charCount === 0
          ? `${minLength}+ CHARACTERS · ONE HONEST LINE REQUIRED, NO BLANK CHECKS`
          : `${charCount}/${minLength} CHARACTERS · AN HONEST LINE TAKES MORE THAN A FEW LETTERS`,
      score: 0,
      wordCount: 0,
      charCount,
    };
  }

  // 2. Keyboard Mash (4+ identical chars, 4+ keyboard row sequence, or 6+ consecutive consonants)
  const isRepeatedChar = /([a-z0-9])\1{3,}/i.test(trimmed);
  const isKeyboardRow =
    /qwerty|wertyu|ertyui|rtyuio|tyuiop|asdfgh|sdfghj|dfghjk|fghjkl|zxcvbn|xcvbnm|lkjhg|kjhgf|jhgfd|hgfds|gfdsa|mnbvc|nbvcx|bvcxz|qwer|wert|erty|rtyu|tyui|yuio|uiop|asdf|sdfg|dfgh|fghj|ghjk|hjkl|zxcv|xcvb|cvbn|vbnm|lkjh|kjhg|jhgf|hgfd|gfds|fdsa|mnbv|nbvc|bvcx|vcxz|poiu|oiuy|iuyt|uytr|ytre|trew|rewq/i.test(
      trimmed,
    );
  const isConsonantSoup = /[bcdfghjklmnpqrstvwxz]{6,}/i.test(trimmed);

  if (isRepeatedChar || isKeyboardRow || isConsonantSoup) {
    return {
      ok: false,
      violation: 'keyboard_mash',
      feedback: 'I KNOW WHAT A KEYBOARD MASH SOUNDS LIKE BEFORE YOU FINISH THE LINE. GIVE ME REAL WORDS.',
      score: 0,
      wordCount: countWords(trimmed),
      charCount,
    };
  }

  // 3. Gibberish (Vowel to consonant ratio check for alphabetic words >= 6 chars)
  const alphaOnly = trimmed.replace(/[^a-zA-Z]/g, '').toLowerCase();
  if (alphaOnly.length >= 6) {
    const vowelCount = (alphaOnly.match(/[aeiouy]/g) || []).length;
    const ratio = vowelCount / alphaOnly.length;
    if (ratio < 0.12 || ratio > 0.88) {
      return {
        ok: false,
        violation: 'gibberish',
        feedback: 'THAT IS NOT PLAIN ENGLISH, LITTLE ONE. TELL ME WHAT ACTUALLY HAPPENED.',
        score: 0.1,
        wordCount: countWords(trimmed),
        charCount,
      };
    }
  } else if (alphaOnly.length === 0 && charCount >= 3) {
    // Input is only symbols/numbers
    return {
      ok: false,
      violation: 'gibberish',
      feedback: 'AN HONEST LINE NEEDS REAL WORDS, NOT NUMBERS OR SYMBOLS.',
      score: 0,
      wordCount: 0,
      charCount,
    };
  }

  // 4. Evasive Dismissal Phrases (checking full normalized text)
  const normalized = trimmed.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
  if (EVASION_PHRASES.has(normalized)) {
    return {
      ok: false,
      violation: 'filler_phrase',
      feedback: `SAYING "${trimmed.toUpperCase()}" WON'T HELP. DIG INTO WHAT ACTUALLY HAPPENED ON THE PITCH.`,
      score: 0.15,
      wordCount: countWords(trimmed),
      charCount,
    };
  }

  // 5. Repetitive Spam & Low Word Diversity
  const tripleRepeat = /(\b[a-z0-9]{2,}\b)(?:\s+\1){2,}/i.test(trimmed);
  const words = trimmed.toLowerCase().match(/\b[a-z0-9]{2,}\b/g) || [];
  const wordCount = words.length;

  if (tripleRepeat) {
    return {
      ok: false,
      violation: 'repetitive',
      feedback: 'REPETITION IS FOR DRILLS ON THE PITCH, NOT REFLECTIONS IN THE LAB. SPEAK YOUR MIND.',
      score: 0.2,
      wordCount,
      charCount,
    };
  }
  if (wordCount >= 4) {
    const unique = new Set(words);
    const diversity = unique.size / wordCount;
    if (diversity < 0.38) {
      return {
        ok: false,
        violation: 'repetitive',
        feedback: 'REPETITION IS FOR DRILLS ON THE PITCH, NOT REFLECTIONS IN THE LAB. SPEAK YOUR MIND.',
        score: 0.2,
        wordCount,
        charCount,
      };
    }
  }

  // 6. Minimum Distinct Words
  const minWords = options?.minWords ?? (minLength >= 10 ? 2 : 1);
  const distinctWords = new Set(words).size;
  if (distinctWords < minWords) {
    return {
      ok: false,
      violation: 'not_enough_words',
      feedback: `A SINGLE WORD WON'T EXPLAIN A MATCH. GIVE ME AT LEAST ${minWords} DISTINCT WORDS.`,
      score: 0.25,
      wordCount,
      charCount,
    };
  }

  // 7. Copied Prompt / Question Repetition
  const promptText = options?.prompt;
  if (promptText && promptText.trim().length >= 8) {
    const cleanText = trimmed.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanPrompt = promptText.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (
      cleanText.length > 0 &&
      (cleanText === cleanPrompt ||
        (cleanText.length >= 10 && (cleanPrompt.startsWith(cleanText) || cleanText.startsWith(cleanPrompt))))
    ) {
      return {
        ok: false,
        violation: 'copied_prompt',
        feedback: "DON'T REPEAT THE QUESTION BACK TO ME. WHAT IS YOUR OWN HONEST ANSWER?",
        score: 0.1,
        wordCount,
        charCount,
      };
    }
  }

  // Passed all honesty checks
  const score = Math.min(1, 0.55 + Math.min(wordCount, 12) * 0.04);
  return {
    ok: true,
    score: Math.round(score * 100) / 100,
    wordCount,
    charCount,
  };
}

/** Quick boolean helper: returns true when input passes the honesty check */
export function isValidReflection(text: string, options?: HonestyOptions): boolean {
  return checkHonesty(text, options).ok;
}

/**
 * Returns UI feedback text and warning color state for live input fields.
 */
export function getHonestyFeedback(
  text: string,
  options?: HonestyOptions,
  defaultNote?: string,
): { text: string; ok: boolean; isWarning: boolean } {
  const result = checkHonesty(text, options);
  const trimmed = String(text ?? '').trim();

  if (trimmed.length === 0) {
    return {
      text: defaultNote ?? 'BE HONEST · NO EXCUSES, NO AI WILL EVER WRITE THIS FOR YOU',
      ok: false,
      isWarning: false,
    };
  }

  if (!result.ok && result.feedback) {
    return {
      text: `⚠️ [HONESTY CHECK] ${result.feedback}`,
      ok: false,
      isWarning: true,
    };
  }

  return {
    text: defaultNote
      ? `✓ [HONEST LEDGER] ${defaultNote}`
      : `✓ [HONEST LEDGER] ${result.charCount} CHARS · SUBSTANTIVE REFLECTION VERIFIED`,
    ok: true,
    isWarning: false,
  };
}

/**
 * Coach quotes on honesty and self-accountability.
 */
export function getCoachHonestyReminder(_coachId?: string): string {
  return 'I have listened to two thousand debriefs — I know what a lie sounds like before you finish the sentence. Answer honestly.';
}

function countWords(str: string): number {
  return (str.toLowerCase().match(/\b[a-z0-9]{2,}\b/g) || []).length;
}
