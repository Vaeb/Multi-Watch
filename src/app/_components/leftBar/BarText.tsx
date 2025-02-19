interface BarTextProps {
  message: string;
  shortMessage?: string;
  shortWrap?: boolean;
  maxLines?: number;
}

export const BarText = ({
  message,
  shortMessage = message,
  shortWrap,
  maxLines = 1,
}: BarTextProps) => {
  return (
    <div className="relative flex w-full flex-col items-center justify-center">
      <div className="ml-[12px] flex w-full text-left text-sm">
        <p
          className={`${shortWrap ? "break-word whitespace-pre-line" : "whitespace-nowrap"} absolute opacity-65 group-hover:opacity-0`}
        >
          {shortMessage}
        </p>
        <p className="absolute w-[calc(228px-12px)] whitespace-pre-line break-keep opacity-0 group-hover:opacity-100">
          {message}
        </p>
        <p className="whitespace-pre-line break-keep opacity-0">
          {"\n".repeat(maxLines)}
        </p>
      </div>
    </div>
  );
};
