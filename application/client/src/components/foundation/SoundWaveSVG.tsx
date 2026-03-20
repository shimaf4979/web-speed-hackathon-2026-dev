import { useRef } from "react";

interface Props {
  peaks: number[];
}

export const SoundWaveSVG = ({ peaks }: Props) => {
  const uniqueIdRef = useRef(Math.random().toString(16));

  return (
    <svg className="h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 1">
      {peaks.map((peak, idx) => {
        return (
          <rect
            key={`${uniqueIdRef.current}#${idx}`}
            fill="var(--color-cax-accent)"
            height={peak}
            width="1"
            x={idx}
            y={1 - peak}
          />
        );
      })}
    </svg>
  );
};
