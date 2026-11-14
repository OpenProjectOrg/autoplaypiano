import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { PianoSheet, UserProfile, PlaybackState, SheetParseResult } from "./lib/types";
import { DEFAULT_SHEETS } from "./data/defaultSheets";
import {
  getCurrentUser,
  logoutUser,
  fetchCustomSheets,
  saveCustomSheet,
  deleteCustomSheet,
} from "./lib/local-db";
import { PianoSettings, loadPianoSettings, savePianoSettings } from "./lib/piano-settings";
import { parseSheetLocally } from "./lib/sheets-parser";
import { pianoSynth } from "./lib/piano-synth";
import { Sidebar, NavView } from "./components/Sidebar";
import { Navbar } from "./components/Navbar";
import { SongLibrary } from "./components/SongLibrary";
import { SheetUploader } from "./components/SheetUploader";
import { PlayerBar } from "./components/PlayerBar";
import { CountdownOverlay } from "./components/CountdownOverlay";
import { AuthModal } from "./components/AuthModal";
import { InteractiveSheetViewer } from "./components/InteractiveSheetViewer";
import { EditSheetModal } from "./components/EditSheetModal";
import { PlayPianoSheetsSyncModal } from "./components/PlayPianoSheetsSyncModal";
import { ProfileView } from "./components/ProfileView";
import { RobloxGuideView } from "./components/RobloxGuideView";
import { useTranslation } from "./i18n";
import { AlertTriangle, Globe, Plus } from "lucide-react";
import { Box, Paper, Title, Text, Button, Group, Stack, Loader } from "@mantine/core";
import "./App.css";

export function App() {
  const { t } = useTranslation();
  const isDesktopApp =
    typeof window !== "undefined" &&
    Boolean((window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__);

  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [customSheets, setCustomSheets] = useState<PianoSheet[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<PianoSheet | null>(null);
  const [currentView, setCurrentView] = useState<NavView>("player");

  const [pianoSettings, setPianoSettings] = useState<PianoSettings>(() => loadPianoSettings());
  const speedMultiplier = pianoSettings.speedMultiplier;
  const countdownSec = pianoSettings.countdownSec;
  const isAudioMuted = pianoSettings.isAudioMuted;
  const [startIndex, setStartIndex] = useState<number>(0);

  const handleUpdatePianoSettings = (partial: Partial<PianoSettings>) => {
    const next = savePianoSettings(partial);
    setPianoSettings(next);
    if (next.speedMultiplier !== undefined) {
      speedMultiplierRef.current = next.speedMultiplier;
    }
    if (next.countdownSec !== undefined) {
      countdownSecRef.current = next.countdownSec;
    }
  };

  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    isPlaying: false,
    isPaused: false,
    isCountdown: false,
    countdownSec: 0,
    currentIndex: 0,
    totalEvents: 0,
    currentNoteDisplay: "",
    startIndex: 0,
    startLine: 1,
  });

  // Keep ref to latest states for hotkey event handlers
  const playbackStateRef = useRef(playbackState);
  playbackStateRef.current = playbackState;

  const selectedSheetRef = useRef(selectedSheet);
  selectedSheetRef.current = selectedSheet;

  const startIndexRef = useRef(startIndex);
  startIndexRef.current = startIndex;

  const userRef = useRef(user);
  userRef.current = user;

  const speedMultiplierRef = useRef(speedMultiplier);
  speedMultiplierRef.current = speedMultiplier;

  const countdownSecRef = useRef(countdownSec);
  countdownSecRef.current = countdownSec;

  // Function refs to avoid stale closures in Tauri global listeners
  const handleStartPlaybackRef = useRef<(sheetToPlay?: PianoSheet, fromIndex?: number) => Promise<void>>(() => Promise.resolve());
  const handlePausePlaybackRef = useRef<() => Promise<void>>(() => Promise.resolve());
  const handleResumePlaybackRef = useRef<() => Promise<void>>(() => Promise.resolve());
  const handleStopPlaybackRef = useRef<() => Promise<void>>(() => Promise.resolve());

  // Modals state
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isSyncOpen, setIsSyncOpen] = useState(false);
  const [editingSheet, setEditingSheet] = useState<PianoSheet | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Load user & custom sheets on mount
  useEffect(() => {
    async function initData() {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
        userRef.current = currentUser;
        if (currentUser) {
          const sheets = await fetchCustomSheets(currentUser.id);
          setCustomSheets(sheets);
          if (sheets.length > 0) {
            setSelectedSheet(sheets[0]);
            selectedSheetRef.current = sheets[0];
          } else if (DEFAULT_SHEETS.length > 0) {
            setSelectedSheet(DEFAULT_SHEETS[0]);
            selectedSheetRef.current = DEFAULT_SHEETS[0];
          }
          setIsAuthOpen(false);
        } else {
          // Mandatory login requirement: open modal immediately
          setIsAuthOpen(true);
        }
      } catch (err) {
        console.error("Initialization error:", err);
        setIsAuthOpen(true);
      } finally {
        setIsAuthChecking(false);
      }
    }
    initData();
  }, []);

  // Listen for Tauri playback events & global hotkeys (F6 & ESC)
  useEffect(() => {
    let unlistenCountdown: (() => void) | undefined;
    let unlistenTick: (() => void) | undefined;
    let unlistenFinished: (() => void) | undefined;
    let unlistenPaused: (() => void) | undefined;
    let unlistenResumed: (() => void) | undefined;
    let unlistenF6: (() => void) | undefined;
    let unlistenEsc: (() => void) | undefined;

    async function setupListeners() {
      try {
        unlistenCountdown = await listen<{ remaining_sec: number }>("playback-countdown", (event) => {
          const sec = event.payload.remaining_sec;
          if (sec > 0) {
            setPlaybackState((prev) => ({
              ...prev,
              isCountdown: true,
              isPlaying: false,
              isPaused: false,
              countdownSec: sec,
            }));
          } else {
            setPlaybackState((prev) => ({
              ...prev,
              isCountdown: false,
              isPlaying: true,
              isPaused: false,
              countdownSec: 0,
            }));
          }
        });

        unlistenTick = await listen<{ current_index: number; total_events: number; note_display: string }>(
          "playback-tick",
          (event) => {
            setPlaybackState((prev) => ({
              ...prev,
              isPlaying: true,
              isCountdown: false,
              currentIndex: event.payload.current_index,
              totalEvents: event.payload.total_events,
              currentNoteDisplay: event.payload.note_display,
            }));
          }
        );

        unlistenFinished = await listen<{ completed: boolean; message: string }>("playback-finished", (event) => {
          pianoSynth.stopAll();
          setPlaybackState((prev) => ({
            ...prev,
            isPlaying: false,
            isPaused: false,
            isCountdown: false,
            countdownSec: 0,
            statusMessage: event.payload.message,
          }));
        });

        unlistenPaused = await listen("playback-paused", () => {
          pianoSynth.stopAll();
          setPlaybackState((prev) => ({
            ...prev,
            isPaused: true,
            statusMessage: "Dijeda (Pause)",
          }));
        });

        unlistenResumed = await listen("playback-resumed", () => {
          pianoSynth.resumeAudio();
          setPlaybackState((prev) => ({
            ...prev,
            isPaused: false,
            statusMessage: "Melanjutkan...",
          }));
        });

        // Global hotkey F6: Toggle start / pause / resume from ANY window
        unlistenF6 = await listen("hotkey-f6-pressed", () => {
          if (!userRef.current) {
            setIsAuthOpen(true);
            return;
          }
          const curr = playbackStateRef.current;
          if (curr.isPlaying) {
            if (curr.isPaused) {
              handleResumePlaybackRef.current();
            } else {
              handlePausePlaybackRef.current();
            }
          } else if (curr.isCountdown) {
            handleStopPlaybackRef.current();
          } else {
            const sheet = selectedSheetRef.current;
            if (sheet) {
              handleStartPlaybackRef.current(sheet, startIndexRef.current);
            }
          }
        });

        // Global hotkey ESC: Emergency stop from ANY window
        unlistenEsc = await listen("hotkey-esc-pressed", () => {
          handleStopPlaybackRef.current();
        });
      } catch (err) {
        console.warn("Tauri event listener setup skipped:", err);
      }
    }

    setupListeners();

    return () => {
      if (unlistenCountdown) unlistenCountdown();
      if (unlistenTick) unlistenTick();
      if (unlistenFinished) unlistenFinished();
      if (unlistenPaused) unlistenPaused();
      if (unlistenResumed) unlistenResumed();
      if (unlistenF6) unlistenF6();
      if (unlistenEsc) unlistenEsc();
    };
  }, []);

  // Start Playback
  const handleStartPlayback = async (sheetToPlay?: PianoSheet, fromIndex?: number) => {
    const currentUser = userRef.current || user;
    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }
    const target = sheetToPlay || selectedSheetRef.current || selectedSheet;
    if (!target) return;

    // Parse sheet
    let parsed: SheetParseResult;
    try {
      parsed = await invoke<SheetParseResult>("parse_sheet", {
        rawContent: target.content,
        bpm: target.bpm,
      });
    } catch {
      parsed = parseSheetLocally(target.content, target.bpm);
    }

    if (!parsed || parsed.events.length === 0) {
      alert("Tidak ada tuts/notasi yang dapat dimainkan dari sheet ini!");
      return;
    }

    const actualStartIdx = fromIndex !== undefined ? fromIndex : (startIndexRef.current !== undefined ? startIndexRef.current : startIndex);
    const currentCountdown = countdownSecRef.current !== undefined ? countdownSecRef.current : countdownSec;
    const currentSpeed = speedMultiplierRef.current !== undefined ? speedMultiplierRef.current : speedMultiplier;

    setPlaybackState({
      isPlaying: false,
      isPaused: false,
      isCountdown: currentCountdown > 0,
      countdownSec: currentCountdown,
      currentIndex: actualStartIdx,
      totalEvents: parsed.events.length,
      currentNoteDisplay: "",
      startIndex: actualStartIdx,
      startLine: 1,
    });

    try {
      await invoke("start_playback", {
        events: parsed.events,
        countdownSec: currentCountdown,
        speedMultiplier: currentSpeed,
        startIndex: actualStartIdx,
      });
    } catch (err: unknown) {
      console.error("Start playback error:", err);
      // Browser fallback simulation
      if (currentCountdown > 0) {
        let sec = currentCountdown;
        const timer = setInterval(() => {
          sec--;
          if (sec <= 0) {
            clearInterval(timer);
            setPlaybackState((prev) => ({ ...prev, isCountdown: false, isPlaying: true }));
          } else {
            setPlaybackState((prev) => ({ ...prev, countdownSec: sec }));
          }
        }, 1000);
      }
    }
  };

  // Pause Playback
  const handlePausePlayback = async () => {
    pianoSynth.stopAll();
    try {
      await invoke("pause_playback");
    } catch (e) {
      console.warn("Pause playback error:", e);
    }
    setPlaybackState((prev) => ({
      ...prev,
      isPaused: true,
      statusMessage: "Dijeda (Pause)",
    }));
  };

  // Resume Playback
  const handleResumePlayback = async () => {
    pianoSynth.resumeAudio();
    try {
      await invoke("resume_playback");
    } catch (e) {
      console.warn("Resume playback error:", e);
    }
    setPlaybackState((prev) => ({
      ...prev,
      isPaused: false,
      statusMessage: "Melanjutkan...",
    }));
  };

  // Seek Note (when paused or stopped)
  const handleSeekNote = async (targetIndex: number, noteDisplay?: string) => {
    setStartIndex(targetIndex);
    if (playbackState.isPaused) {
      pianoSynth.stopAll();
      try {
        await invoke("seek_playback", { index: targetIndex });
      } catch (e) {
        console.warn("Seek invoke error:", e);
      }
      setPlaybackState((prev) => ({
        ...prev,
        currentIndex: targetIndex,
        currentNoteDisplay: noteDisplay || prev.currentNoteDisplay,
        statusMessage: `Dijeda di Not #${targetIndex + 1}`,
      }));
    } else if (!playbackState.isPlaying) {
      setPlaybackState((prev) => ({
        ...prev,
        currentIndex: targetIndex,
        startIndex: targetIndex,
        currentNoteDisplay: noteDisplay || prev.currentNoteDisplay,
      }));
    }
  };

  // Stop Playback
  const handleStopPlayback = async () => {
    pianoSynth.stopAll();
    try {
      await invoke("stop_playback");
    } catch (e) {
      console.warn("Stop playback invoke error:", e);
    }
    setPlaybackState((prev) => ({
      ...prev,
      isPlaying: false,
      isPaused: false,
      isCountdown: false,
      countdownSec: 0,
      statusMessage: "Dihentikan",
    }));
  };

  // Keep refs synchronized on every render
  handleStartPlaybackRef.current = handleStartPlayback;
  handlePausePlaybackRef.current = handlePausePlayback;
  handleResumePlaybackRef.current = handleResumePlayback;
  handleStopPlaybackRef.current = handleStopPlayback;

  // Sheet operations
  const handleSaveCustomSheet = async (
    sheetData: (Omit<PianoSheet, "id"> & { id?: string }) | PianoSheet
  ): Promise<void> => {
    const currentUser = userRef.current || user;
    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }
    const saved = await saveCustomSheet(sheetData, currentUser.id);
    setCustomSheets((prev) => {
      const idx = prev.findIndex((s) => s.id === saved.id);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [saved, ...prev];
    });
    if (selectedSheet?.id === saved.id || !selectedSheet) {
      setSelectedSheet(saved);
      selectedSheetRef.current = saved;
    }
  };

  const handleBulkImportSheets = async (importedList: Omit<PianoSheet, "id">[]) => {
    const currentUser = userRef.current || user;
    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }
    const addedSheets: PianoSheet[] = [];
    for (const item of importedList) {
      const saved = await saveCustomSheet(item, currentUser.id);
      addedSheets.push(saved);
    }
    setCustomSheets((prev) => [...addedSheets, ...prev]);
    if (addedSheets.length > 0) {
      setSelectedSheet(addedSheets[0]);
      selectedSheetRef.current = addedSheets[0];
    }
  };

  const handleOpenEditSheet = (sheet: PianoSheet) => {
    setEditingSheet(sheet);
    setIsEditModalOpen(true);
  };

  const handleDeleteCustomSheet = async (sheetId: string) => {
    if (confirm("Hapus sheet kustom ini dari library Anda?")) {
      await deleteCustomSheet(sheetId);
      setCustomSheets((prev) => prev.filter((s) => s.id !== sheetId));
      if (selectedSheet?.id === sheetId) {
        setSelectedSheet(null);
        selectedSheetRef.current = null;
      }
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    setUser(null);
    userRef.current = null;
    setCustomSheets([]);
    setSelectedSheet(null);
    selectedSheetRef.current = null;
    setIsAuthOpen(true);
    setCurrentView("player");
  };

  const allSheets = [...DEFAULT_SHEETS, ...customSheets];

  if (isAuthChecking) {
    return (
      <Box
        style={{
          width: "100vw",
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "var(--canvas)",
        }}
      >
        <Stack align="center" gap="md">
          <Box
            style={{
              width: 64,
              height: 64,
              borderRadius: "16px",
              backgroundColor: "var(--surface-dark)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              border: "1px solid rgba(204,120,92,0.3)",
              boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
            }}
          >
            <img
              src="/app-logo.png"
              alt="Auto Piano Play"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </Box>
          <Title order={3} fw={700} c="var(--ink)">
            Auto Piano Play
          </Title>
          <Text size="sm" c="dimmed">
            Memuat sesi autentikasi...
          </Text>
          <Loader color="coral" size="sm" type="dots" />
        </Stack>
      </Box>
    );
  }

  return (
    <div className="app-shell">
      {/* Editorial Sidebar */}
      <Sidebar
        currentView={currentView}
        onNavigate={(view) => setCurrentView(view)}
        user={user}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
        onOpenSync={() => setIsSyncOpen(true)}
      />

      {/* Main Column */}
      <div className="app-main-column">
        {/* Top Navbar */}
        <Navbar
          currentView={currentView}
          user={user}
          onOpenSync={() => setIsSyncOpen(true)}
          isAudioMuted={isAudioMuted}
          onToggleAudioMute={() => handleUpdatePianoSettings({ isAudioMuted: !pianoSettings.isAudioMuted })}
        />

        {/* Scrollable View Area */}
        <main className="main-content-scrollable">
          {!isDesktopApp && (
            <div className="browser-warning-banner">
              <AlertTriangle size={20} className="text-amber-600 flex-shrink-0" />
              <div className="browser-warning-content">
                <strong>Mode Browser Web Terdeteksi:</strong> Pengetikan otomatis keyboard (
                <strong>F6</strong>) ke game <strong>Roblox Player</strong> HANYA bisa berjalan jika
                Auto Piano Play dibuka sebagai <strong>Aplikasi Desktop Windows</strong>.
                <span className="block text-xs mt-1 text-amber-800">
                  Jalankan perintah <code>npm run desktop</code> di terminal Anda agar jendela desktop
                  Auto Piano Play terbuka!
                </span>
              </div>
            </div>
          )}

          {!user ? (
            <Box
              p="xl"
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                minHeight: 520,
              }}
            >
              <Paper
                p="xl"
                radius="lg"
                withBorder
                style={{
                  textAlign: "center",
                  maxWidth: 480,
                  backgroundColor: "var(--surface-card)",
                }}
              >
                <Box
                  mx="auto"
                  mb="md"
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: "14px",
                    backgroundColor: "var(--surface-dark)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                    border: "1px solid rgba(204,120,92,0.3)",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  }}
                >
                  <img
                    src="/app-logo.png"
                    alt="Auto Piano Play"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </Box>
                <Title order={3} mb="xs" fw={700}>
                  {t("auth.loginTitle")}
                </Title>
                <Text size="sm" c="dimmed" mb="lg">
                  {t("auth.loginRequiredPrompt")}
                </Text>
                <Button color="coral" onClick={() => setIsAuthOpen(true)}>
                  {t("sidebar.signInOrRegister")}
                </Button>
              </Paper>
            </Box>
          ) : currentView === "player" ? (
            selectedSheet ? (
              <InteractiveSheetViewer
                sheet={selectedSheet}
                playbackState={playbackState}
                speedMultiplier={speedMultiplier}
                setSpeedMultiplier={(spd) => handleUpdatePianoSettings({ speedMultiplier: spd })}
                startIndex={startIndex}
                setStartIndex={setStartIndex}
                onStartPlayback={handleStartPlayback}
                onPausePlayback={handlePausePlayback}
                onResumePlayback={handleResumePlayback}
                onSeekNote={handleSeekNote}
                onStopPlayback={handleStopPlayback}
                onBackToLibrary={() => setCurrentView("library")}
                onOpenSyncModal={() => setIsSyncOpen(true)}
                onEditSheet={handleOpenEditSheet}
                isAudioMuted={isAudioMuted}
                onToggleAudioMute={() => handleUpdatePianoSettings({ isAudioMuted: !pianoSettings.isAudioMuted })}
                pianoSettings={pianoSettings}
                onUpdatePianoSettings={handleUpdatePianoSettings}
              />
            ) : (
              <Box p="xl" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 460 }}>
                <Paper p="xl" radius="lg" withBorder style={{ textAlign: "center", maxWidth: 540, backgroundColor: "var(--surface-card)" }}>
                  <Box
                    mx="auto"
                    mb="md"
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: "14px",
                      backgroundColor: "var(--surface-dark)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                      border: "1px solid rgba(204,120,92,0.3)",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    }}
                  >
                    <img src="/app-logo.png" alt="Auto Piano Play" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </Box>
                  <Title order={3} mb="xs" fw={700}>
                    {t("player.noSongSelected")}
                  </Title>
                  <Text size="sm" c="dimmed" mb="lg">
                    {t("player.noSongDesc")}
                  </Text>
                  <Group justify="center" gap="sm">
                    <Button color="coral" leftSection={<Plus size={16} />} onClick={() => setCurrentView("upload")}>
                      {t("player.uploadCustomButton")}
                    </Button>
                    <Button variant="default" leftSection={<Globe size={16} />} onClick={() => setIsSyncOpen(true)}>
                      {t("player.syncButton")}
                    </Button>
                  </Group>
                </Paper>
              </Box>
            )
          ) : currentView === "library" ? (
            <SongLibrary
              sheets={allSheets}
              selectedSheet={selectedSheet}
              onSelectSheet={setSelectedSheet}
              onStartPlay={(s) => {
                setSelectedSheet(s);
                handleStartPlayback(s, 0);
              }}
              onOpenInteractiveViewer={(sheet) => {
                setSelectedSheet(sheet);
                setStartIndex(0);
                setCurrentView("player");
              }}
              onEditSheet={handleOpenEditSheet}
              user={user}
              onNavigateUpload={() => setCurrentView("upload")}
              onOpenSync={() => setIsSyncOpen(true)}
              onBulkImportSheets={handleBulkImportSheets}
            />
          ) : currentView === "upload" ? (
            <SheetUploader
              customSheets={customSheets}
              onSaveSheet={handleSaveCustomSheet}
              onDeleteSheet={handleDeleteCustomSheet}
              onSelectSheet={(sheet) => {
                setSelectedSheet(sheet);
                setStartIndex(0);
                setCurrentView("player");
              }}
              onStartPlay={(s) => {
                setSelectedSheet(s);
                handleStartPlayback(s, 0);
              }}
              user={user}
              onBulkImportSheets={handleBulkImportSheets}
            />
          ) : currentView === "profile" ? (
            <ProfileView
              user={user}
              onUserUpdated={(updated) => setUser(updated)}
              onOpenAuth={() => setIsAuthOpen(true)}
            />
          ) : (
            <RobloxGuideView />
          )}
        </main>

        {/* Bottom Persistent Bar */}
        <PlayerBar
          selectedSheet={selectedSheet}
          playbackState={playbackState}
          speedMultiplier={speedMultiplier}
          setSpeedMultiplier={(spd) => handleUpdatePianoSettings({ speedMultiplier: spd })}
          countdownSec={countdownSec}
          setCountdownSec={(sec) => handleUpdatePianoSettings({ countdownSec: sec })}
          onStartPlayback={() => handleStartPlayback(selectedSheet || undefined, startIndex)}
          onPausePlayback={handlePausePlayback}
          onResumePlayback={handleResumePlayback}
          onStopPlayback={handleStopPlayback}
        />
      </div>

      {/* Countdown Visual Overlay */}
      {playbackState.isCountdown && selectedSheet && (
        <CountdownOverlay
          remainingSec={playbackState.countdownSec}
          songTitle={selectedSheet.title}
          onCancel={handleStopPlayback}
        />
      )}

      {/* Modals */}
      <AuthModal
        isOpen={isAuthOpen || !user}
        isMandatory={!user}
        onClose={() => {
          if (userRef.current || user) {
            setIsAuthOpen(false);
          }
        }}
        onSuccess={(loggedUser) => {
          setUser(loggedUser);
          userRef.current = loggedUser;
          setIsAuthOpen(false);
          fetchCustomSheets(loggedUser.id).then((sheets) => {
            setCustomSheets(sheets);
            if (sheets.length > 0) {
              setSelectedSheet(sheets[0]);
              selectedSheetRef.current = sheets[0];
            } else if (DEFAULT_SHEETS.length > 0) {
              setSelectedSheet(DEFAULT_SHEETS[0]);
              selectedSheetRef.current = DEFAULT_SHEETS[0];
            }
          });
        }}
      />

      <PlayPianoSheetsSyncModal
        isOpen={isSyncOpen}
        onClose={() => setIsSyncOpen(false)}
        onSheetSynced={async (sheet) => {
          try {
            const saved = await saveCustomSheet(sheet, user?.id);
            setSelectedSheet(saved);
            setStartIndex(0);
            setCustomSheets((prev) => [saved, ...prev.filter((s) => s.id !== saved.id)]);
          } catch (err) {
            console.warn("Failed to persist synced sheet to SQLite:", err);
            setSelectedSheet(sheet);
            setStartIndex(0);
            setCustomSheets((prev) => [sheet, ...prev]);
          }
          setCurrentView("player");
        }}
      />

      <EditSheetModal
        opened={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingSheet(null);
        }}
        sheet={editingSheet}
        onSave={async (updatedSheet) => {
          await handleSaveCustomSheet(updatedSheet);
        }}
      />
    </div>
  );
}

export default App;
