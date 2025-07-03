interface BarHeaderProps {
  message: string;
  shortMessage?: string;
  shortWrap?: boolean;
  maxLines?: number;
  shortMaxLines?: number;
  isFirst?: boolean;
  hideHover?: boolean;
  style?: React.CSSProperties;
}

export const BarHeader = ({
  message,
  shortMessage = message,
  shortWrap,
  maxLines = 1,
  shortMaxLines = maxLines,
  isFirst = false,
  hideHover = false,
  style,
}: BarHeaderProps) => {
  return (
    <div className="relative flex w-full flex-col items-center justify-center">
      <div
        className={`mb-2 flex w-full pl-4 text-[13px] font-semibold uppercase tracking-wider text-gray-500 ${isFirst ? "mt-0" : "mt-5"}`}
        style={style}
      >
        <p
          className={`${shortWrap ? "break-word whitespace-pre-line" : "whitespace-nowrap"} absolute group-hover:opacity-0 ${hideHover ? "opacity-0" : "opacity-65"}`}
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
