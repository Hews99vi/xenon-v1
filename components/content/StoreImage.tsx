"use client";
import { useState } from "react";
import Image, { type ImageProps } from "next/image";
// Retry the same asset directly when image optimization or its upstream request fails.
export function StoreImage(props: ImageProps & { src: string }) {
  const [failed, setFailed] = useState({ src: "", attempt: 0 });
  const attempt = failed.src === props.src ? failed.attempt : 0;
  if (attempt > 1)
    return (
      <div
        role="img"
        aria-label={`${props.alt} — image unavailable`}
        className={`${props.fill ? "absolute inset-0" : ""} flex h-full w-full items-center justify-center bg-neutral-100 p-4 text-xs text-neutral-500`}
      >
        Image unavailable
      </div>
    );
  return (
    <Image
      {...props}
      alt={props.alt}
      unoptimized={
        attempt > 0 ||
        props.unoptimized ||
        (props.src.startsWith("/") && props.src.includes("?"))
      }
      onError={() => setFailed({ src: props.src, attempt: attempt + 1 })}
    />
  );
}
