import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AppleAuthentication from 'expo-apple-authentication';

import { supabase } from '@/lib/supabase';
import { TABLE_USERS } from '@/lib/constants';
import type { AppUser } from '@/types';

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
  accountError: string | null;
  retryAccountResolution: () => void;
  signInWithApple: () => Promise<void>;
  sendEmailOtp: (email: string) => Promise<void>;
  verifyEmailOtp: (email: string, token: string) => Promise<void>;
  createAccount: (input: CreateAccountInput) => Promise<void>;
  completeProfile: (input: CompleteProfileInput) => Promise<void>;
  skipAccountSetup: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const UNIQUE_VIOLATION = '23505';
const APPLE_CANCELED_CODE = 'ERR_REQUEST_CANCELED';
const PROFILE_SKIP_PREFIX = 'tvbox_profile_setup_skipped:';

function isAppleSignInCancellation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: unknown }).code === APPLE_CANCELED_CODE;
}

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

async function linkAuthUserId(userId: string, authUserId: string): Promise<void> {
  await supabase.from(TABLE_USERS).update({ auth_user_id: authUserId }).eq('id', userId);
}

interface ResolvedAccount {
  user: AppUser | null;
  accountSetup: AccountSetupKind | null;
}

/** Resolves a Supabase Auth session to this app's public.users row (by auth_user_id, falling back to email), and decides whether the account-setup screen is still owed. Throws on a genuine query failure rather than treating it as "no account yet", so a transient error can't misroute an existing user into account creation. */
async function resolveAccount(session: Session | null): Promise<ResolvedAccount> {
  if (!session?.user) return { user: null, accountSetup: null };
  const authUserId = session.user.id;
  const email = session.user.email?.toLowerCase().trim();

  const { data: linked, error: linkedError } = await supabase
    .from(TABLE_USERS)
    .select()
    .eq('auth_user_id', authUserId)
    .maybeSingle();
  if (linkedError) throw new Error(linkedError.message);

  let matched = linked as AppUser | null;

  if (!matched && email) {
    const { data: byEmail, error: emailError } = await supabase
      .from(TABLE_USERS)
      .select()
      .eq('email', email)
      .maybeSingle();
    if (emailError) throw new Error(emailError.message);
    if (byEmail) {
      matched = byEmail as AppUser;
      linkAuthUserId(matched.id, authUserId).catch(() => {});
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
  const [accountError, setAccountError] = useState<string | null>(null);
  const [resolveAttempt, setResolveAttempt] = useState(0);

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
    setAccountError(null);
    resolveAccount(session)
      .then((resolved) => {
        if (cancelled) return;
        setUser(resolved.user);
        setAccountSetup(resolved.accountSetup);
      })
      .catch((err: unknown) => {
        if (!cancelled) setAccountError(err instanceof Error ? err.message : 'Could not load your account.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [session, resolveAttempt]);

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
      accountError,
      retryAccountResolution() {
        setResolveAttempt((n) => n + 1);
      },
      async signInWithApple() {
        let credential: AppleAuthentication.AppleAuthenticationCredential;
        try {
          credential = await AppleAuthentication.signInAsync({
            requestedScopes: [
              AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
              AppleAuthentication.AppleAuthenticationScope.EMAIL,
            ],
          });
        } catch (err) {
          if (isAppleSignInCancellation(err)) return;
          throw err;
        }
        if (!credential.identityToken) throw new Error('Apple did not return an identity token.');
        const { error } = await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: credential.identityToken,
        });
        if (error) throw new Error(error.message);
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

        const { error } = await supabase
          .from(TABLE_USERS)
          .insert({
            email,
            username: username.trim(),
            auth_user_id: session.user.id,
            full_name: fullName.trim(),
            preferred_name: preferredName.trim(),
          })
          .select()
          .single();

        if (error) {
          if (error.code === UNIQUE_VIOLATION) {
            throw new Error(
              error.message.includes('username')
                ? 'That username is taken. Try another.'
                : 'An account with that email already exists.',
            );
          }
          throw new Error(error.message);
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
        if (error) throw new Error(error.message);
        if (!data) throw new Error('Could not save your details. Try again.');
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
    [user, session, loading, accountSetup, accountError, refreshAccount],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
