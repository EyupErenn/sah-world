import Image from "next/image";

export default function AvatarImage({
  src,
  alt = "",
  className,
  size = 96,
  priority = false,
}: {
  src: string;
  alt?: string;
  className?: string;
  size?: number;
  priority?: boolean;
}) {
  return (
    <Image
      src={src}
      alt={alt}
      className={className}
      width={size}
      height={size}
      sizes={`${size}px`}
      priority={priority}
    />
  );
}
