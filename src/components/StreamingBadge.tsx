import { providerLogoUrl } from '../lib/tmdb'
import type { ResolvedProvider } from '../lib/streamingProvider'

/** Small corner badge showing where a show is free to stream, using the same
 * resolved answer as the show page's Streaming section. Renders nothing
 * without a resolved provider/logo, so it never leaves a broken-image placeholder. */
export default function StreamingBadge({ provider }: { provider: ResolvedProvider | null | undefined }) {
  const logo = provider ? providerLogoUrl(provider.logo_path) : null
  if (!provider || !logo) return null

  return (
    <div
      title={provider.provider_name}
      className="absolute right-1.5 top-1.5 h-6 w-6 overflow-hidden rounded-md shadow-md ring-1 ring-black/30"
    >
      <img src={logo} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
    </div>
  )
}
