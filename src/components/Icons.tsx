import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

// Inline SVG glyphs — emoji render as empty boxes (tofu) on some
// Android builds/headless shells, so all icons stay vector.

type IconProps = { size?: number; color: string };

export function FlameIcon({ size = 11, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="rgba(242,192,120,0.14)"
      />
    </Svg>
  );
}

export function LaughIcon({ size = 11, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4.5 9c1.4-2.2 3.8-2.2 5.2 0" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
      <Path d="M14.3 9c1.4-2.2 3.8-2.2 5.2 0" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
      <Path d="M5 13.5c1.2 4.6 12.8 4.6 14 0" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
    </Svg>
  );
}

// ── onboarding "how did you hear" row icons ───────────────────

export function TiktokIcon({ size = 16, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="7" cy="16.5" r="2.7" stroke={color} strokeWidth={1.6} />
      <Circle cx="16.4" cy="14.5" r="2.7" stroke={color} strokeWidth={1.6} />
      <Path d="M9.7 16.5V5.6l9.4-1.8v10.7" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function InstagramIcon({ size = 16, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="4" y="4" width="16" height="16" rx="4.5" stroke={color} strokeWidth={1.6} />
      <Circle cx="12" cy="12" r="3.6" stroke={color} strokeWidth={1.6} />
      <Circle cx="16.9" cy="7.1" r="1.15" fill={color} />
    </Svg>
  );
}

export function YoutubeIcon({ size = 16, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="6" width="18" height="12" rx="3.4" stroke={color} strokeWidth={1.6} />
      <Path d="M10.4 9.6v4.8l4.2-2.4-4.2-2.4Z" fill={color} />
    </Svg>
  );
}

export function BroadcastIcon({ size = 16, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M8.2 8.2a5.4 5.4 0 0 0 0 7.6" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
      <Path d="M15.8 8.2a5.4 5.4 0 0 1 0 7.6" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
      <Path d="M5.5 5.5a9.2 9.2 0 0 0 0 13" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
      <Path d="M18.5 5.5a9.2 9.2 0 0 1 0 13" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
      <Circle cx="12" cy="12" r="1.7" fill={color} />
    </Svg>
  );
}

export function FriendsIcon({ size = 16, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="9" cy="9" r="2.8" stroke={color} strokeWidth={1.6} />
      <Path d="M3.6 19.4c.6-3.4 2.9-5 5.4-5s4.8 1.6 5.4 5" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
      <Circle cx="15.9" cy="9.6" r="2.3" stroke={color} strokeWidth={1.6} />
      <Path d="M15.2 14.7c2.4.3 4.3 1.7 4.9 4" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

export function GamepadIcon({ size = 16, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M7.2 8.5h9.6a4.8 4.8 0 0 1 4.8 4.8c0 1.8-1.3 3.2-3 3.2-1 0-1.9-.5-2.5-1.2l-1.2-1.3H9.1l-1.2 1.3c-.6.7-1.5 1.2-2.5 1.2-1.7 0-3-1.4-3-3.2a4.8 4.8 0 0 1 4.8-4.8Z"
        stroke={color}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      <Path d="M8.3 11.2v3.2M6.7 12.8h3.2" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Circle cx="15.6" cy="12" r="0.9" fill={color} />
      <Circle cx="17.7" cy="13.8" r="0.9" fill={color} />
    </Svg>
  );
}

export function ElseIcon({ size = 16, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="8.1" stroke={color} strokeWidth={1.6} />
      <Circle cx="9.3" cy="10" r="0.95" fill={color} />
      <Circle cx="14.7" cy="10" r="0.95" fill={color} />
      <Path d="M8.8 14.2c1.1 1.5 5.3 1.5 6.4 0" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

// ── tab bar + main-app icons ──────────────────────────────────

export function HomeIcon({ size = 20, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 11.5 12 4l8 7.5" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M6 10.5V20h4.5v-5h3v5H18v-9.5" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function JourneyIcon({ size = 20, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5.5 19C4 12 12 15 13 11c1-3.2 5.5-3 5.5-6" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeDasharray="0.5 3.4" />
      <Circle cx="5.5" cy="19" r="2" stroke={color} strokeWidth={1.6} />
      <Circle cx="18.6" cy="5" r="2" stroke={color} strokeWidth={1.6} />
      <Circle cx="18.6" cy="5" r="0.7" fill={color} />
    </Svg>
  );
}

export function GearIcon({ size = 20, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={1.7} />
      <Path
        d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function BellIcon({ size = 18, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 9.5a6 6 0 0 1 12 0c0 4 1.2 5.4 2 6.2H4c.8-.8 2-2.2 2-6.2Z"
        stroke={color}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      <Path d="M10 19a2 2 0 0 0 4 0" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

export function PersonIcon({ size = 18, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="8.4" r="3.6" stroke={color} strokeWidth={1.7} />
      <Path d="M5 20c.8-4 3.6-5.8 7-5.8s6.2 1.8 7 5.8" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
    </Svg>
  );
}

export function PlayIcon({ size = 18, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={1.6} />
      <Path d="M10 8.6v6.8l5.4-3.4L10 8.6Z" fill={color} />
    </Svg>
  );
}

export function HeartIcon({ size = 13, color, filled }: IconProps & { filled?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : 'none'}>
      <Path
        d="M12 20s-7.5-4.4-9.3-9.2C1.6 7.5 3.6 4.5 6.8 4.5c2 0 3.6 1.1 5.2 3.2 1.6-2.1 3.2-3.2 5.2-3.2 3.2 0 5.2 3 4.1 6.3C19.5 15.6 12 20 12 20Z"
        stroke={color}
        strokeWidth={1.7}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function BookmarkIcon({ size = 14, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 3.5h12V21l-6-4.2L6 21V3.5Z" stroke={color} strokeWidth={1.7} strokeLinejoin="round" />
    </Svg>
  );
}

export function LockIcon({ size = 13, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="5" y="10.5" width="14" height="9.5" rx="2.4" stroke={color} strokeWidth={1.7} />
      <Path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" stroke={color} strokeWidth={1.7} />
      <Circle cx="12" cy="15" r="1.4" fill={color} />
    </Svg>
  );
}

export function CheckIcon({ size = 11, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4.5 12.5 10 18 19.5 6.5" stroke={color} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function FlagIcon({ size = 12, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 21V3.5" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M6 4h11.5l-3 4.2 3 4.3H6" stroke={color} strokeWidth={1.7} strokeLinejoin="round" />
    </Svg>
  );
}

// ── coaching room icons ───────────────────────────────────────

export function ChevronLeftIcon({ size = 16, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M14.8 5.2 8 12l6.8 6.8" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function TargetGlyphIcon({ size = 16, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="8.4" stroke={color} strokeWidth={1.6} />
      <Circle cx="12" cy="12" r="4.2" stroke={color} strokeWidth={1.5} />
      <Circle cx="12" cy="12" r="1.3" fill={color} />
    </Svg>
  );
}

export function WavesGlyphIcon({ size = 16, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5.5 8.2c2.6-3.2 3.9-3.2 6.5 0" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
      <Path d="M12.5 12c2.6-3.2 3.9-3.2 6.5 0" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
      <Path d="M5.5 15.8c2.6-3.2 3.9-3.2 6.5 0" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
    </Svg>
  );
}

export function ArrowOutIcon({ size = 16, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 18 18 6" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M10.5 6H18v7.5" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function ClockGlyphIcon({ size = 14, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="8.6" stroke={color} strokeWidth={1.7} />
      <Path d="M12 7v5.2l3.4 2" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function ScanGlyphIcon({ size = 16, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 8.5V5.7A1.7 1.7 0 0 1 5.7 4h2.8M15.5 4h2.8A1.7 1.7 0 0 1 20 5.7v2.8M20 15.5v2.8a1.7 1.7 0 0 1-1.7 1.7h-2.8M8.5 20H5.7A1.7 1.7 0 0 1 4 18.3v-2.8" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
      <Circle cx="12" cy="12" r="2.6" stroke={color} strokeWidth={1.6} />
    </Svg>
  );
}

export function PauseGlyphIcon({ size = 12, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9.2 6.5v11M14.8 6.5v11" stroke={color} strokeWidth={2.4} strokeLinecap="round" />
    </Svg>
  );
}

export function XMarkIcon({ size = 10, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6.5 6.5l11 11M17.5 6.5l-11 11" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
    </Svg>
  );
}

export function RefreshGlyphIcon({ size = 13, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M19.6 12a7.6 7.6 0 1 1-2.2-5.4" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M19.6 4.6V9h-4.4" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function CheckRingIcon({ size = 14, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="8.6" stroke={color} strokeWidth={1.7} />
      <Path d="m8.5 12.4 2.4 2.5 4.6-5.4" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ── community / chat icons ────────────────────────────────────

export function EyeIcon({ size = 13, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" stroke={color} strokeWidth={1.7} strokeLinejoin="round" />
      <Circle cx="12" cy="12" r="2.8" stroke={color} strokeWidth={1.6} />
      <Circle cx="12" cy="12" r="0.9" fill={color} />
    </Svg>
  );
}

export function PlusIcon({ size = 17, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 5.5v13M5.5 12h13" stroke={color} strokeWidth={1.9} strokeLinecap="round" />
    </Svg>
  );
}

export function MicIcon({ size = 15, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="9" y="3.5" width="6" height="11" rx="3" stroke={color} strokeWidth={1.7} />
      <Path d="M6 11.5a6 6 0 0 0 12 0M12 17.5v3.5" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
    </Svg>
  );
}

export function SendIcon({ size = 15, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 19V5M6.5 10.5 12 5l5.5 5.5" stroke={color} strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function SearchIcon({ size = 17, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="10.8" cy="10.8" r="6.3" stroke={color} strokeWidth={1.8} />
      <Path d="m15.6 15.6 4.4 4.4" stroke={color} strokeWidth={1.9} strokeLinecap="round" />
    </Svg>
  );
}

export function ChevronDownIcon({ size = 11, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="m5.5 9 6.5 6.5L18.5 9" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ── SETTINGS TAB glyphs ───────────────────────────────────────

export function ChevronRightIcon({ size = 14, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9.2 5.2 16 12l-6.8 6.8" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function PencilIcon({ size = 15, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M15.6 4.4l4 4L8.5 19.5l-4.8.9.9-4.9Z" stroke={color} strokeWidth={1.6} strokeLinejoin="round" />
      <Path d="M13.7 6.3l4 4" stroke={color} strokeWidth={1.4} strokeLinecap="round" />
    </Svg>
  );
}

export function RouteIcon({ size = 18, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="5.5" cy="18.5" r="2" stroke={color} strokeWidth={1.5} />
      <Circle cx="18.5" cy="5.5" r="2" stroke={color} strokeWidth={1.5} />
      <Path d="M7.6 18.2C13.5 17 10 8 16.4 6.4" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeDasharray="2.8 2.8" />
    </Svg>
  );
}

export function JournalIcon({ size = 18, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M7 4.5h8.5A1.5 1.5 0 0 1 17 6v14H8.5A1.5 1.5 0 0 1 7 18.5Z" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
      <Path d="M7 15.8h10" stroke={color} strokeWidth={1.3} />
      <Path d="M10 8.8h4M10 11.6h2.6" stroke={color} strokeWidth={1.3} strokeLinecap="round" />
    </Svg>
  );
}

export function FilmIcon({ size = 18, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="4" y="6.5" width="16" height="11" rx="2" stroke={color} strokeWidth={1.5} />
      <Path d="M10.4 10v4l3.8-2Z" stroke={color} strokeWidth={1.4} strokeLinejoin="round" />
    </Svg>
  );
}

export function AtIcon({ size = 18, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="3.3" stroke={color} strokeWidth={1.5} />
      <Path d="M15.3 12v1.5a2.3 2.3 0 0 0 4.6.5C20.5 9.5 17 6 12.6 6A7.5 7.5 0 1 0 19.2 15" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

export function PinIcon({ size = 18, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 21s-6.4-5.4-6.4-10.2A6.4 6.4 0 0 1 12 4.4a6.4 6.4 0 0 1 6.4 6.4C18.4 15.6 12 21 12 21Z" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
      <Circle cx="12" cy="10.6" r="2.2" stroke={color} strokeWidth={1.4} />
    </Svg>
  );
}

export function PlanIcon({ size = 18, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3.5" y="6" width="17" height="12" rx="2" stroke={color} strokeWidth={1.5} />
      <Path d="M3.5 10h17" stroke={color} strokeWidth={1.4} />
      <Path d="M7 14.4h5" stroke={color} strokeWidth={1.3} strokeLinecap="round" />
    </Svg>
  );
}

export function HelpIcon({ size = 18, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="8.3" stroke={color} strokeWidth={1.5} />
      <Path d="M9.7 9.5a2.4 2.4 0 1 1 3.3 2.5c-.8.4-1 .8-1 1.9" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Circle cx="12" cy="16.6" r="0.9" fill={color} />
    </Svg>
  );
}

export function LogoutIcon({ size = 18, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M13.5 4.8H7A1.6 1.6 0 0 0 5.4 6.4v11.2A1.6 1.6 0 0 0 7 19.2h6.5" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Path d="M16.8 8.4 20.4 12l-3.6 3.6M20 12H10.5" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function TrashIcon({ size = 18, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 7h14" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Path d="M9.5 7V5.6a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1V7" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Path d="M7.2 7l.7 11.9a1.5 1.5 0 0 0 1.5 1.4h5.2a1.5 1.5 0 0 0 1.5-1.4L16.8 7" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M10.2 10.4v6M13.8 10.4v6" stroke={color} strokeWidth={1.3} strokeLinecap="round" />
    </Svg>
  );
}

export function CheckBadgeIcon({ size = 16, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" fill={color} />
      <Path d="M8 12.4l2.7 2.7L16.2 9.4" stroke="#0a0f0a" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function FootballIcon({ size = 18, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={1.7} />
      <Path d="M12 7.5l3.2 2.3-1.2 3.8h-4l-1.2-3.8L12 7.5z" stroke={color} strokeWidth={1.5} fill="rgba(57,255,106,0.18)" />
      <Path d="M12 7.5V3M15.2 9.8l3.6-1.5M14 13.6l2.5 3M10 13.6l-2.5 3M8.8 9.8L5.2 8.3" stroke={color} strokeWidth={1.4} strokeLinecap="round" />
    </Svg>
  );
}

export function TrophyIcon({ size = 18, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 4h12v4.5a6 6 0 0 1-12 0V4z" stroke={color} strokeWidth={1.7} strokeLinejoin="round" fill="rgba(242,192,120,0.15)" />
      <Path d="M6 6H3.5a1.5 1.5 0 0 0-1.5 1.5v.5a3 3 0 0 0 3 3H6M18 6h2.5a1.5 1.5 0 0 1 1.5 1.5v.5a3 3 0 0 1-3 3H18M12 14.5V18M8 21h8M9 18h6" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function TacticsWhistleIcon({ size = 18, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M14 8h5a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2.5l-1.8 4.2A4.5 4.5 0 1 1 14 8z" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" fill="rgba(57,255,106,0.12)" />
      <Circle cx="8.5" cy="14.5" r="1.5" fill={color} />
      <Path d="M15 8V5" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

export function StarBadgeIcon({ size = 18, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2l2.6 6.3 6.9.6-5.2 4.6 1.6 6.7L12 16.7 6.1 20.2l1.6-6.7-5.2-4.6 6.9-.6L12 2z" stroke={color} strokeWidth={1.6} strokeLinejoin="round" fill="rgba(242,192,120,0.2)" />
    </Svg>
  );
}

export function ClubhouseIcon({ size = 18, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 10.5L12 3l9 7.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 19.5v-9z" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" fill="rgba(57,255,106,0.1)" />
      <Path d="M9 21v-7a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v7" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

export function TillIcon({ size = 15, color }: IconProps) {
  // the academy till — drawer + coin, for the store entry chip
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="6" r="3" stroke={color} strokeWidth="1.8" />
      <Rect x="3.2" y="11" width="17.6" height="10" rx="2" stroke={color} strokeWidth="1.8" />
      <Path d="M3.2 15.2h17.6" stroke={color} strokeWidth="1.8" />
      <Path d="M10 18.2h4" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  );
}
