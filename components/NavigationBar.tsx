import { LinearGradient } from 'expo-linear-gradient';
import { Link, usePathname } from 'expo-router';
import { Droplets, Home, Scale, TrendingUp } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function BottomNavigationBar() {
  const pathname = usePathname();

  const tabs = [
    { href: '/', icon: Home, label: 'Home' },
    { href: '/water', icon: Droplets, label: 'Water' },
    { href: '/steps', icon: TrendingUp, label: 'Steps' },
    { href: '/weight', icon: Scale, label: 'Weight' },
  ];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(29, 78, 216, 0.95)', 'rgba(59, 130, 246, 0.85)']}
        style={styles.navContainer}
      >
        <View style={styles.navContent}>
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            const isActive = pathname === tab.href;
            
            return (
              <Link href={tab.href as any} asChild key={tab.href}>
                <TouchableOpacity
                  style={[
                    styles.tabButton,
                    isActive && styles.activeTabButton
                  ]}
                >
                  <View style={styles.iconContainer}>
                    <IconComponent 
                      size={22} 
                      color={isActive ? '#ffffff' : '#bfdbfe'}
                      strokeWidth={isActive ? 2.5 : 2}
                    />
                  </View>
                  <Text style={[
                    styles.tabLabel,
                    isActive && styles.activeTabLabel
                  ]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              </Link>
            );
          })}
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  navContainer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    paddingTop: 12,
    paddingBottom: 24,
    paddingHorizontal: 16,
  },
  navContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    minWidth: 60,
    flex: 1,
  },
  activeTabButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 22,
    height: 22,
  },
  tabLabel: {
    fontSize: 12,
    color: '#bfdbfe',
    fontWeight: '500',
    marginTop: 4,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  activeTabLabel: {
    color: '#ffffff',
    fontWeight: '600',
  },
});