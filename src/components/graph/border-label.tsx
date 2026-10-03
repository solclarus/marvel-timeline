// Sits on the top-left border of a card or band, in the detail panel's dark
// colors so it reads over any tint. `dot` takes a Tailwind class (groups) or
// an inline color (phase and era bands). With `onToggle`, the label pins
// focus on its card or band: the touch stand-in for hovering it. `centered`
// puts it top-center, for a card or band one work wide.
export function BorderLabel({
  dot,
  children,
  centered = false,
  pinned = false,
  onToggle,
}: {
  dot: { className?: string; color?: string };
  children: React.ReactNode;
  centered?: boolean;
  pinned?: boolean;
  onToggle?: () => void;
}) {
  const className = `absolute top-0 z-10 flex -translate-y-1/2 items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold whitespace-nowrap shadow-md shadow-black/20 ${centered ? "left-1/2 -translate-x-1/2" : "left-4"} ${pinned ? "bg-card-foreground text-card" : "bg-card/95 text-card-foreground"}`;
  const content = (
    <>
      <span
        className={`size-2.5 rounded-full ${dot.className ?? ""}`}
        style={{ backgroundColor: dot.color }}
      />
      {children}
    </>
  );
  if (!onToggle) return <span className={className}>{content}</span>;
  return (
    <button
      type="button"
      // A wider hit area than the label: it's tiny when zoomed out.
      className={`${className} cursor-pointer before:absolute before:-inset-3 before:content-['']`}
      aria-pressed={pinned}
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
    >
      {content}
    </button>
  );
}
