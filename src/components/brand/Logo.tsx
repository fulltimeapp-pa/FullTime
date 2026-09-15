type LogoProps = {
  className?: string;
  title?: string;
};

/** Marca FullTime: logo real en avatar circular. */
export function Logo({ className = "h-8 w-8", title = "FullTime" }: LogoProps) {
  return (
    <img
      src="/logo-fulltime.png"
      alt={title}
      className={`shrink-0 rounded-full object-cover ${className}`}
      loading="eager"
      decoding="async"
    />
  );
}
