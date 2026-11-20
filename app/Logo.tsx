export default function Logo() {
  return (
    <span
      aria-label="Wallo"
      className="inline-flex items-center text-2xl font-extrabold tracking-tight text-brand-950"
    >
      WALL
      <span
        aria-hidden="true"
        className="ml-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-gold-400 text-base font-black text-brand-950 ring-2 ring-gold-500/60"
      >
        O
      </span>
    </span>
  );
}