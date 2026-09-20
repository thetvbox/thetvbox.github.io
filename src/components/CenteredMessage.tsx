import BackButton from './BackButton'
import { ROUTES } from '../lib/routes'

/** Centered message plus back link, shared by every not-found/failed-to-load page. */
export default function CenteredMessage({
  message,
  backTo = ROUTES.members,
  backLabel = 'Back to people',
}: {
  message: string
  backTo?: string
  backLabel?: string
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-16 text-center sm:px-6">
      <p className="text-sm text-base-500">{message}</p>
      <BackButton to={backTo} label={backLabel} className="mt-3" />
    </div>
  )
}
