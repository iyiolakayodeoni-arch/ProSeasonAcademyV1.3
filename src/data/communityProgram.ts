import { supabase } from './supabaseClient';

export type PeerPair = {
  pair_id: string;
  room_slug: string;
  status: 'active' | 'complete' | 'cancelled';
  partner_handle: string;
  partner_academy_id: string;
  draw_created_at: string;
  submitted: boolean;
  partner_submitted: boolean;
};

export type PeerReview = {
  profile_id: string;
  handle: string;
  turning_point: string | null;
  own_mistake: string | null;
  opponent_strength: string | null;
  next_action: string | null;
  submitted_at: string;
  revealed: boolean;
};

/** All member endpoints are security-definer RPCs: no client can read another pair's review. */
export async function myPeerPair(): Promise<PeerPair | null> {
  const { data, error } = await supabase.rpc('community_my_pair');
  if (error || !Array.isArray(data) || !data[0]) return null;
  return data[0] as PeerPair;
}

export async function peerReview(pairId: string): Promise<PeerReview[]> {
  const { data, error } = await supabase.rpc('community_peer_review', { p_pair: pairId });
  return error || !Array.isArray(data) ? [] : data as PeerReview[];
}

export async function submitPeerReview(pairId: string, answers: { turning: string; own: string; strength: string; next: string }): Promise<boolean> {
  if (Object.values(answers).some((value) => value.trim().length < 8)) return false;
  const { data, error } = await supabase.rpc('community_submit_peer_review', {
    p_pair: pairId, p_turning: answers.turning.trim(), p_own: answers.own.trim(), p_strength: answers.strength.trim(), p_next: answers.next.trim(),
  });
  return !error && data === true;
}

export type FounderCommunityOverview = { groups: any[]; members: any[]; pairs: any[]; suspended: any[] };
async function admin(action: string, payload: Record<string, unknown> = {}): Promise<any | null> {
  const response = await supabase.functions.invoke('community-admin', { body: { action, ...payload } });
  return response.error ? null : response.data;
}
export const founderCommunityOverview = () => admin('overview') as Promise<{ ok: boolean } & FounderCommunityOverview | null>;
export const founderCreateCommunityGroup = (name: string, description: string) => admin('create_group', { name, description });
export const founderSetCommunityMember = (groupId: string, academyId: string, remove = false) => admin('set_member', { groupId, academyId, remove });
export const founderSuspendCommunityMember = (academyId: string, reason: string, remove = false) => admin('suspend', { academyId, reason, remove });
export const founderRunPeerDraw = (groupIds: string[]) => admin('run_draw', { groupIds });
