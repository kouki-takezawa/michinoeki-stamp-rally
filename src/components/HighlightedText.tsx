interface Props {
  text: string;
  query: string;
}

export function HighlightedText({ text, query }: Props) {
  const q = query.trim();
  if (!q) return <>{text}</>;
  const index = text.indexOf(q);
  if (index === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, index)}
      <mark className="rounded-sm bg-accent-soft text-accent">{text.slice(index, index + q.length)}</mark>
      {text.slice(index + q.length)}
    </>
  );
}
