export function Toggle({ ligado, onChange, label }: { ligado: boolean; onChange: () => void; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligado}
      aria-label={label}
      onClick={onChange}
      className={`relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors ${ligado ? 'bg-brand-500' : 'bg-border'}`}
    >
      <span
        className={`absolute left-0.5 top-0.5 h-[18px] w-[18px] rounded-full bg-white shadow transition-transform ${
          ligado ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  );
}
