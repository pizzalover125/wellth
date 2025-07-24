import { Ionicons } from "@expo/vector-icons";
import * as Font from "expo-font";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import * as SecureStore from "expo-secure-store";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Modal,
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

interface SessionLog {
  id: string;
  amount: number;
  time: Date;
  name?: string;
}

interface ChartData {
  labels: string[];
  datasets: [
    {
      data: number[];
      color?: (opacity?: number) => string;
      strokeWidth?: number;
    }
  ];
}

const STORAGE_KEY = "WaterApp_sessionLog";
const GOALS_STORAGE_KEY = "WaterApp_dailyGoal";
const { width: screenWidth } = Dimensions.get("window");

const getChartWidth = () => screenWidth - 80;

export default function Index() {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [sessionLog, setSessionLog] = useState<SessionLog[]>([]);
  const [showLog, setShowLog] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [editingSession, setEditingSession] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [dailyGoal, setDailyGoal] = useState(2000);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [tempGoalInput, setTempGoalInput] = useState("");
  const [goalAchieved, setGoalAchieved] = useState(false);

  const [waterInput, setWaterInput] = useState("250");

  const loadDailyGoal = async () => {
    try {
      const savedGoal = await SecureStore.getItemAsync(GOALS_STORAGE_KEY);
      if (savedGoal) setDailyGoal(parseInt(savedGoal));
    } catch (error) {
      console.error("Error loading daily goal:", error);
    }
  };

  const saveDailyGoal = async (goal: number) => {
    try {
      await SecureStore.setItemAsync(GOALS_STORAGE_KEY, goal.toString());
    } catch (error) {
      console.error("Error saving daily goal:", error);
    }
  };

  const updateDailyGoal = (newGoal: number) => {
    setDailyGoal(newGoal);
    saveDailyGoal(newGoal);
  };

  const getTotalWaterToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return sessionLog
      .filter((s) => {
        const t = new Date(s.time);
        t.setHours(0, 0, 0, 0);
        return t.getTime() === today.getTime();
      })
      .reduce((sum, s) => sum + s.amount, 0);
  };

  const getGoalProgress = () => {
    const total = getTotalWaterToday();
    if (total === 0) return 0;
    return Math.min((total / dailyGoal) * 100, 100);
  };

  const checkGoalAchievement = () => {
    const total = getTotalWaterToday();
    const wasAchieved = goalAchieved;
    const isAchieved = total >= dailyGoal;
    setGoalAchieved(isAchieved);

    if (isAchieved && !wasAchieved) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const openGoalModal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTempGoalInput(dailyGoal.toString());
    setShowGoalModal(true);
  };

  const saveGoal = () => {
    const newGoal = parseInt(tempGoalInput);
    if (isNaN(newGoal) || newGoal <= 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Invalid Goal", "Please enter a valid number greater than 0");
      return;
    }
    if (newGoal > 10000) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Goal Too High", "Please enter a goal less than 10,000ml");
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    updateDailyGoal(newGoal);
    setShowGoalModal(false);
    setTempGoalInput("");
  };

  const loadSessionLog = async () => {
    try {
      const savedLog = await SecureStore.getItemAsync(STORAGE_KEY);
      if (savedLog) {
        const parsedLog = JSON.parse(savedLog);
        const logWithDates = parsedLog.map((session: any) => ({
          ...session,
          time: new Date(session.time),
        }));
        setSessionLog(logWithDates);
      }
    } catch (error) {
      console.error("Error loading session log:", error);
      setSessionLog([]);
    }
  };

  const saveSessionLog = async (log: SessionLog[]) => {
    try {
      await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(log));
    } catch (error) {
      console.error("Error saving session log:", error);
    }
  };

  const updateSessionLog = (newLog: SessionLog[]) => {
    setSessionLog(newLog);
    saveSessionLog(newLog);
  };

  useEffect(() => {
    const initialize = async () => {
      try {
        await Font.loadAsync({
          PixelFont: require("../assets/fonts/Press Start 2P Regular.ttf"),
        });
        setFontsLoaded(true);
        await loadSessionLog();
        await loadDailyGoal();
      } catch (error) {
        setFontsLoaded(true);
      }
    };
    initialize();
  }, []);

  useEffect(() => {
    checkGoalAchievement();
  }, [sessionLog, dailyGoal]);

  const addWater = () => {
    const amount = parseInt(waterInput);
    if (isNaN(amount) || amount <= 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Invalid Amount", "Please enter a valid amount in ml.");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const newSession: SessionLog = {
      id: Date.now().toString(),
      amount,
      time: new Date(),
    };
    updateSessionLog([newSession, ...sessionLog]);
    setWaterInput("250");
  };

  const startEditingSession = (sessionId: string, currentName?: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingSession(sessionId);
    setEditingName(currentName || "");
  };

  const saveSessionName = () => {
    if (editingSession) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const updatedLog = sessionLog.map((session) =>
        session.id === editingSession
          ? { ...session, name: editingName.trim() || undefined }
          : session
      );
      updateSessionLog(updatedLog);
      setEditingSession(null);
      setEditingName("");
    }
  };

  const cancelEditingSession = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingSession(null);
    setEditingName("");
  };

  const deleteSession = (sessionId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert("Delete Entry", "Are you sure you want to delete this entry?", [
      {
        text: "Cancel",
        style: "cancel",
        onPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          const updatedLog = sessionLog.filter(
            (session) => session.id !== sessionId
          );
          updateSessionLog(updatedLog);
        },
      },
    ]);
  };

  const clearAllSessions = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      "Clear All Entries",
      "Are you sure you want to delete all water intake data? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
        },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            updateSessionLog([]);
            try {
              await SecureStore.deleteItemAsync(STORAGE_KEY);
            } catch (error) {
              console.error("Error clearing storage:", error);
            }
          },
        },
      ]
    );
  };

  const formatDate = (date: Date): string => {
    return (
      date.toLocaleDateString() +
      " " +
      date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
  };

  const getStatsData = (days: number): ChartData => {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(now.getDate() - days + 1);
    startDate.setHours(0, 0, 0, 0);

    const dates: Date[] = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      dates.push(date);
    }

    const waterByDate = dates.map((date) => {
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const dayWater = sessionLog
        .filter((session) => {
          const sessionDate = new Date(session.time);
          return sessionDate >= dayStart && sessionDate <= dayEnd;
        })
        .reduce((total, session) => total + session.amount, 0);

      return dayWater;
    });

    const labels = dates.map((date) => {
      if (days <= 7) {
        return date.toLocaleDateString("en-US", { weekday: "short" });
      } else {
        return date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
      }
    });

    return {
      labels,
      datasets: [
        {
          data: waterByDate.length ? waterByDate : [0],
          color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
          strokeWidth: 3,
        },
      ],
    };
  };

  const getChartConfig = () => ({
    backgroundColor: "#ffffff",
    backgroundGradientFrom: "#ffffff",
    backgroundGradientTo: "#ffffff",
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(51, 65, 85, ${opacity})`,
    style: {
      borderRadius: 12,
    },
    propsForDots: {
      r: "4",
      strokeWidth: "2",
      stroke: "#3b82f6",
    },
    propsForBackgroundLines: {
      strokeDasharray: "",
      stroke: "#e2e8f0",
      strokeWidth: 1,
    },
  });

  const renderSessionItem = ({ item }: { item: SessionLog }) => (
    <View style={styles.sessionItem}>
      {editingSession === item.id ? (
        <View style={styles.editingContainer}>
          <TextInput
            style={[styles.nameInput, styles.pixelFont]}
            value={editingName}
            onChangeText={setEditingName}
            placeholder="Enter entry name..."
            placeholderTextColor="#94a3b8"
            autoFocus
          />
          <View style={styles.editButtons}>
            <TouchableOpacity
              style={[styles.editButton, styles.saveButton]}
              onPress={saveSessionName}
            >
              <Text style={[styles.editButtonText, styles.pixelFont]}>
                Save
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.editButton, styles.cancelButton]}
              onPress={cancelEditingSession}
            >
              <Text style={[styles.editButtonText, styles.pixelFont]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View>
          <TouchableOpacity
            style={styles.sessionHeader}
            onPress={() => startEditingSession(item.id, item.name)}
          >
            <View>
              {item.name && (
                <Text style={[styles.sessionName, styles.pixelFont]}>
                  {item.name}
                </Text>
              )}
              <View style={styles.sessionStats}>
                <Text style={[styles.sessionSteps, styles.pixelFont]}>
                  {item.amount} ml
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={(e) => {
                e.stopPropagation();
                deleteSession(item.id);
              }}
            >
              <Ionicons name="close" size={16} color="#ffffff" />
            </TouchableOpacity>
          </TouchableOpacity>
          <Text style={styles.sessionDate}>{formatDate(item.time)}</Text>
        </View>
      )}
    </View>
  );

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
            <Text style={styles.loadingText}>Loading page...</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#2563eb" />
        <LinearGradient
          colors={["#619dffff", "#1740b0ff"]}
          style={styles.gradient}
        >
          <View style={styles.content}>
            <View style={styles.header}>
              <Text style={[styles.title, styles.pixelFont]}>Water</Text>
              <Text style={[styles.tagline, styles.pixelFont]}>
                Stay hydrated!
              </Text>
            </View>

            <View style={styles.stepCounter}>
              <Text style={[styles.steps, styles.pixelFont]}>
                {getTotalWaterToday()} ml
              </Text>
              <Text style={[styles.totalStepsSubtext, styles.pixelFont]}>
                Today's total
              </Text>
            </View>

            {/* Daily Goal Section */}
            <View style={styles.goalContainer}>
              <TouchableOpacity
                style={styles.goalHeader}
                onPress={openGoalModal}
              >
                <View style={styles.goalInfo}>
                  <Text style={[styles.goalTitle, styles.pixelFont]}>
                    Daily Goal: {dailyGoal.toLocaleString()} ml
                  </Text>
                  <Text style={[styles.goalProgress, styles.pixelFont]}>
                    {getTotalWaterToday().toLocaleString()} /{" "}
                    {dailyGoal.toLocaleString()} ml
                  </Text>
                </View>
                <View style={styles.goalIcon}>
                  {goalAchieved ? (
                    <Ionicons
                      name="checkmark-circle"
                      size={24}
                      color="#10b981"
                    />
                  ) : (
                    <Ionicons
                      name="settings-outline"
                      size={20}
                      color="#bfdbfe"
                    />
                  )}
                </View>
              </TouchableOpacity>

              <View style={styles.progressBarContainer}>
                <View style={styles.progressBarBackground}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${getGoalProgress()}%`,
                        backgroundColor: goalAchieved ? "#10b981" : "#3b82f6",
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.progressPercentage, styles.pixelFont]}>
                  {Math.round(getGoalProgress())}%
                </Text>
              </View>
            </View>

            <View style={styles.buttonContainer}></View>
            <View
              style={{
                flexDirection: "row",
                gap: 16,
                marginBottom: 20,
                alignItems: "center",
                width: 375,
                alignSelf: "center",
              }}
            >
              <View
                style={{ width: 375, alignSelf: "center", marginBottom: 20 }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    gap: 16,
                    alignItems: "center",
                    width: "100%",
                    marginBottom: 12,
                  }}
                >
                  <TextInput
                    style={[
                      styles.goalInput,
                      styles.pixelFont,
                      {
                        width: "100%",
                        fontSize: 22,
                        padding: 12,
                        flex: 1,
                      },
                    ]}
                    value={waterInput}
                    onChangeText={setWaterInput}
                    placeholder="ml"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                  />
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    gap: 5,
                    alignItems: "center",
                    width: "100%",
                  }}
                >
                  <TouchableOpacity
                    style={[styles.button, { flex: 1 }]}
                    onPress={addWater}
                  >
                    <Text
                      style={[
                        styles.buttonText,
                        { textAlign: "center", fontSize: 14 },
                      ]}
                    >
                      Add
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.logButton,
                  styles.halfWidthButton,
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowLog(true);
                }}
              >
                <Text style={[styles.buttonText, { textAlign: "center" }]}>
                  View Log ({sessionLog.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.statsButton,
                  styles.halfWidthButton,
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowStats(true);
                }}
              >
                <Text style={[styles.buttonText, { textAlign: "center" }]}>
                  View Stats
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </View>

      <NavigationBar />

      <Modal visible={showGoalModal} animationType="slide" transparent={true}>
        <View style={styles.goalModalOverlay}>
          <View style={styles.goalModalContainer}>
            <View style={styles.modalHeader}></View>
            <Text style={[styles.modalTitle, styles.pixelFont]}>
              Set Daily Goal
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowGoalModal(false);
              }}
            >
              <Ionicons name="close" size={20} color="#ffffff" />
            </TouchableOpacity>
            <View style={styles.goalModalContent}>
              <Text style={[styles.goalLabel, styles.pixelFont]}>
                Enter your daily water goal (ml):
              </Text>
              <TextInput
                style={[styles.goalInput, styles.pixelFont]}
                value={tempGoalInput}
                onChangeText={setTempGoalInput}
                placeholder="e.g., 2000"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                autoFocus
              />
              <TouchableOpacity
                style={styles.saveGoalButton}
                onPress={saveGoal}
              >
                <Text style={[styles.saveGoalButtonText, styles.pixelFont]}>
                  Save Goal
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showLog}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, styles.pixelFont]}>Water Log</Text>
            <View style={styles.headerButtons}>
              {sessionLog.length > 0 && (
                <TouchableOpacity
                  style={[styles.closeButton, styles.clearButton]}
                  onPress={clearAllSessions}
                >
                  <Ionicons name="trash" size={16} color="#ffffff" />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowLog(false);
                }}
              >
                <Ionicons name="close" size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>
          {sessionLog.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, styles.pixelFont]}>
                No entries yet
              </Text>
              <Text style={styles.emptySubText}>
                Add water intake to begin tracking!
              </Text>
            </View>
          ) : (
            <FlatList
              data={sessionLog}
              renderItem={renderSessionItem}
              keyExtractor={(item) => item.id}
              style={styles.logList}
              contentContainerStyle={styles.logContent}
            />
          )}
        </View>
      </Modal>

      <Modal
        visible={showStats}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, styles.pixelFont]}>
              Water Statistics
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowStats(false);
              }}
            >
              <Ionicons name="close" size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>
          {sessionLog.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, styles.pixelFont]}>
                No data available
              </Text>
              <Text style={styles.emptySubText}>
                Add water entries to see your statistics!
              </Text>
            </View>
          ) : (
            <ScrollView
              style={styles.statsScrollView}
              contentContainerStyle={styles.statsContent}
            >
              <View style={styles.chartContainer}>
                <Text style={[styles.chartTitle, styles.pixelFont]}>
                  Past 3 Days
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chartScrollContent}
                >
                  <LineChart
                    data={getStatsData(3)}
                    width={getChartWidth()}
                    height={220}
                    chartConfig={getChartConfig()}
                    bezier
                    style={styles.chart}
                  />
                </ScrollView>
              </View>
              <View style={styles.chartContainer}>
                <Text style={[styles.chartTitle, styles.pixelFont]}>
                  Past Week
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chartScrollContent}
                >
                  <LineChart
                    data={getStatsData(7)}
                    width={getChartWidth()}
                    height={220}
                    chartConfig={getChartConfig()}
                    bezier
                    style={styles.chart}
                  />
                </ScrollView>
              </View>
              <View style={styles.chartContainer}>
                <Text style={[styles.chartTitle, styles.pixelFont]}>
                  Past Month
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chartScrollContent}
                >
                  <LineChart
                    data={{
                      ...getStatsData(30),
                      labels: Array(getStatsData(30).labels.length).fill(""),
                    }}
                    width={getChartWidth()}
                    height={220}
                    chartConfig={getChartConfig()}
                    bezier
                    style={styles.chart}
                  />
                </ScrollView>
              </View>
            </ScrollView>
          )}
        </View>
      </Modal>
    </>
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
    justifyContent: "space-between",
    paddingHorizontal: 32,
    paddingTop: 120,
    paddingBottom: 60,
  },

  fullWidthButton: {
    width: "100%",
  },

  halfWidthButton: {
    width: "48%",
  },

  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },

  header: {
    alignItems: "center",
  },

  title: {
    fontSize: 40,
    fontWeight: "300",
    color: "#ffffff",
    marginBottom: 8,
    letterSpacing: -1,
  },

  tagline: {
    fontSize: 11,
    color: "#bfdbfe",
    fontWeight: "400",
    letterSpacing: 0.5,
  },

  stepCounter: {
    alignItems: "center",
    marginTop: 24,
  },

  steps: {
    fontSize: 24,
    color: "#ffffff",
    marginBottom: 12,
  },

  timer: {
    fontSize: 18,
    color: "#bfdbfe",
    marginBottom: 8,
  },

  totalStepsSubtext: {
    fontSize: 12,
    color: "#bfdbfe",
    opacity: 0.8,
  },

  totalStepsInSession: {
    fontSize: 14,
    color: "#bfdbfe",
    opacity: 0.9,
  },

  goalContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 16,
    padding: 20,
    marginTop: 30,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },

  goalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },

  goalInfo: {
    flex: 1,
  },

  goalTitle: {
    fontSize: 14,
    color: "#ffffff",
    marginBottom: 4,
  },

  goalProgress: {
    fontSize: 12,
    color: "#bfdbfe",
  },

  goalIcon: {
    padding: 4,
  },

  progressBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  progressBarBackground: {
    flex: 1,
    height: 8,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 4,
    overflow: "hidden",
  },

  progressBarFill: {
    height: "100%",
    backgroundColor: "#3b82f6",
    borderRadius: 4,
    minWidth: 2,
  },

  progressPercentage: {
    fontSize: 11,
    color: "#bfdbfe",
    minWidth: 32,
    textAlign: "right",
  },

  goalModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },

  goalModalContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    width: "100%",
    maxWidth: 400,
    overflow: "hidden",
  },

  goalModalContent: {
    padding: 24,
  },

  goalLabel: {
    fontSize: 14,
    color: "#1e293b",
    marginBottom: 16,
  },

  goalInput: {
    backgroundColor: "#f1f5f9",
    borderWidth: 2,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#1e293b",
    marginBottom: 24,
    textAlign: "center",
  },

  goalPresets: {
    marginBottom: 24,
  },

  presetLabel: {
    fontSize: 12,
    color: "#64748b",
    marginBottom: 12,
  },

  presetButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  presetButton: {
    backgroundColor: "#e2e8f0",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },

  presetButtonText: {
    fontSize: 10,
    color: "#475569",
  },

  saveGoalButton: {
    backgroundColor: "#3b82f6",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },

  saveGoalButtonText: {
    fontSize: 14,
    color: "#ffffff",
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

  buttonContainer: {
    alignItems: "center",
    marginTop: 60,
    gap: 16,
  },

  button: {
    backgroundColor: "#1e40af",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },

  logButton: {
    backgroundColor: "#0f766e",
  },

  statsButton: {
    backgroundColor: "#7c3aed",
  },

  buttonText: {
    fontSize: 14,
    color: "#ffffff",
    fontFamily: "PixelFont",
  },

  modalContainer: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },

  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: "#3b82f6",
  },

  modalTitle: {
    fontSize: 14,
    color: "#ffffff",
  },

  headerButtons: {
    flexDirection: "row",
    gap: 8,
  },

  closeButton: {
    backgroundColor: "#dc2626",
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },

  clearButton: {
    backgroundColor: "#ea580c",
  },

  logList: {
    flex: 1,
  },

  logContent: {
    padding: 16,
  },

  sessionItem: {
    backgroundColor: "#ffffff",
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  sessionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },

  sessionName: {
    fontSize: 14,
    color: "#1e293b",
    marginBottom: 4,
    fontWeight: "bold",
  },

  sessionStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    minWidth: 200,
  },

  sessionSteps: {
    fontSize: 12,
    color: "#1e40af",
  },

  sessionDuration: {
    fontSize: 12,
    color: "#0f766e",
  },

  sessionDate: {
    fontSize: 12,
    color: "#64748b",
    fontFamily: "PixelFont",
  },

  deleteButton: {
    backgroundColor: "#dc2626",
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    padding: 0,
    margin: 0,
  },

  editingContainer: {
    gap: 12,
  },

  nameInput: {
    backgroundColor: "#f1f5f9",
    padding: 12,
    borderRadius: 8,
    fontSize: 14,
    color: "#1e293b",
    borderWidth: 2,
    borderColor: "#3b82f6",
  },

  editButtons: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "flex-end",
  },

  editButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },

  saveButton: {
    backgroundColor: "#16a34a",
  },

  cancelButton: {
    backgroundColor: "#64748b",
  },

  editButtonText: {
    fontSize: 12,
    color: "#ffffff",
  },

  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },

  emptyText: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 8,
  },

  emptySubText: {
    fontSize: 14,
    color: "#94a3b8",
    textAlign: "center",
    lineHeight: 20,
  },

  statsScrollView: {
    flex: 1,
  },

  statsContent: {
    padding: 16,
    paddingHorizontal: 12,
  },

  chartContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: "hidden",
  },

  chartTitle: {
    fontSize: 16,
    color: "#1e293b",
    marginBottom: 16,
    textAlign: "center",
  },

  chart: {
    borderRadius: 8,
    alignSelf: "center",
  },

  chartScrollContent: {
    paddingRight: 20,
  },
});
