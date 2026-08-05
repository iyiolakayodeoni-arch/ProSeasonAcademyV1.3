import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SvgXml } from 'react-native-svg';

export default function MarketingShareCard({ svg, width = 332 }: { svg: string; width?: number }) {
  const height = Math.round((width * 1350) / 1080);
  return (
    <View style={[styles.shell, { width, height }]}> 
      <SvgXml xml={svg} width="100%" height="100%" />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
});
