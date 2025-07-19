import { Ionicons } from "@expo/vector-icons";
import * as Font from "expo-font";
import { LinearGradient } from "expo-linear-gradient";
import * as SecureStore from "expo-secure-store";
import * as Pedometer from "expo-sensors/build/Pedometer";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import NavigationBar from "../components/NavigationBar";

interface SessionLog {
  id: string;
  steps: number;
  duration: number;
  startTime: Date;
  endTime: Date;
  name?: string;
}

const STORAGE_KEY = "StepsApp_sessionLog";

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
  const [timerInterval, setTimerInterval] = useState<ReturnType<
    typeof setInterval
  > | null>(null);
  const [editingSession, setEditingSession] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

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
        <LinearGradient colors={["#3b82f6", "#1d4ed8"]} style={styles.gradient}>
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
      <LinearGradient colors={["#3b82f6", "#1d4ed8"]} style={styles.gradient}>
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
            <View style={{ width: "100%" }}>
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.logButton,
                  styles.fullWidthButton,
                ]}
                onPress={() => setShowLog(true)}
              >
                <Text style={[styles.buttonText, { textAlign: "center" }]}>
                  View Log ({sessionLog.length})
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <NavigationBar />
      </LinearGradient>

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
    fontSize: 17,
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
});

/* 
In this chamber, we love bringing up statistics and data. But let's put all of that aside for jus


*/
