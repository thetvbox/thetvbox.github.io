/** The single star-rating icon used everywhere a numeric rating is shown
 * (ActivityRow, RatingSummary, diary/history rows, the rating distribution
 * graph, etc). Previously redefined identically in seven different files at
 * seven different fixed sizes -- consolidated here with a `size` prop so
 * there's one shape to keep in sync instead of seven. */
export default function StarGlyph({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="var(--color-star)">
      <path d="M12 2.5l2.9 6.15 6.6.72-4.95 4.6 1.3 6.53L12 17.3l-5.85 3.2 1.3-6.53-4.95-4.6 6.6-.72L12 2.5z" />
    </svg>
  )
}
