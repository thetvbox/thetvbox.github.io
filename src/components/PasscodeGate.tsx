import { useState } from 'react'
import type { FormEvent } from 'react'
import { motion } from 'framer-motion'
import { checkPasscode, markGatePassed } from '../lib/siteGate'
import { CARD_ENTRANCE_MOTION } from '../lib/motion'
import { PASSCODE_LENGTH } from '../lib/constants'
import PrimaryButton from './PrimaryButton'
import AuthBrandHeader from './AuthBrandHeader'
import ErrorText from './ErrorText'

export default function PasscodeGate({ onSuccess }: { onSuccess: () => void }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (checkPasscode(code)) {
      markGatePassed()
      onSuccess()
    } else {
      setError('That code isn’t right.')
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <motion.div {...CARD_ENTRANCE_MOTION} className="w-full max-w-sm">
        <AuthBrandHeader tagline="This one’s invite-only." />

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-hairline bg-base-850/70 p-6 shadow-xl shadow-black/10 dark:shadow-black/20"
        >
          <div>
            <label htmlFor="passcode" className="mb-1.5 block text-sm font-medium text-base-200">
              Enter passcode
            </label>
            <input
              id="passcode"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              maxLength={PASSCODE_LENGTH}
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, ''))
                setError(null)
              }}
              placeholder="••••••"
              className="w-full rounded-lg border border-hairline-strong bg-base-900 px-3.5 py-3 text-center text-lg font-semibold tracking-[0.5em] text-base-100 placeholder:tracking-normal placeholder:text-base-500 focus:border-accent-500/60"
            />
          </div>
          {error && <ErrorText className="text-xs">{error}</ErrorText>}
          <PrimaryButton disabled={code.length === 0}>Continue</PrimaryButton>
        </form>
      </motion.div>
    </div>
  )
}
