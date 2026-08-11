import { supabase } from './supabaseClient';

export type FounderProfile = { id: string; handle: string; academy_id: string; is_founder: boolean };

/** Signs in only through Supabase Auth; passwords never enter app storage. */
export async function signInWithEmail(email: string, password: string): Promise<FounderProfile | null> {
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error || !data.user) return null;
  return getFounderProfile(data.user.id);
}

export async function getFounderProfile(userId?: string): Promise<FounderProfile | null> {
  const { data: session } = await supabase.auth.getSession();
  const id = userId ?? session.session?.user.id;
  if (!id) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('id, handle, academy_id, is_founder')
    .eq('auth_user_id', id)
    .eq('is_founder', true)
    .maybeSingle();
  return error || !data ? null : data as FounderProfile;
}

export async function isFounder(): Promise<boolean> {
  return (await getFounderProfile()) !== null;
}
