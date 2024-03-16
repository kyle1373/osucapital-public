interface TitleCardProps {
  title: string;
  subTitle?: string;
  children: JSX.Element;
}

export default function TitleCard(props: TitleCardProps) {
  return (
    <div className="rounded-lg w-full bg-violet-950 border-violet-900 border-2 items-center justify-center overflow-hidden">
      <div className="justify-center items-center  bg-violet-900 p-2">
        <h1 className="text-lg text-white font-semibold text-center">
          {props.title}
        </h1>
        {props.subTitle && (
          <h2 className="text-sm text-white font-normal text-center">
            {props.subTitle}
          </h2>
        )}
      </div>

      <div className="p-2"> {props.children}</div>
    </div>
  );
}
