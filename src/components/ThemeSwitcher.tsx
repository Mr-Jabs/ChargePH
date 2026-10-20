import { themes, type ThemeName } from "@/lib/themes";

export default function ThemeSwitcher({
  value,
  onChange,
}: {
  value: ThemeName;
  onChange: (theme: ThemeName) => void;
}) {
  return (
    <div className="theme-switcher" role="group" aria-label="Neon accent theme">
      {(Object.keys(themes) as ThemeName[]).map((name) => (
        <button
          key={name}
          aria-label={themes[name].label}
          aria-pressed={value === name}
          title={themes[name].label}
          onClick={() => onChange(name)}
          style={{ "--swatch": themes[name].accent } as React.CSSProperties}
        >
          <span className="theme-swatch" />
          <span className="theme-name">{themes[name].shortLabel}</span>
        </button>
      ))}
    </div>
  );
}
