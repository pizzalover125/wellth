import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { Link, usePathname } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function BottomNavigationBar() {
  const pathname = usePathname();

  const tabs: {
    href: "/" | "/steps" | "/water" | "/weight";
    icon: keyof typeof MaterialCommunityIcons.glyphMap;
    label: string;
  }[] = [
    { href: "/", icon: "home-outline", label: "Home" },
    { href: "/steps", icon: "walk", label: "Steps" },
    { href: "/water", icon: "water", label: "Water" },
    { href: "/weight", icon: "scale-bathroom", label: "Weight" },
  ];

  const handleTabPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  };

  return (
    <LinearGradient
      colors={["#00217aff", "#1844a4ff"]}
      style={styles.container}
    >
      <View style={styles.tabContainer}>
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;

          return (
            <Link key={tab.href} href={tab.href} asChild>
              <TouchableOpacity style={styles.tab} onPress={handleTabPress}>
                <MaterialCommunityIcons
                  name={tab.icon}
                  size={24}
                  color={isActive ? "#ffffff" : "#bfdbfe"}
                />
                <Text
                  style={[
                    styles.tabLabel,
                    styles.pixelFont,
                    { color: isActive ? "#ffffff" : "#bfdbfe" },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            </Link>
          );
        })}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 24,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(191, 219, 254, 0.2)",
  },
  tabContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  tab: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
    minWidth: 48,
  },
  tabLabel: {
    fontSize: 9,
    marginTop: 2,
    textAlign: "center",
    letterSpacing: 0.5,
  },
  pixelFont: {
    fontFamily: "PixelFont",
  },
});
