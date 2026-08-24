import React from 'react';
import Svg, { Path, Line, Circle } from 'react-native-svg';
import { colors } from '../../theme';

type IconProps = { color?: string; size?: number };

export function MenuIcon({ color = colors.fg, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Line x1={4} y1={7} x2={20} y2={7} stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Line x1={4} y1={12} x2={20} y2={12} stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Line x1={4} y1={17} x2={14} y2={17} stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

export function SearchIcon({ color = colors.muted, size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M10.5 4a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13z" fill="none" stroke={color} strokeWidth={1.8} />
      <Line x1={15.4} y1={15.4} x2={20} y2={20} stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

export function BellIcon({ color = colors.fg, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 3a6 6 0 0 0-6 6v3.2L4 15.5v1h16v-1l-2-3.3V9a6 6 0 0 0-6-6z"
        fill="none"
        stroke={color}
        strokeWidth={1.7}
        strokeLinejoin="round"
      />
      <Path d="M9.8 18.5a2.3 2.3 0 0 0 4.4 0z" fill={color} />
    </Svg>
  );
}

export function HeartIcon({ color = colors.muted, size = 24, filled = false }: IconProps & { filled?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 20.3C7.4 17 2.8 13.4 2.8 9.2 2.8 6.4 4.9 4.3 7.5 4.3c1.6 0 3.1.7 4.5 2.2 1.4-1.5 2.9-2.2 4.5-2.2 2.6 0 4.7 2.1 4.7 4.9 0 4.2-4.6 7.8-9.2 11.1z"
        fill={filled ? color : 'none'}
        stroke={color}
        strokeWidth={1.7}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function CommentIcon({ color = colors.muted, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 4C6.9 4 2.8 7.4 2.8 11.6c0 2.4 1.3 4.5 3.3 6-.2 1.5-1 2.8-2 3.8 2.1-.1 4-.9 5.5-1.9 1.1.3 2.2.5 3.4.5 5.1 0 9.2-3.4 9.2-7.9S17.1 4 12 4z"
        fill="none"
        stroke={color}
        strokeWidth={1.7}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ShareIcon({ color = colors.muted, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 4l4.8 4.8h-3v7.2h-3.6V8.8h-3L12 4z" fill={color} />
      <Path d="M6 13.5v5h12v-5h-2.1v2.9H8.1v-2.9H6z" fill={color} />
    </Svg>
  );
}

export function BookmarkIcon({ color = colors.muted, size = 24, filled = false }: IconProps & { filled?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M7 4h10a1 1 0 0 1 1 1v15l-6-4.2L6 20V5a1 1 0 0 1 1-1z"
        fill={filled ? color : 'none'}
        stroke={color}
        strokeWidth={1.7}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function LoopIcon({ color = colors.fg, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M17 6.5A7 7 0 0 0 5.6 10.2"
        fill="none"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Path d="M5.2 6.2v4.2h4.2z" fill={color} />
      <Path
        d="M7 17.5a7 7 0 0 0 11.4-3.7"
        fill="none"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Path d="M18.8 17.8v-4.2h-4.2z" fill={color} />
    </Svg>
  );
}

export function PeopleIcon({ color = colors.fg, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={9} cy={8.5} r={3.4} fill="none" stroke={color} strokeWidth={1.8} />
      <Path d="M3.5 19.5c.6-3.2 2.9-4.9 5.5-4.9s4.9 1.7 5.5 4.9z" fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
      <Path d="M15.5 5.6a3.4 3.4 0 0 1 0 5.8" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M17.2 14.9c2 .4 3.3 1.8 3.7 4" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

export function HomeIcon({ color = colors.fg, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M4.5 10.5L12 4l7.5 6.5V20h-5v-5.5h-5V20h-5z" fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
    </Svg>
  );
}

export function VerifiedIcon({ color = colors.primary, size = 16 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 2l2.4 2.1 3.2-.4 1 3 3 1-.4 3.2L24 13l-1.9 2.4.4 3.2-3 1-1 3-3.2-.4L12 24l-2.3-1.7-3.2.4-1-3-3-1 .4-3.2L1 13l1.9-2.4-.4-3.2 3-1 1-3 3.2.4z"
        fill={color}
      />
      <Path d="M8.5 12.5l2.3 2.3 4.7-4.8" fill="none" stroke="#050a06" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
