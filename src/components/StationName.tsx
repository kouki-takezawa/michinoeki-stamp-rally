interface Props {
  name: string;
  className?: string;
}

export function StationName({ name, className }: Props) {
  return <span className={className}>{name}</span>;
}
