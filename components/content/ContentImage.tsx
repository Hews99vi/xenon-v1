import { CampaignPicture } from "./CampaignPicture";
import { getImageProps } from "next/image";
import type { ContentImage as ImageValue } from "@/lib/content/schema";
export function ContentImage({
  image,
  priority = false,
  className = "",
}: {
  image: ImageValue;
  priority?: boolean;
  className?: string;
}) {
  if (!image.src)
    return <div className={`bg-neutral-100 ${className}`} aria-hidden="true" />;
  const supported = (src: string) =>
    (src.startsWith("/") && !src.includes("?")) ||
    /^https:\/\/([^/]+\.)?supabase\.(co|com)\//.test(src) ||
    src.startsWith("https://images.unsplash.com/");
  const props = supported(image.src)
    ? getImageProps({
        src: image.src,
        alt: image.alt,
        width: 1920,
        height: 1280,
        sizes: "100vw",
        quality: 80,
      }).props
    : { src: image.src, alt: image.alt };
  const mobile =
    image.mobileSrc && supported(image.mobileSrc)
      ? getImageProps({
          src: image.mobileSrc,
          alt: image.alt,
          width: 900,
          height: 1200,
          sizes: "100vw",
          quality: 80,
        }).props.srcSet
      : image.mobileSrc;
  return (
    <CampaignPicture
      image={image}
      props={props}
      mobile={mobile || undefined}
      priority={priority}
      className={className}
    />
  );
}
