const KANJI_RE = /[一-龯]/;

interface Props {
  name: string;
  nameKana?: string;
  className?: string;
}

export function StationName({ name, nameKana, className }: Props) {
  if (!nameKana || !KANJI_RE.test(name)) {
    return <span className={className}>{name}</span>;
  }
  return (
    <ruby className={className}>
      {name}
      <rt className="text-[0.55em] font-normal text-ink-faint">{nameKana}</rt>
    </ruby>
  );
}
