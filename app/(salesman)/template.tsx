// Unlike a layout, a template re-mounts on every navigation, so the fade-in
// replays each time a tab changes — the screen eases in instead of snapping.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animate-page">{children}</div>;
}
