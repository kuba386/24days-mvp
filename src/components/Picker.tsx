export type PickerOption = { id: string; label: string; advice: string };
export type PickerSpec = { label: string; options: PickerOption[] };

type Props = {
  spec: PickerSpec;
  picked: string[];
  disabled: boolean;
  onChange: (picked: string[]) => void;
};

// Выбор причин с готовым советом под каждую — вместо того чтобы придумывать решение с нуля
export function Picker({ spec, picked, disabled, onChange }: Props) {
  const chosen = spec.options.filter((o) => picked.includes(o.id));

  return (
    <div className="scorecard">
      <span className="action__label">{spec.label}</span>
      <div className="chips">
        {spec.options.map((o) => {
          const on = picked.includes(o.id);
          return (
            <button
              key={o.id}
              type="button"
              className={`chip ${on ? 'chip--on' : ''}`}
              aria-pressed={on}
              disabled={disabled}
              onClick={() => onChange(on ? picked.filter((p) => p !== o.id) : [...picked, o.id])}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      {chosen.length > 0 && (
        <ul className="picker__advice">
          {chosen.map((o) => (
            <li key={o.id}>
              <span className="picker__advice-title">{o.label}</span>
              {o.advice}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
