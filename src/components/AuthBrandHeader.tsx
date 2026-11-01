import AppLogo from './AppLogo'

/** The logo, name and tagline above the sign-in and passcode cards. */
export default function AuthBrandHeader({ tagline }: { tagline?: string }) {
  return (
    <div className="mb-8 flex flex-col items-center text-center">
      <AppLogo size={48} className="mb-4 drop-shadow-[0_6px_20px_rgba(255,176,32,0.3)]" />
      <h1 className="font-display text-2xl font-semibold text-base-100">TV Box</h1>
      {tagline && <p className="mt-1 text-sm text-base-400">{tagline}</p>}
    </div>
  )
}
