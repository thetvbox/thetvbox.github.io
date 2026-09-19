import { Link } from 'react-router-dom'
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
      <Link to={backTo} className="mt-3 inline-block text-sm text-accent-400 hover:underline">
        &larr; {backLabel}
      </Link>
    </div>
  )
}
