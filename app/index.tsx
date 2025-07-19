import * as Font from 'expo-font';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import { StatusBar, StyleSheet, Text, View } from 'react-native';
import NavigationBar from '../components/NavigationBar';

export default function Index() {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    Font.loadAsync({
      'PixelFont': require('../assets/fonts/Press Start 2P Regular.ttf'),
    }).then(() => setFontsLoaded(true));
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2563eb" />
      <LinearGradient
        colors={['#3b82f6', '#1d4ed8']}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={[styles.title, styles.pixelFont]}>Wellth</Text>
            <Text style={[styles.tagline, styles.pixelFont]}>Manage your health.</Text>
          </View>
        </View>
        <NavigationBar />
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
  flex: 1,
  },
  gradient: {
  flex: 1,
  },
  content: {
  flex: 1,
  justifyContent: 'space-between',
  paddingHorizontal: 32,
  paddingTop: 120,
  paddingBottom: 60,
  },
  header: {
  alignItems: 'center',
  },
  title: {
  fontSize: 40,
  fontWeight: '300',
  color: '#ffffff',
  marginBottom: 8,
  letterSpacing: -1,
  },
  tagline: {
  fontSize: 18,
  color: '#bfdbfe',
  fontWeight: '400',
  letterSpacing: 0.5,
  },
  pixelFont: {
  fontFamily: 'PixelFont',
  },
  actions: {
  gap: 16,
  },
  primaryButton: {
  backgroundColor: '#ffffff',
  paddingVertical: 18,
  paddingHorizontal: 32,
  borderRadius: 12,
  alignItems: 'center',
  shadowColor: '#000',
  shadowOffset: {
    width: 0,
    height: 4,
  },
  shadowOpacity: 0.1,
  shadowRadius: 8,
  elevation: 4,
  },
  primaryButtonText: {
  color: '#1d4ed8',
  fontSize: 16,
  fontWeight: '600',
  fontFamily: 'PixelFont',
  },
  secondaryButton: {
  paddingVertical: 18,
  paddingHorizontal: 32,
  borderRadius: 12,
  alignItems: 'center',
  borderWidth: 1,
  borderColor: '#bfdbfe',
  },
  secondaryButtonText: {
  color: '#ffffff',
  fontSize: 16,
  fontWeight: '500',
  fontFamily: 'PixelFont',
  },
});