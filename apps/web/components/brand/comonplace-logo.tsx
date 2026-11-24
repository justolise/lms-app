import Image from "next/image";
import { cn } from "@/utils/classnames";

export type ComonPlaceLogoVariant =
  | "primary"
  | "mark"
  | "light"
  | "dark"
  | "compact"
  | "monochrome";

export type ComonPlaceLogoSize = "sm" | "md" | "lg";

export interface ComonPlaceLogoProps {
  variant?: ComonPlaceLogoVariant;
  size?: ComonPlaceLogoSize;
  subtitle?: string;
  className?: string;
}

const SIZE_MAP: Record<
  ComonPlaceLogoSize,
  { mark: number; text: string; sub: string; gap: string }
> = {
  sm: { mark: 28, text: "text-sm", sub: "text-[10px]", gap: "gap-2" },
  md: { mark: 36, text: "text-base", sub: "text-[11px]", gap: "gap-2.5" },
  lg: { mark: 44, text: "text-lg", sub: "text-xs", gap: "gap-3" },
};

/**
 * Shared ComonPlace brand logo component backed by the approved book-C ("bookc") mark.
 * Never distorts, stretches, rotates, or adds shadows to the mark.
 */
export function ComonPlaceLogo({
  variant = "primary",
  size = "md",
  subtitle,
  className,
}: ComonPlaceLogoProps) {
  const s = SIZE_MAP[size];
  const isLight = variant === "light";
  const isMonochrome = variant === "monochrome";
  const isMarkOnly = variant === "mark";
  const isCompact = variant === "compact";

  return (
    <span
      className={cn(
        "inline-flex items-center select-none shrink-0",
        s.gap,
        className,
      )}
    >
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-lg overflow-hidden shrink-0",
          isLight
            ? "bg-white/10 p-1"
            : isMonochrome
              ? "bg-transparent"
              : "bg-forest-800 p-1",
        )}
        style={{ width: s.mark, height: s.mark }}
      >
        <Image
          src={
            isLight
              ? "/brand/favicon/favicon-light-32.png"
              : "/brand/comonplace-mark.png"
          }
          alt="ComonPlace open-book C mark"
          width={s.mark}
          height={s.mark}
          className={cn(
            "h-full w-full object-contain",
            isMonochrome && "grayscale contrast-125",
          )}
          priority
        />
      </span>

      {!isMarkOnly && (
        <span className="flex flex-col leading-tight">
          <span
            className={cn(
              "font-serif font-bold tracking-tight",
              s.text,
              isLight ? "text-white" : "text-foreground",
            )}
          >
            ComonPlace
          </span>
          {!isCompact && subtitle && (
            <span
              className={cn(
                "font-sans leading-none",
                s.sub,
                isLight ? "text-gold-200" : "text-muted-foreground",
              )}
            >
              {subtitle}
            </span>
          )}
        </span>
      )}
    </span>
  );
}
