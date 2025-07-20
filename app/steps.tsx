import { Ionicons } from "@expo/vector-icons";
import * as Font from "expo-font";
import { LinearGradient } from "expo-linear-gradient";
import * as SecureStore from "expo-secure-store";
import * as Pedometer from "expo-sensors/build/Pedometer";
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
  steps: number;
  duration: number;
  startTime: Date;
  endTime: Date;
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

const STORAGE_KEY = "StepsApp_sessionLog";
const GOALS_STORAGE_KEY = "StepsApp_dailyGoal";
const { width: screenWidth } = Dimensions.get("window");

const getChartWidth = () => {
  return screenWidth - 80;
};

export default function Index() {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [isPedometerAvailable, setIsPedometerAvailable] = useState<
    boolean | null
  >(null);
  const [sessionActive, setSessionActive] = useState(false);
  const [initialSteps, setInitialSteps] = useState<number | null>(null);
  const [sessionSteps, setSessionSteps] = useState(0);
  const [totalSteps, setTotalSteps] = useState<number | null>(null);
  const [subscription, setSubscription] =
    useState<Pedometer.Subscription | null>(null);

  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [sessionLog, setSessionLog] = useState<SessionLog[]>([]);
  const [showLog, setShowLog] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [timerInterval, setTimerInterval] = useState<ReturnType<
    typeof setInterval
  > | null>(null);
  const [editingSession, setEditingSession] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  // Daily Goals States
  const [dailyGoal, setDailyGoal] = useState(10000); // Default 10,000 steps
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [tempGoalInput, setTempGoalInput] = useState("");
  const [goalAchieved, setGoalAchieved] = useState(false);

  const loadDailyGoal = async () => {
    try {
      const savedGoal = await SecureStore.getItemAsync(GOALS_STORAGE_KEY);
      if (savedGoal) {
        setDailyGoal(parseInt(savedGoal));
      }
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

  const getGoalProgress = () => {
    if (totalSteps === null || totalSteps === 0) return 0;
    return Math.min((totalSteps / dailyGoal) * 100, 100);
  };

  const checkGoalAchievement = () => {
    const wasAchieved = goalAchieved;
    const isAchieved = totalSteps !== null && totalSteps >= dailyGoal;

    setGoalAchieved(isAchieved);

    // Show celebration only when goal is first achieved
    if (isAchieved && !wasAchieved && totalSteps !== null) {
      Alert.alert(
        "🎉 Goal Achieved!",
        `Congratulations! You've reached your daily goal of ${dailyGoal.toLocaleString()} steps!`,
        [{ text: "Awesome!", style: "default" }]
      );
    }
  };

  const openGoalModal = () => {
    setTempGoalInput(dailyGoal.toString());
    setShowGoalModal(true);
  };

  const saveGoal = () => {
    const newGoal = parseInt(tempGoalInput);
    if (isNaN(newGoal) || newGoal <= 0) {
      Alert.alert("Invalid Goal", "Please enter a valid number greater than 0");
      return;
    }
    if (newGoal > 100000) {
      Alert.alert(
        "Goal Too High",
        "Please enter a goal less than 100,000 steps"
      );
      return;
    }
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
          startTime: new Date(session.startTime),
          endTime: new Date(session.endTime),
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

  const getTotalStepsToday = async () => {
    try {
      const end = new Date();
      const start = new Date();
      start.setHours(0, 0, 0, 0);

      const result = await Pedometer.getStepCountAsync(start, end);
      setTotalSteps(result.steps);
    } catch (error) {
      console.error("Error getting total steps:", error);
      setTotalSteps(null);
    }
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

    const stepsByDate = dates.map((date) => {
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const daySteps = sessionLog
        .filter((session) => {
          const sessionDate = new Date(session.startTime);
          return sessionDate >= dayStart && sessionDate <= dayEnd;
        })
        .reduce((total, session) => total + session.steps, 0);

      return daySteps;
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
          data: stepsByDate.length ? stepsByDate : [0],
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

  useEffect(() => {
    const initialize = async () => {
      try {
        await Font.loadAsync({
          PixelFont: require("../assets/fonts/Press Start 2P Regular.ttf"),
        });
        setFontsLoaded(true);

        const available = await Pedometer.isAvailableAsync();
        setIsPedometerAvailable(available);

        if (available) {
          await getTotalStepsToday();
        }

        await loadSessionLog();
        await loadDailyGoal();
      } catch (error) {
        console.error("Error during initialization:", error);
        setFontsLoaded(true);
      }
    };

    initialize();

    const totalStepsInterval = setInterval(() => {
      if (!sessionActive && isPedometerAvailable) {
        getTotalStepsToday();
      }
    }, 30000);

    return () => {
      if (subscription) subscription.remove();
      if (timerInterval) clearInterval(timerInterval);
      clearInterval(totalStepsInterval);
    };
  }, [sessionActive, isPedometerAvailable]);

  // Check goal achievement when total steps change
  useEffect(() => {
    if (totalSteps !== null) {
      checkGoalAchievement();
    }
  }, [totalSteps, dailyGoal]);

  const startSession = async () => {
    setSessionSteps(0);
    setSessionDuration(0);
    const startTime = new Date();
    setSessionStartTime(startTime);

    const end = new Date();
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    try {
      const result = await Pedometer.getStepCountAsync(start, end);
      setInitialSteps(result.steps);
      setTotalSteps(result.steps);
    } catch (err) {
      console.error("Error getting initial step count:", err);
      return;
    }

    const sub = Pedometer.watchStepCount((result) => {
      setSessionSteps((prev) => prev + result.steps);
      setTotalSteps((prevTotal) =>
        prevTotal !== null ? prevTotal + result.steps : result.steps
      );
    });

    const interval = setInterval(() => {
      setSessionDuration((prev) => prev + 1);
    }, 1000);

    setSubscription(sub);
    setTimerInterval(interval);
    setSessionActive(true);
  };

  const stopSession = () => {
    if (subscription) {
      subscription.remove();
      setSubscription(null);
    }

    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }

    if (sessionStartTime) {
      const endTime = new Date();
      const newSession: SessionLog = {
        id: Date.now().toString(),
        steps: sessionSteps,
        duration: sessionDuration,
        startTime: sessionStartTime,
        endTime: endTime,
      };

      const updatedLog = [newSession, ...sessionLog];
      updateSessionLog(updatedLog);
    }

    setSessionActive(false);
    getTotalStepsToday();
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const formatDate = (date: Date): string => {
    return (
      date.toLocaleDateString() +
      " " +
      date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
  };

  const startEditingSession = (sessionId: string, currentName?: string) => {
    setEditingSession(sessionId);
    setEditingName(currentName || "");
  };

  const saveSessionName = () => {
    if (editingSession) {
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
    setEditingSession(null);
    setEditingName("");
  };

  const deleteSession = (sessionId: string) => {
    Alert.alert(
      "Delete Session",
      "Are you sure you want to delete this session?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            const updatedLog = sessionLog.filter(
              (session) => session.id !== sessionId
            );
            updateSessionLog(updatedLog);
          },
        },
      ]
    );
  };

  const clearAllSessions = () => {
    Alert.alert(
      "Clear All Sessions",
      "Are you sure you want to delete all session data? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
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

  const renderStepText = () => {
    if (isPedometerAvailable === null) return "Checking pedometer...";
    if (isPedometerAvailable === false) return "Pedometer unavailable";

    if (sessionActive) {
      return `${sessionSteps}`;
    }

    return totalSteps !== null ? `${totalSteps}` : "Loading steps...";
  };

  const renderSessionItem = ({ item }: { item: SessionLog }) => (
    <View style={styles.sessionItem}>
      {editingSession === item.id ? (
        <View style={styles.editingContainer}>
          <TextInput
            style={[styles.nameInput, styles.pixelFont]}
            value={editingName}
            onChangeText={setEditingName}
            placeholder="Enter session name..."
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
                  {item.steps} steps
                </Text>
                <Text style={[styles.sessionDuration, styles.pixelFont]}>
                  {formatDuration(item.duration)}
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
          <Text style={styles.sessionDate}>{formatDate(item.startTime)}</Text>
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
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2563eb" />
      <LinearGradient
        colors={["#619dffff", "#1740b0ff"]}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={[styles.title, styles.pixelFont]}>Steps</Text>
            <Text style={[styles.tagline, styles.pixelFont]}>
              Keep moving forward.
            </Text>
          </View>

          <View style={styles.stepCounter}>
            <Text style={[styles.steps, styles.pixelFont]}>
              {renderStepText()}
            </Text>
            {!sessionActive && totalSteps !== null && (
              <Text style={[styles.totalStepsSubtext, styles.pixelFont]}>
                Steps today
              </Text>
            )}
            {sessionActive && (
              <>
                <Text style={[styles.timer, styles.pixelFont]}>
                  Time: {formatDuration(sessionDuration)}
                </Text>
                {totalSteps !== null && (
                  <Text style={[styles.totalStepsInSession, styles.pixelFont]}>
                    Total today: {totalSteps}
                  </Text>
                )}
              </>
            )}
          </View>

          {/* Daily Goal Section */}
          <View style={styles.goalContainer}>
            <TouchableOpacity style={styles.goalHeader} onPress={openGoalModal}>
              <View style={styles.goalInfo}>
                <Text style={[styles.goalTitle, styles.pixelFont]}>
                  Daily Goal: {dailyGoal.toLocaleString()}
                </Text>
                <Text style={[styles.goalProgress, styles.pixelFont]}>
                  {totalSteps !== null ? totalSteps.toLocaleString() : 0} /{" "}
                  {dailyGoal.toLocaleString()}
                </Text>
              </View>
              <View style={styles.goalIcon}>
                {goalAchieved ? (
                  <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                ) : (
                  <Ionicons name="settings-outline" size={20} color="#bfdbfe" />
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

          <View style={styles.buttonContainer}>
            <View style={{ width: "100%" }}>
              {!sessionActive ? (
                <TouchableOpacity
                  style={[styles.button, styles.fullWidthButton]}
                  onPress={startSession}
                >
                  <Text style={[styles.buttonText, { textAlign: "center" }]}>
                    Start Session
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.button, styles.fullWidthButton]}
                  onPress={stopSession}
                >
                  <Text style={[styles.buttonText, { textAlign: "center" }]}>
                    Stop Session
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.logButton,
                  styles.halfWidthButton,
                ]}
                onPress={() => setShowLog(true)}
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
                onPress={() => setShowStats(true)}
              >
                <Text style={[styles.buttonText, { textAlign: "center" }]}>
                  View Stats
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <NavigationBar />
      </LinearGradient>

      {/* Goal Setting Modal - Fixed */}
      <Modal visible={showGoalModal} animationType="slide" transparent={true}>
        <View style={styles.goalModalOverlay}>
          <View style={styles.goalModalContainer}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, styles.pixelFont]}>
                Set Daily Goal
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowGoalModal(false)}
              >
                <Ionicons name="close" size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <View style={styles.goalModalContent}>
              <Text style={[styles.goalLabel, styles.pixelFont]}>
                Enter your daily step goal:
              </Text>
              <TextInput
                style={[styles.goalInput, styles.pixelFont]}
                value={tempGoalInput}
                onChangeText={setTempGoalInput}
                placeholder="e.g., 10000"
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

      {/* Session Log Modal - Fixed */}
      <Modal
        visible={showLog}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, styles.pixelFont]}>
              Session Log
            </Text>
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
                onPress={() => setShowLog(false)}
              >
                <Ionicons name="close" size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>

          {sessionLog.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, styles.pixelFont]}>
                No sessions yet
              </Text>
              <Text style={styles.emptySubText}>
                Start a session to begin tracking your steps!
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

      {/* Stats Modal - Fixed */}
      <Modal
        visible={showStats}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, styles.pixelFont]}>
              Step Statistics
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowStats(false)}
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
                Complete some sessions to see your statistics!
              </Text>
            </View>
          ) : (
            <ScrollView
              style={styles.statsScrollView}
              contentContainerStyle={styles.statsContent}
            >
              {/* Past 3 Days */}
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
    marginTop: 40,
  },

  steps: {
    fontSize: 64,
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

  // Daily Goal Styles
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

  // Goal Modal Styles
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

// asdopakpsdokpaosdkpoasdkpoaksdpkaspok
