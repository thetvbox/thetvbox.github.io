import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

import { supabase } from '@/lib/supabase';
import { TABLE_USERS } from '@/lib/constants';
import type { AppUser } from '@/types';

WebBrowser.maybeCompleteAuthSession();

export type AccountSetupKind = 'new' | 'existing';

interface CreateAccountInput {
  username: string;
  fullName: string;
  preferredName: string;
}

interface CompleteProfileInput {
  fullName: string;
  preferredName: string;
}

interface AuthContextValue {
  user: AppUser | null;
  session: Session | null;
  loading: boolean;
  accountSetup: AccountSetupKind | null;
  signInWithApple: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  sendEmailOtp: (email: string) => Promise<void>;
  verifyEmailOtp: (email: string, token: string) => Promise<void>;
  createAccount: (input: CreateAccountInput) => Promise<void>;
  completeProfile: (input: CompleteProfileInput) => Promise<void>;
  skipAccountSetup: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const UNDEFINED_COLUMN = '42703';
const UNIQUE_VIOLATION = '23505';
const PROFILE_SKIP_PREFIX = 'tvbox_profile_setup_skipped:';

async function wasProfileSetupSkipped(userId: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(PROFILE_SKIP_PREFIX + userId)) === '1';
  } catch {
    return false;
  }
}

async function rememberProfileSetupSkipped(userId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(PROFILE_SKIP_PREFIX + userId, '1');
  } catch {}
}

interface ResolvedAccount {
  user: AppUser | null;
  accountSetup: AccountSetupKind | null;
}

/** Resolves a Supabase Auth session to this app's public.users row (by auth_user_id, falling back to email), and decides whether the account-setup screen is still owed. */
async function resolveAccount(session: Session | null): Promise<ResolvedAccount> {
  if (!session?.user) return { user: null, accountSetup: null };
  const authUserId = session.user.id;
  const email = session.user.email?.toLowerCase().trim();

  const { data: linked, error: linkedError } = await supabase
    .from(TABLE_USERS)
    .select()
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  let matched = !linkedError ? (linked as AppUser | null) : null;

  if (!matched && email) {
    const { data: byEmail } = await supabase.from(TABLE_USERS).select().eq('email', email).maybeSingle();
    if (byEmail) {
      matched = byEmail as AppUser;
      if (!linkedError) {
        // auth_user_id column exists on this schema -- best-effort link for next time. If there's
        // no update policy allowing it yet, this silently affects 0 rows; resolveAccount just runs
        // the email match again next time, which is harmless.
        supabase
          .from(TABLE_USERS)
          .update({ auth_user_id: authUserId })
          .eq('id', matched.id)
          .then(
            () => {},
            () => {},
          );
      }
    }
  }

  if (!matched) return { user: null, accountSetup: 'new' };
  if (!matched.full_name && !(await wasProfileSetupSkipped(matched.id))) {
    return { user: matched, accountSetup: 'existing' };
  }
  return { user: matched, accountSetup: null };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [accountSetup, setAccountSetup] = useState<AccountSetupKind | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) setSession(data.session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!cancelled) setSession(nextSession);
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    resolveAccount(session)
      .then((resolved) => {
        if (cancelled) return;
        setUser(resolved.user);
        setAccountSetup(resolved.accountSetup);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

  const refreshAccount = useCallback(async () => {
    const resolved = await resolveAccount(session);
    setUser(resolved.user);
    setAccountSetup(resolved.accountSetup);
  }, [session]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      loading,
      accountSetup,
      async signInWithApple() {
        const credential = await AppleAuthentication.signInAsync({
          requestedScopes: [
            AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
            AppleAuthentication.AppleAuthenticationScope.EMAIL,
          ],
        });
        if (!credential.identityToken) throw new Error('Apple did not return an identity token.');
        const { error } = await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: credential.identityToken,
        });
        if (error) throw new Error(error.message);
      },
      async signInWithGoogle() {
        const redirectTo = AuthSession.makeRedirectUri();
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo, skipBrowserRedirect: true },
        });
        if (error) throw new Error(error.message);
        if (!data?.url) throw new Error('Could not start Google sign-in.');

        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
        if (result.type === 'cancel' || result.type === 'dismiss') return;
        if (result.type !== 'success' || !result.url) throw new Error('Google sign-in did not complete.');

        const url = new URL(result.url);
        const params = new URLSearchParams(url.hash ? url.hash.slice(1) : url.search);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (sessionError) throw new Error(sessionError.message);
          return;
        }

        const code = params.get('code');
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw new Error(exchangeError.message);
          return;
        }

        throw new Error('Google sign-in did not return a session.');
      },
      async sendEmailOtp(email) {
        const { error } = await supabase.auth.signInWithOtp({ email: email.toLowerCase().trim() });
        if (error) throw new Error(error.message);
      },
      async verifyEmailOtp(email, token) {
        const { error } = await supabase.auth.verifyOtp({
          email: email.toLowerCase().trim(),
          token,
          type: 'email',
        });
        if (error) throw new Error(error.message);
      },
      async createAccount({ username, fullName, preferredName }) {
        if (!session?.user?.email) throw new Error('You need to be signed in before creating an account.');
        const email = session.user.email.toLowerCase().trim();
        const trimmedUsername = username.trim();

        // Tries the full row first, then drops fields the live schema doesn't have yet (this
        // database is mid-migration: auth_user_id and full_name/preferred_name may not exist),
        // so sign-up still works with whatever subset of columns is actually live.
        const attempts: Record<string, string>[] = [
          {
            email,
            username: trimmedUsername,
            auth_user_id: session.user.id,
            full_name: fullName.trim(),
            preferred_name: preferredName.trim(),
          },
          { email, username: trimmedUsername, auth_user_id: session.user.id },
          { email, username: trimmedUsername },
        ];

        let lastError: { code?: string; message: string } | null = null;
        for (const payload of attempts) {
          const { error } = await supabase.from(TABLE_USERS).insert(payload).select().single();
          lastError = error;
          if (!error || error.code !== UNDEFINED_COLUMN) break;
        }

        if (lastError) {
          if (lastError.code === UNIQUE_VIOLATION) {
            throw new Error(
              lastError.message.includes('username')
                ? 'That username is taken. Try another.'
                : 'An account with that email already exists.',
            );
          }
          throw new Error(lastError.message);
        }
        await refreshAccount();
      },
      async completeProfile({ fullName, preferredName }) {
        if (!user) throw new Error('No account to update yet.');
        const { data, error } = await supabase
          .from(TABLE_USERS)
          .update({ full_name: fullName.trim(), preferred_name: preferredName.trim() })
          .eq('id', user.id)
          .select()
          .maybeSingle();
        if (!data || error) {
          // Not persisted -- the columns or the update policy aren't live on this database yet.
          // Don't keep re-prompting every session; the fields just won't show until they are.
          await rememberProfileSetupSkipped(user.id);
        }
        await refreshAccount();
      },
      skipAccountSetup() {
        if (!user) return;
        rememberProfileSetupSkipped(user.id).finally(() => setAccountSetup(null));
      },
      async signOut() {
        await supabase.auth.signOut();
      },
    }),
    [user, session, loading, accountSetup, refreshAccount],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
