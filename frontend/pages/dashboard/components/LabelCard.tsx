interface LabelCardProps {
  label: string;
  secondLabel?: string;
}

export default function LabelCard(props: LabelCardProps) {
  return (
    <div className="rounded-lg w-full bg-violet-950 p-3 text-center justify-center items-center">
      <h1 className="font-semibold text-xl text-white">{props.label}</h1>
      {props.secondLabel && (
        <h1 className="font-semibold text-xl text-white">
          {props.secondLabel}
        </h1>
      )}
    </div>
  );
}
