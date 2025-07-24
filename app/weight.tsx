import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Font from "expo-font";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { LineChart } from "react-native-chart-kit";
import NavigationBar from "../components/NavigationBar";

const STORAGE_KEY = "user_weight_entries";

type WeightEntry = {
  date: string;
  weight: number;
};

function generateMockData(): WeightEntry[] {
  const mockEntries: WeightEntry[] = [];
  const today = new Date();
  const startWeight = 165;

  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    const trend = -0.1 * (29 - i);
    const dailyFluctuation = (Math.random() - 0.5) * 2;
    const weight =
      Math.round((startWeight + trend + dailyFluctuation) * 10) / 10;

    mockEntries.push({
      date: date.toISOString().slice(0, 10),
      weight: weight,
    });
  }

  return mockEntries;
}

function getTodayDate() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function getLast7Days(entries: WeightEntry[]) {
  const today = new Date(getTodayDate());
  return entries.filter((e) => {
    const entryDate = new Date(e.date);
    const diff = (today.getTime() - entryDate.getTime()) / (1000 * 3600 * 24);
    return diff <= 6 && diff >= 0;
  });
}

function getWeeklyChange(entries: WeightEntry[]) {
  const last7 = getLast7Days(entries).sort((a, b) =>
    a.date.localeCompare(b.date)
  );
  if (last7.length < 2) return null;
  const first = last7[0].weight;
  const last = last7[last7.length - 1].weight;
  return last - first;
}

export default function Index() {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [weight, setWeight] = useState("");
  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [showGraph, setShowGraph] = useState(false);

  useEffect(() => {
    Font.loadAsync({
      PixelFont: require("../assets/fonts/Press Start 2P Regular.ttf"),
    }).then(() => setFontsLoaded(true));
    loadEntries();
  }, []);

  async function loadEntries() {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) {
        setEntries(JSON.parse(data));
      } else {
        const mockData = generateMockData();
        setEntries(mockData);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(mockData));
      }
    } catch {}
  }

  async function saveEntries(newEntries: WeightEntry[]) {
    setEntries(newEntries);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newEntries));
  }

  async function loadMockData() {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const mockData = generateMockData();
    await saveEntries(mockData);

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    Alert.alert(
      "Mock Data Loaded",
      "30 days of sample weight entries have been loaded."
    );
  }

  async function clearAllData() {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    Alert.alert(
      "Clear Data",
      "Are you sure you want to clear all weight entries?",
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          },
        },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            await Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Warning
            );
            await saveEntries([]);
            Alert.alert(
              "Data Cleared",
              "All weight entries have been removed."
            );
          },
        },
      ]
    );
  }

  async function handleAddWeight() {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const num = parseFloat(weight);
    if (isNaN(num) || num <= 0) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Invalid weight", "Please enter a valid weight in pounds.");
      return;
    }

    const today = getTodayDate();
    const filtered = entries.filter((e) => e.date !== today);
    const newEntries = [...filtered, { date: today, weight: num }].sort(
      (a, b) => a.date.localeCompare(b.date)
    );
    await saveEntries(newEntries);
    setWeight("");

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Saved!", "Today's weight has been recorded.");
  }

  async function handleShowGraph() {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowGraph(true);
  }

  async function handleBackFromGraph() {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowGraph(false);
  }

  if (!fontsLoaded) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#2563eb" />
        <LinearGradient
          colors={["#619dffff", "#1740b0ff"]}
          style={styles.gradient}
        >
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#ffffff" />
            <Text style={styles.loadingText}>Loading Wellth...</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  const weeklyChange = getWeeklyChange(entries);
  const lastEntry = entries.length > 0 ? entries[entries.length - 1] : null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2563eb" />
      <LinearGradient
        colors={["#619dffff", "#1740b0ff"]}
        style={styles.gradient}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={[styles.title, styles.pixelFont]}>Weight</Text>
            <Text style={[styles.tagline, styles.pixelFont]}>
              Track your weight.
            </Text>
          </View>
          {!showGraph ? (
            <View style={{ flex: 1, justifyContent: "center", gap: 24 }}>
              <View>
                <Text
                  style={[
                    styles.pixelFont,
                    { color: "#fff", fontSize: 16, marginBottom: 8 },
                  ]}
                >
                  Enter today's weight (lbs)
                </Text>
                <TextInput
                  style={{
                    backgroundColor: "#fff",
                    borderRadius: 8,
                    padding: 12,
                    fontSize: 18,
                    fontFamily: "PixelFont",
                    textAlign: "center",
                  }}
                  keyboardType="numeric"
                  value={weight}
                  onChangeText={setWeight}
                  placeholder="e.g. 150"
                  placeholderTextColor="#94a3b8"
                />
                <TouchableOpacity
                  style={[styles.primaryButton, { marginTop: 12 }]}
                  onPress={handleAddWeight}
                >
                  <Text style={styles.primaryButtonText}>Save Weight</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleShowGraph}
              >
                <Text style={styles.secondaryButtonText}>
                  View Weight Graph
                </Text>
              </TouchableOpacity>

              {/* Test Data Controls */}
              {/* <View style={{ gap: 12, marginTop: 24 }}>
                <Text
                  style={[
                    styles.pixelFont,
                    { color: "#bfdbfe", fontSize: 14, textAlign: "center" },
                  ]}
                >
                  Testing Controls
                </Text>
                <TouchableOpacity
                  style={[
                    styles.secondaryButton,
                    {
                      backgroundColor: "rgba(34, 197, 94, 0.2)",
                      borderColor: "#22c55e",
                    },
                  ]}
                  onPress={loadMockData}
                >
                  <Text
                    style={[styles.secondaryButtonText, { color: "#22c55e" }]}
                  >
                    Load Mock Data
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.secondaryButton,
                    {
                      backgroundColor: "rgba(239, 68, 68, 0.2)",
                      borderColor: "#ef4444",
                    },
                  ]}
                  onPress={clearAllData}
                >
                  <Text
                    style={[styles.secondaryButtonText, { color: "#ef4444" }]}
                  >
                    Clear All Data
                  </Text>
                </TouchableOpacity>
              </View> */}
            </View>
          ) : (
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text
                style={[
                  styles.pixelFont,
                  {
                    color: "#fff",
                    fontSize: 18,
                    marginBottom: 12,
                    textAlign: "center",
                  },
                ]}
              >
                Weight Graph (Last 7 Days)
              </Text>
              {entries.length < 2 ? (
                <Text
                  style={[
                    styles.pixelFont,
                    { color: "#fff", fontSize: 16, textAlign: "center" },
                  ]}
                >
                  Not enough data to show graph.
                </Text>
              ) : (
                <LineChart
                  data={{
                    labels: entries.slice(-7).map((e) => e.date.slice(5)),
                    datasets: [
                      {
                        data: entries.slice(-7).map((e) => e.weight),
                      },
                    ],
                  }}
                  width={Dimensions.get("window").width - 64}
                  height={220}
                  chartConfig={{
                    backgroundColor: "#1740b0",
                    backgroundGradientFrom: "#619dff",
                    backgroundGradientTo: "#1740b0",
                    decimalPlaces: 1,
                    color: (opacity = 1) => `rgba(255,255,255,${opacity})`,
                    labelColor: (opacity = 1) => `rgba(255,255,255,${opacity})`,
                    style: { borderRadius: 16 },
                    propsForDots: {
                      r: "5",
                      strokeWidth: "2",
                      stroke: "#2563eb",
                    },
                  }}
                  bezier
                  style={{ borderRadius: 16 }}
                />
              )}
              <View style={{ height: 24 }} />
              <View style={{ gap: 8 }}>
                <Text
                  style={[styles.pixelFont, { color: "#fff", fontSize: 11 }]}
                >
                  Last entry:{" "}
                  {lastEntry
                    ? `${lastEntry.weight} lbs on ${lastEntry.date}`
                    : "No entries yet"}
                </Text>
                <Text
                  style={[styles.pixelFont, { color: "#fff", fontSize: 11 }]}
                >
                  Weekly change:{" "}
                  {weeklyChange === null
                    ? "N/A"
                    : `${weeklyChange > 0 ? "+" : ""}${weeklyChange.toFixed(
                        1
                      )} lbs`}
                </Text>
                <Text
                  style={[styles.pixelFont, { color: "#fff", fontSize: 11 }]}
                >
                  Entries: {entries.length}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.primaryButton, { marginTop: 20 }]}
                onPress={handleBackFromGraph}
              >
                <Text style={styles.primaryButtonText}>Back</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
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
    flexGrow: 1,
    justifyContent: "space-between",
    paddingHorizontal: 32,
    paddingTop: 120,
    paddingBottom: 60,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  title: {
    fontSize: 40,
    fontWeight: "300",
    color: "#ffffff",
    marginBottom: 8,
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 18,
    color: "#bfdbfe",
    fontWeight: "400",
    letterSpacing: 0.5,
  },
  pixelFont: {
    fontFamily: "PixelFont",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
  },
  loadingText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "400",
    textAlign: "center",
  },
  actions: {
    gap: 16,
  },
  primaryButton: {
    backgroundColor: "#1e40af",
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: "center",
    elevation: 4,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "PixelFont",
  },
  secondaryButton: {
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#7c3aed",
  },
  secondaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "500",
    fontFamily: "PixelFont",
  },
});
