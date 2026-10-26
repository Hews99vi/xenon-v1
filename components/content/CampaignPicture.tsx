"use client";
import { useState, type ImgHTMLAttributes } from "react";
import type { ContentImage } from "@/lib/content/schema";
export function CampaignPicture({
  image,
  props,
  mobile,
  priority,
  className,
}: {
  image: ContentImage;
  props: ImgHTMLAttributes<HTMLImageElement>;
  mobile: string | undefined;
  priority: boolean;
  className: string;
}) {
  const [failed, setFailed] = useState({ src: "", attempt: 0 });
  const attempt = failed.src === image.src ? failed.attempt : 0;
  if (attempt > 1)
    return (
      <div
        role="img"
        aria-label={`${image.alt} — image unavailable`}
        className={`bg-neutral-100 ${className}`}
      />
    );
  return (
    <picture className={`block ${className}`}>
      {mobile && (
        <source
          media="(max-width: 640px)"
          srcSet={attempt ? image.mobileSrc : mobile}
        />
      )}
      <img
        {...props}
        src={attempt ? image.src : props.src}
        srcSet={attempt ? undefined : props.srcSet}
        alt={image.alt}
        onError={() => setFailed({ src: image.src, attempt: attempt + 1 })}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
        className="h-full w-full object-cover"
        style={{ objectPosition: `${image.x}% ${image.y}%` }}
      />
    </picture>
  );
}
