import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Path, Polygon, Rect, G } from 'react-native-svg';
import { colors, monoFont } from '../theme';

export type ControllerButton =
  | 'Y' | 'X' | 'A' | 'B'               // Xbox Style
  | 'TRIANGLE' | 'SQUARE' | 'CROSS' | 'CIRCLE' // PlayStation Style
  | 'L1' | 'R1' | 'L2' | 'R2'          // PlayStation shoulders/triggers
  | 'LB' | 'RB' | 'LT' | 'RT'          // Xbox shoulders/triggers
  | 'LS' | 'RS'                        // Analog sticks
  | 'LS_FLICK' | 'RS_FLICK'            // Stick flick representations
  | 'DPAD_UP' | 'DPAD_DOWN' | 'DPAD_LEFT' | 'DPAD_RIGHT'; // D-pad

type Props = {
  button: ControllerButton;
  size?: number;
  color?: string;
  outlineColor?: string;
};

export default function ButtonGlyph({
  button,
  size = 20,
  color = colors.fg,
  outlineColor = 'rgba(57,255,106,0.5)',
}: Props) {
  const strokeWidth = 1.6;
  const halfSize = size / 2;

  switch (button) {
    // ── FACE BUTTONS (XBOX) ──
    case 'Y':
    case 'TRIANGLE':
      return (
        <View style={[styles.container, { width: size, height: size }]}>
          <Svg width={size} height={size} viewBox="0 0 24 24">
            <Circle cx="12" cy="12" r="10" stroke={outlineColor} strokeWidth={strokeWidth} fill="rgba(10,15,10,0.8)" />
            <Polygon points="12,6 17.5,15.5 6.5,15.5" stroke={colors.primary} strokeWidth={2} fill="none" />
          </Svg>
        </View>
      );
    case 'B':
    case 'CIRCLE':
      return (
        <View style={[styles.container, { width: size, height: size }]}>
          <Svg width={size} height={size} viewBox="0 0 24 24">
            <Circle cx="12" cy="12" r="10" stroke={outlineColor} strokeWidth={strokeWidth} fill="rgba(10,15,10,0.8)" />
            <Circle cx="12" cy="12" r="5" stroke={colors.loss} strokeWidth={2} fill="none" />
          </Svg>
        </View>
      );
    case 'X':
    case 'SQUARE':
      return (
        <View style={[styles.container, { width: size, height: size }]}>
          <Svg width={size} height={size} viewBox="0 0 24 24">
            <Circle cx="12" cy="12" r="10" stroke={outlineColor} strokeWidth={strokeWidth} fill="rgba(10,15,10,0.8)" />
            <Rect x="7" y="7" width="10" height="10" stroke={colors.accent} strokeWidth={2} fill="none" rx={1} />
          </Svg>
        </View>
      );
    case 'A':
    case 'CROSS':
      return (
        <View style={[styles.container, { width: size, height: size }]}>
          <Svg width={size} height={size} viewBox="0 0 24 24">
            <Circle cx="12" cy="12" r="10" stroke={outlineColor} strokeWidth={strokeWidth} fill="rgba(10,15,10,0.8)" />
            <Path d="M7 7 L17 17 M17 7 L7 17" stroke="#39FF6A" strokeWidth={2.4} strokeLinecap="round" />
          </Svg>
        </View>
      );

    // ── SHOULDER BUTTONS / BUMPERS ──
    case 'L1':
    case 'LB':
      return (
        <View style={[styles.shoulder, { height: size * 0.8, minWidth: size * 1.6, borderColor: outlineColor }]}>
          <Text style={[styles.shText, { fontSize: size * 0.45, color }]}>L1</Text>
        </View>
      );
    case 'R1':
    case 'RB':
      return (
        <View style={[styles.shoulder, { height: size * 0.8, minWidth: size * 1.6, borderColor: outlineColor }]}>
          <Text style={[styles.shText, { fontSize: size * 0.45, color }]}>R1</Text>
        </View>
      );

    // ── TRIGGERS ──
    case 'L2':
    case 'LT':
      return (
        <View style={[styles.trigger, { height: size * 0.9, minWidth: size * 1.6, borderColor: outlineColor }]}>
          <Text style={[styles.shText, { fontSize: size * 0.45, color }]}>L2</Text>
        </View>
      );
    case 'R2':
    case 'RT':
      return (
        <View style={[styles.trigger, { height: size * 0.9, minWidth: size * 1.6, borderColor: outlineColor }]}>
          <Text style={[styles.shText, { fontSize: size * 0.45, color }]}>R2</Text>
        </View>
      );

    // ── ANALOG STICKS ──
    case 'LS':
      return (
        <View style={[styles.container, { width: size, height: size }]}>
          <Svg width={size} height={size} viewBox="0 0 24 24">
            <Circle cx="12" cy="12" r="10" stroke={outlineColor} strokeWidth={strokeWidth} fill="rgba(10,15,10,0.8)" />
            <Circle cx="12" cy="12" r="6" stroke={color} strokeWidth={1.4} />
            <Circle cx="12" cy="12" r="2.5" fill={color} />
          </Svg>
        </View>
      );
    case 'RS':
      return (
        <View style={[styles.container, { width: size, height: size }]}>
          <Svg width={size} height={size} viewBox="0 0 24 24">
            <Circle cx="12" cy="12" r="10" stroke={colors.accent} strokeWidth={strokeWidth} fill="rgba(10,15,10,0.8)" />
            <Circle cx="12" cy="12" r="6" stroke={color} strokeWidth={1.4} />
            <Circle cx="12" cy="12" r="2.5" fill={color} />
          </Svg>
        </View>
      );

    // ── ANALOG STICK FLICKS ──
    case 'LS_FLICK':
      return (
        <View style={[styles.container, { width: size, height: size }]}>
          <Svg width={size} height={size} viewBox="0 0 24 24">
            <Circle cx="12" cy="12" r="10" stroke={outlineColor} strokeWidth={1.2} fill="none" />
            <Circle cx="12" cy="12" r="4.5" stroke={color} strokeWidth={1.4} fill="rgba(57,255,106,0.1)" />
            <Path d="M12 12 L12 4 M10 7 L12 4 L14 7" stroke={colors.primary} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </View>
      );
    case 'RS_FLICK':
      return (
        <View style={[styles.container, { width: size, height: size }]}>
          <Svg width={size} height={size} viewBox="0 0 24 24">
            <Circle cx="12" cy="12" r="10" stroke={colors.accent} strokeWidth={1.2} fill="none" />
            <Circle cx="12" cy="12" r="4.5" stroke={color} strokeWidth={1.4} fill="rgba(242,192,120,0.1)" />
            <Path d="M12 12 L19 12 M16 10 L19 12 L16 14" stroke={colors.accent} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </View>
      );

    // ── D-PAD DIRECTIONS ──
    case 'DPAD_UP':
      return (
        <View style={[styles.container, { width: size, height: size }]}>
          <Svg width={size} height={size} viewBox="0 0 24 24">
            <Rect x="8" y="4" width="8" height="16" stroke={outlineColor} strokeWidth={1.4} fill="rgba(10,15,10,0.8)" rx={1.5} />
            <Rect x="4" y="8" width="16" height="8" stroke={outlineColor} strokeWidth={1.4} fill="rgba(10,15,10,0.8)" rx={1.5} />
            <Path d="M12 10 L12 5 M10 7 L12 5 L14 7" stroke={colors.primary} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </View>
      );
    case 'DPAD_DOWN':
      return (
        <View style={[styles.container, { width: size, height: size }]}>
          <Svg width={size} height={size} viewBox="0 0 24 24">
            <Rect x="8" y="4" width="8" height="16" stroke={outlineColor} strokeWidth={1.4} fill="rgba(10,15,10,0.8)" rx={1.5} />
            <Rect x="4" y="8" width="16" height="8" stroke={outlineColor} strokeWidth={1.4} fill="rgba(10,15,10,0.8)" rx={1.5} />
            <Path d="M12 14 L12 19 M10 17 L12 19 L14 17" stroke={colors.primary} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </View>
      );
    default:
      return null;
  }
}

/** Render a horizontal strip of combo inputs, e.g. [ "L1", "RS_FLICK", "CROSS" ] */
export function InputCombo({ combo, size = 20 }: { combo: ControllerButton[]; size?: number }) {
  return (
    <View style={styles.comboStrip}>
      {combo.map((btn, index) => (
        <React.Fragment key={`${btn}-${index}`}>
          <ButtonGlyph button={btn} size={size} />
          {index < combo.length - 1 && (
            <Text style={styles.comboPlus}>+</Text>
          )}
        </React.Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  shoulder: {
    borderRadius: 5,
    borderWidth: 1.2,
    backgroundColor: 'rgba(10,15,10,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  trigger: {
    borderRadius: 4,
    borderWidth: 1.2,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    backgroundColor: 'rgba(15,26,19,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  shText: {
    fontFamily: monoFont,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: -1,
  },
  comboStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginVertical: 4,
  },
  comboPlus: {
    fontFamily: monoFont,
    fontSize: 10,
    fontWeight: '900',
    color: 'rgba(143,184,155,0.6)',
  },
});
