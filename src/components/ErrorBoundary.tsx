import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { colors, monoFont } from '../theme';

type Props = { children: React.ReactNode };
type State = { hasError: boolean; error: Error | null };

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Never crash the process — log for debugging, but keep the app alive
    // eslint-disable-next-line no-console
    console.error('[ProSeasonAcademy] Uncaught render error:', error, info.componentStack);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const message = this.state.error?.message || 'Unknown error';
    return (
      <View style={styles.root}>
        <View style={styles.card}>
          <Text style={styles.title}>THE ACADEMY HIT A SNAG</Text>
          <Text style={styles.subtitle}>
            The app ran into an unexpected error but it did not close. Tap reload to get back on the floor.
          </Text>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            <Text style={styles.errorText} selectable>
              {message}
            </Text>
          </ScrollView>
          <Pressable style={styles.button} onPress={this.handleReset}>
            <Text style={styles.buttonText}>RELOAD ACADEMY</Text>
          </Pressable>
          <Text style={styles.hint}>If this keeps happening, clear storage or reinstall a fresh build (EAS v3, RN 0.86.2).</Text>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.18)',
    backgroundColor: 'rgba(13,23,16,0.96)',
    borderRadius: 16,
    padding: 20,
  },
  title: {
    fontFamily: monoFont,
    fontSize: 13,
    letterSpacing: 1.8,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 12,
  },
  subtitle: {
    fontFamily: monoFont,
    fontSize: 12,
    lineHeight: 16,
    color: colors.muted,
    marginBottom: 12,
  },
  scroll: {
    maxHeight: 140,
    marginBottom: 16,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  scrollContent: { padding: 10 },
  errorText: {
    fontFamily: monoFont,
    fontSize: 10,
    color: 'rgba(255,120,120,0.9)',
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: {
    fontFamily: monoFont,
    fontSize: 12,
    letterSpacing: 1.2,
    fontWeight: '800',
    color: '#041108',
  },
  hint: {
    fontFamily: monoFont,
    fontSize: 9,
    color: 'rgba(143,184,155,0.45)',
    lineHeight: 12,
  },
});

export default ErrorBoundary;
