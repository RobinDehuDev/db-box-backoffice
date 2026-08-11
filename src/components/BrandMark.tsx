export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <circle cx="20" cy="20" r="20" fill="#2A2A2A" />
      <circle cx="20" cy="20" r="12.5" stroke="#F4F4F5" strokeWidth="1.5" />
      <circle cx="20" cy="20" r="7.5" stroke="#C4A35A" strokeWidth="1.5" />
      <circle cx="20" cy="20" r="2.5" fill="#C4A35A" />
    </svg>
  )
}
