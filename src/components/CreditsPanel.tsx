import { Link } from 'react-router-dom'
import Modal from './Modal'
import PanelHeader from './PanelHeader'
import { ROUTES } from '../lib/routes'

/** Attribution required by TMDB/TVmaze's API terms, plus a link to the privacy policy -- see the progress notes for the terms this satisfies. */
export default function CreditsPanel({ onClose }: { onClose: () => void }) {
  return (
    <Modal onClose={onClose} label="Credits & privacy" maxWidth="max-w-md" className="p-4">
      <PanelHeader title="Credits & privacy" onClose={onClose} />

      <div className="space-y-4 text-xs leading-relaxed text-base-400">
        <p>
          Show artwork and metadata from{' '}
          <a
            href="https://www.themoviedb.org/"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-accent-400 hover:underline"
          >
            TMDB
          </a>
          . This product uses the TMDB API but is not endorsed or certified by TMDB.
        </p>
        <p>
          Episode air dates corrected using data from{' '}
          <a
            href="https://www.tvmaze.com/"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-accent-400 hover:underline"
          >
            TVmaze
          </a>
          .
        </p>
        <p>
          IMDb ratings and Rotten Tomatoes scores from{' '}
          <a
            href="https://www.omdbapi.com/"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-accent-400 hover:underline"
          >
            the OMDb API
          </a>
          .
        </p>
        <p className="border-t border-hairline pt-3">
          <Link to={ROUTES.privacy} onClick={onClose} className="font-medium text-accent-400 hover:underline">
            Privacy policy
          </Link>
        </p>
      </div>
    </Modal>
  )
}
