export function BrandLogo({ light = false, className = "" }: { light?: boolean; className?: string }) {
  return (
    <svg
      viewBox="223 891 1554 218"
      role="img"
      aria-label="Xenon"
      className={`brand-logo ${className}`}
    >
      <image
        href={light ? "/logo/white xenon png.png" : "/logo/black xenon png.png"}
        width="2000"
        height="2000"
      />
    </svg>
  );
}
