import { createClient, type Session } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { AppState, Platform } from 'react-native';
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export const supabase = url && key ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: true, detectSessionInUrl: false } }) : null;
const TOKEN_KEY = 'mooa.refresh-token.v1';
// Only the refresh token goes into the device keychain, never applicant text.
// Browser preview deliberately keeps sessions in memory.
export async function restoreSession() {
  if (!supabase || Platform.OS === 'web') return;
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  if (token) {
    const { error } = await supabase.auth.refreshSession({ refresh_token: token });
    if (error && error.status && error.status >= 400 && error.status < 500) await SecureStore.deleteItemAsync(TOKEN_KEY);
  }
}
let storageQueue = Promise.resolve();
export function observeSession(onChange: (session: Session | null) => void, onStorageFailure: () => void) {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    onChange(session);
    if (Platform.OS !== 'web' && event !== 'INITIAL_SESSION') {
      storageQueue = storageQueue.then(async () => {
        if (session) await SecureStore.setItemAsync(TOKEN_KEY, session.refresh_token);
        else if (event === 'SIGNED_OUT') await SecureStore.deleteItemAsync(TOKEN_KEY);
      }).catch(onStorageFailure);
    }
  });
  const appState = AppState.addEventListener('change', state => {
    if (state === 'active') supabase?.auth.startAutoRefresh();
    else supabase?.auth.stopAutoRefresh();
  });
  return () => { data.subscription.unsubscribe(); appState.remove(); supabase?.auth.stopAutoRefresh(); };
}
