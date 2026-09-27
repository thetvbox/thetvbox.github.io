import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';

export interface BiometricGateState {
  unlocked: boolean;
  checking: boolean;
  promptUnlock: () => void;
}

/** Requires a Face ID/Touch ID (or device passcode) confirmation on cold start and every foreground while `enabled`, re-locking on backgrounding. */
export function useBiometricGate(enabled: boolean): BiometricGateState {
  const [unlocked, setUnlocked] = useState(!enabled);
  const [checking, setChecking] = useState(false);
  const promptingRef = useRef(false);

  const promptUnlock = useCallback(() => {
    if (!enabled || promptingRef.current) return;
    promptingRef.current = true;
    setChecking(true);
    LocalAuthentication.authenticateAsync({ promptMessage: 'Unlock TV Box' })
      .then((result) => setUnlocked(result.success))
      .catch(() => setUnlocked(false))
      .finally(() => {
        promptingRef.current = false;
        setChecking(false);
      });
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUnlocked(true);
      return;
    }
    setUnlocked(false);
    promptUnlock();
    // Only re-run when `enabled` flips, not on every promptUnlock identity change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        setUnlocked(false);
        promptUnlock();
      } else if (nextState === 'background') {
        setUnlocked(false);
      }
    });
    return () => subscription.remove();
  }, [enabled, promptUnlock]);

  return { unlocked, checking, promptUnlock };
}
