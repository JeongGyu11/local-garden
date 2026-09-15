import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SeedVisual as SeedVisualType } from '../types';

interface SeedVisualProps {
  visual?: SeedVisualType;
  emoji?: string;
  size?: number;
}

const DEFAULT_VISUAL: SeedVisualType = {
  theme: 'local',
  primaryColor: '#6E9F44',
  secondaryColor: '#F2D36B',
  accentColor: '#FFF8D9',
  pattern: 'leaf',
};

const themeGlyph: Record<SeedVisualType['theme'], string> = {
  art: '✦',
  history: '◆',
  nature: '⌁',
  sea: '≈',
  mountain: '▲',
  market: '✣',
  festival: '✦',
  local: '⌁',
};

const patternGlyph: Record<SeedVisualType['pattern'], string> = {
  paint: '●',
  metal: '◆',
  wave: '≈',
  leaf: '⌁',
  stone: '▲',
  tile: '▦',
  spice: '✣',
  sparkle: '✦',
};

const getContrastInk = (theme: SeedVisualType['theme']) =>
  theme === 'sea' || theme === 'festival' || theme === 'art' ? '#FFF8DA' : '#2B2118';

export const SeedVisual: React.FC<SeedVisualProps> = ({
  visual,
  emoji = '🌱',
  size = 42,
}) => {
  const seedVisual = visual ?? DEFAULT_VISUAL;
  const scale = size / 42;
  const packetRadius = size * 0.16;
  const inkColor = getContrastInk(seedVisual.theme);

  return (
    <View
      style={[
        styles.shadowWrap,
        {
          width: size,
          height: size,
          borderRadius: packetRadius,
        },
      ]}
    >
      <View
        style={[
          styles.packet,
          {
            borderRadius: packetRadius,
            borderColor: seedVisual.secondaryColor,
            backgroundColor: seedVisual.accentColor,
          },
        ]}
      >
        <View
          style={[
            styles.packetTop,
            {
              height: size * 0.36,
              backgroundColor: seedVisual.primaryColor,
            },
          ]}
        >
          <View
            style={[
              styles.sunDot,
              {
                width: size * 0.13,
                height: size * 0.13,
                borderRadius: size * 0.07,
                backgroundColor: seedVisual.secondaryColor,
                right: size * 0.09,
                top: size * 0.07,
              },
            ]}
          />
          <View
            style={[
              styles.hillBack,
              {
                borderLeftWidth: size * 0.17,
                borderRightWidth: size * 0.17,
                borderBottomWidth: size * 0.13,
                borderBottomColor: seedVisual.secondaryColor,
                left: size * 0.02,
                bottom: -1,
              },
            ]}
          />
          <View
            style={[
              styles.hillFront,
              {
                borderLeftWidth: size * 0.2,
                borderRightWidth: size * 0.2,
                borderBottomWidth: size * 0.16,
                borderBottomColor: seedVisual.accentColor,
                right: -size * 0.04,
                bottom: -1,
              },
            ]}
          />
        </View>

        <View style={[styles.packetFold, { borderTopColor: seedVisual.secondaryColor }]} />

        <View
          style={[
            styles.badge,
            {
              width: size * 0.36,
              height: size * 0.36,
              borderRadius: size * 0.18,
              backgroundColor: seedVisual.primaryColor,
              borderColor: seedVisual.secondaryColor,
              top: size * 0.24,
            },
          ]}
        >
          <Text
            style={[
              styles.themeGlyph,
              {
                color: inkColor,
                fontSize: 12 * scale,
              },
            ]}
          >
            {themeGlyph[seedVisual.theme]}
          </Text>
        </View>

        <View style={[styles.seedCluster, { bottom: size * 0.09 }]}>
          {[0, 1, 2].map((item) => (
            <View
              key={item}
              style={[
                styles.seedKernel,
                {
                  width: size * 0.12,
                  height: size * 0.18,
                  borderRadius: size * 0.08,
                  backgroundColor:
                    item === 1 ? seedVisual.primaryColor : seedVisual.secondaryColor,
                  borderColor: item === 1 ? seedVisual.secondaryColor : seedVisual.primaryColor,
                  transform: [{ rotate: item === 0 ? '-22deg' : item === 2 ? '22deg' : '0deg' }],
                },
              ]}
            />
          ))}
        </View>

        <Text
          style={[
            styles.patternGlyph,
            {
              color: seedVisual.primaryColor,
              fontSize: 7 * scale,
              left: size * 0.08,
              bottom: size * 0.07,
            },
          ]}
        >
          {patternGlyph[seedVisual.pattern]}
        </Text>
        <Text style={[styles.fallbackEmoji, { fontSize: 7 * scale }]}>{emoji}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  shadowWrap: {
    shadowColor: '#2E1D0F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 3,
    elevation: 3,
  },
  packet: {
    flex: 1,
    overflow: 'hidden',
    borderWidth: 2,
  },
  packetTop: {
    width: '100%',
    overflow: 'hidden',
  },
  sunDot: {
    position: 'absolute',
  },
  hillBack: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  hillFront: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  packetFold: {
    position: 'absolute',
    top: '35%',
    left: 0,
    right: 0,
    height: 0,
    borderTopWidth: 2,
    opacity: 0.75,
  },
  badge: {
    position: 'absolute',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  themeGlyph: {
    fontWeight: '900',
    includeFontPadding: false,
    textAlign: 'center',
  },
  seedCluster: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: 2,
  },
  seedKernel: {
    borderWidth: 1,
  },
  patternGlyph: {
    position: 'absolute',
    fontWeight: '900',
    opacity: 0.75,
    includeFontPadding: false,
  },
  fallbackEmoji: {
    position: 'absolute',
    right: 2,
    bottom: 1,
    opacity: 0.42,
    includeFontPadding: false,
  },
});
