// ─────────────────────────────────────────────────────────────
// SIDE LESSON — the SIDE QUEST payload.
//
// One shape consumed by the in-app reader (SideLessonSheet) no
// matter where the player tapped it: the stage room's SIDE QUEST
// card, or a MetaBot trick card in Home. The bot researches, the
// founder approves, the app renders — the METHOD stays a side
// note you read inside the academy, never a link sent outside.
// ─────────────────────────────────────────────────────────────

export interface SideLessonTile {
  icon: 'target' | 'waves' | 'arrow';
  title: string;
  desc: string;
}

export interface SideLessonClip {
  variant: 'pitchRun' | 'pitchFade' | 'kickoff';
  duration: string; // "04:37"
  caption: string;
  subcaption: string;
}

export interface SideLesson {
  contentId: string;
  kind: string;
  topic?: string; // mechanism key used for combo lookup
  patchVersion: string;
  discoveredAt: string;
  sourceName: string;
  sourceUrl: string;
  mechanicName: string; // "THE LANE CHANGE"
  headline: string;     // the lesson's own headline
  why: string;          // why it works right now — the blog's spine
  blogBody: string;     // the scout's note, in academy words
  tiles: SideLessonTile[];
  rule: string;
  clip: SideLessonClip;
}

/** from a resolved stage LessonPlan (coaching.ts) */
export function sideLessonFromPlan(plan: {
  contentId: string;
  kind: string;
  topic?: string;
  patchVersion: string;
  discoveredAt: string;
  sourceName: string;
  sourceUrl: string;
  mechanicName: string;
  headline: string;
  why: string;
  tiles: SideLessonTile[];
  rule: string;
  clip: SideLessonClip;
}): SideLesson {
  return {
    contentId: plan.contentId,
    kind: plan.kind,
    topic: plan.topic ?? plan.mechanicName?.toLowerCase().replace(/^the /, '').replace(/ /g, '-'),
    patchVersion: plan.patchVersion,
    discoveredAt: plan.discoveredAt,
    sourceName: plan.sourceName,
    sourceUrl: plan.sourceUrl,
    mechanicName: plan.mechanicName,
    headline: plan.headline,
    why: plan.why,
    blogBody: '',
    tiles: plan.tiles,
    rule: plan.rule,
    clip: plan.clip,
  };
}

/** from a raw MetaBot/live-feed post (has the blog body on top) */
export function sideLessonFromPost(p: {
  id: string;
  kind: string;
  patchVersion: string;
  discoveredAt: string;
  sourceName: string;
  sourceUrl: string;
  body: string;
  lesson: {
    name: string;
    headline: string;
    why: string;
    tiles: SideLessonTile[];
    rule: string;
    clip: SideLessonClip;
  };
}): SideLesson {
  return {
    contentId: p.id,
    kind: p.kind,
    topic: p.lesson.name.toLowerCase().replace(/^the /, '').replace(/ /g, '-'),
    patchVersion: p.patchVersion,
    discoveredAt: p.discoveredAt,
    sourceName: p.sourceName,
    sourceUrl: p.sourceUrl,
    mechanicName: p.lesson.name,
    headline: p.lesson.headline,
    why: p.lesson.why,
    blogBody: p.body,
    tiles: p.lesson.tiles,
    rule: p.lesson.rule,
    clip: p.lesson.clip,
  };
}
