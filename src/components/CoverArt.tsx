import { useEffect, useState } from "react";
import { Music } from "lucide-react";

type CoverArtProps = {
  src?: string;
  alt: string;
  className?: string;
  iconClassName?: string;
};

export default function CoverArt({
  src,
  alt,
  className = "",
  iconClassName = "w-5 h-5 text-zinc-500",
}: CoverArtProps) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  if (!src || hasError) {
    return (
      <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900 ${className}`}>
        <Music className={iconClassName} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setHasError(true)}
    />
  );
}
