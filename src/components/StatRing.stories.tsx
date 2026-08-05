import React from 'react';
import { View } from 'react-native';
import StatRing from './StatRing';

export default {
  title: 'Components/StatRing',
  component: StatRing,
};

export const Default = () => (
  <View style={{ padding: 20 }}>
    <StatRing label="POSS" value={72} suffix="%" />
  </View>
);

export const Zero = () => (
  <View style={{ padding: 20 }}>
    <StatRing label="CLEAN" value={0} />
  </View>
);
