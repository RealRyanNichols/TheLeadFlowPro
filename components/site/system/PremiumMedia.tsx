import Image from "next/image";

type PremiumMediaProps = {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  sizes?: string;
  priority?: boolean;
  kicker?: string;
  caption?: string;
  className?: string;
};

export default function PremiumMedia({
  src,
  alt,
  width = 1920,
  height = 1080,
  sizes = "(max-width: 960px) calc(100vw - 40px), 56vw",
  priority = false,
  kicker,
  caption,
  className = "",
}: PremiumMediaProps) {
  return (
    <figure className={`cb-hero-visual ${className}`.trim()}>
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        sizes={sizes}
        priority={priority}
      />
      {kicker || caption ? (
        <figcaption>
          {kicker ? <span>{kicker}</span> : <span aria-hidden="true" />}
          {caption ? <strong>{caption}</strong> : null}
        </figcaption>
      ) : null}
    </figure>
  );
}

