import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

function BaseIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    />
  )
}

export function IconMenu(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </BaseIcon>
  )
}

export function IconBell(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M6.5 16.5h11" />
      <path d="M8 16.5V11a4 4 0 0 1 8 0v5.5" />
      <path d="M5.5 16.5h13" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </BaseIcon>
  )
}

export function IconLogout(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4" />
      <path d="M16 16l4-4-4-4" />
      <path d="M20 12H9" />
    </BaseIcon>
  )
}

export function IconShield(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 3l7 3v6c0 4.5-2.8 7.8-7 9-4.2-1.2-7-4.5-7-9V6l7-3Z" />
      <path d="m9.5 12 1.8 1.8L14.8 10" />
    </BaseIcon>
  )
}

export function IconBuilding(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4 21h16" />
      <path d="M7 21V6l5-2 5 2v15" />
      <path d="M10 9h1" />
      <path d="M13 9h1" />
      <path d="M10 12h1" />
      <path d="M13 12h1" />
      <path d="M11 21v-4h2v4" />
    </BaseIcon>
  )
}

export function IconBriefcase(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M3 8h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8Z" />
      <path d="M9 8V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
      <path d="M3 12h18" />
    </BaseIcon>
  )
}

export function IconFile(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M7 3h7l5 5v13H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6" />
      <path d="M9 17h6" />
    </BaseIcon>
  )
}

export function IconMapPin(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 22s6-5.6 6-11a6 6 0 1 0-12 0c0 5.4 6 11 6 11Z" />
      <path d="M12 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
    </BaseIcon>
  )
}
