interface BarTextProps {
  message: string;
  shortMessage?: string;
  shortWrap?: boolean;
  maxLines?: number;
  shortMaxLines?: number;
  style?: React.CSSProperties;
}

export const BarText = ({
  message,
  shortMessage = message,
  shortWrap,
  maxLines = 1,
  shortMaxLines = maxLines,
  style,
}: BarTextProps) => {
  return (
    <div className="relative flex w-full flex-col items-center justify-center">
      <div
        className="flex w-full text-left text-[13px] text-gray-500 group-hover:pl-4"
        style={style}
      >
        <p
          className={`${shortWrap ? "break-word whitespace-pre-line" : "whitespace-nowrap"} absolute w-full text-center opacity-65 group-hover:opacity-0`}
        >
          {shortMessage}
        </p>
        <p className="absolute w-[calc(228px-12px)] whitespace-pre-line break-keep opacity-0 group-hover:opacity-100">
          {message}
        </p>
        <p className="hidden whitespace-pre-line break-keep opacity-0 group-hover:block">
          {"\n".repeat(maxLines)}
        </p>
        <p className="block whitespace-pre-line break-keep opacity-0 group-hover:hidden">
          {"\n".repeat(shortMaxLines)}
        </p>
      </div>
    </div>
  );
};
