"use client";

import Lottie from "lottie-react";
import coolAnimation from "@/public/animations/player-music.json";
import styles from "./virtual.module.css";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { io } from "socket.io-client";
import { useRouter } from "next/navigation";

// Constants
const SOCKET_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
const TIME_SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes (Issue #10)
const DRIFT_CHECK_INTERVAL = 1000;
const DRIFT_THRESHOLD = 0.05; // Issue #8: More precise threshold
const PLAYBACK_BUFFER_MS = 2000;
const SEEK_DEBOUNCE_MS = 300;
const MAX_FILE_SIZE = 50 * 1024 * 1024;
const ALLOWED_AUDIO_TYPES = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg"];
const TIME_SYNC_SAMPLES = 3; // Issue #10: Reduced from 5

export default function Virtual() {
  const [file, setFile] = useState([]);
  const [tracks, setTracks] = useState([]);
  const [sidebar, setSidebar] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [ishost, setIshost] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [timeOffset, setTimeOffset] = useState(0);
  const [toast, setToast] = useState({ show: false, message: "", type: "info" });
  const [isLoading, setIsLoading] = useState(true); // Issue #23
  const [isSeeking, setIsSeeking] = useState(false); // Issue #24
  
  const audioRef = useRef(null);
  const fileInputRef = useRef(null);
  const socketRef = useRef(null);
  const driftCheckRef = useRef(null);
  const seekTimeoutRef = useRef(null);
  const toastTimeoutRef = useRef(null); // Issue #13
  const timeSyncIntervalRef = useRef(null); // Issue #21
  const abortControllerRef = useRef(null); // Issue #11
  const lottieRef = useRef(null); // Issue #15
  const playbackStateRef = useRef({
    startTime: 0,
    plannedStart: 0,
    index: -1
  });

  const { data: session, status } = useSession({
    required: true, // Issue #22
    onUnauthenticated() {
      router.replace("/login");
    }
  });
  const router = useRouter();
  const params = useParams();
  
  const roomId = useMemo(() => {
    if (!params) return null;
    return params.roomId || null;
  }, [params]);

  // Issue #17: Early return if no roomId
  if (!roomId) {
    return <div className={styles.container}>Loading room...</div>;
  }

  // Issue #13: Improved toast with cleanup
  const showToast = useCallback((message, type = "info") => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToast({ show: true, message, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToast({ show: false, message: "", type: "info" });
    }, 3000);
  }, []);

  // Cleanup toast on unmount
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  // Issue #4 & #6: Improved time sync with error handling and failure tracking
  const fetchServerTime = useCallback(async () => {
    try {
      const samples = [];
      
      for (let i = 0; i < TIME_SYNC_SAMPLES; i++) {
        const t0 = Date.now();
        const res = await fetch("/api/time", { 
          method: 'GET', 
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' }
        });
        
        // Issue #4: Check response status
        if (!res.ok) {
          throw new Error(`Server time API error: ${res.status}`);
        }
        
        const data = await res.json();
        const t1 = Date.now();
        
        const rtt = t1 - t0;
        const serverTime = data.time;
        const estimatedServerTime = serverTime + (rtt / 2);
        const offset = estimatedServerTime - t1;
        
        samples.push({ offset, rtt });
        
        if (i < TIME_SYNC_SAMPLES - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      const validSamples = samples.filter(s => s.rtt < 1000);
      const useSamples = validSamples.length > 0 ? validSamples : samples;
      
      useSamples.sort((a, b) => a.offset - b.offset);
      const medianSample = useSamples[Math.floor(useSamples.length / 2)];
      
      setTimeOffset(medianSample.offset);
      
      if (process.env.NODE_ENV === 'development') {
        console.log("🕒 Time offset:", medianSample.offset.toFixed(0), "ms");
      }
      
      return medianSample.offset;
    } catch (err) {
      console.error("Failed to fetch server time:", err);
      showToast("Time sync failed, playback may be out of sync", "warning");
      return 0;
    }
  }, [showToast]);

  // Issue #6: Time sync with failure tracking
  useEffect(() => {
    let failureCount = 0;
    
    const syncTime = async () => {
      try {
        await fetchServerTime();
        failureCount = 0;
      } catch (err) {
        failureCount++;
        if (failureCount >= 5) {
          console.error("Time sync failed 5 times, stopping retries");
          if (timeSyncIntervalRef.current) {
            clearInterval(timeSyncIntervalRef.current);
          }
        }
      }
    };
    
    syncTime();
    timeSyncIntervalRef.current = setInterval(syncTime, TIME_SYNC_INTERVAL);
    
    return () => {
      if (timeSyncIntervalRef.current) {
        clearInterval(timeSyncIntervalRef.current);
      }
    };
  }, [fetchServerTime]);

  // Issue #5 & #11: Improved fetch with abort controller and error handling
  const fetchTracks = useCallback(async () => {
    if (!roomId) return;
    
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    
    try {
      setIsLoading(true);
      const res = await fetch(`/api/tracks?roomId=${roomId}`, {
        signal: abortControllerRef.current.signal
      });
      
      if (!res.ok) {
        throw new Error(`Failed to fetch tracks: ${res.status}`);
      }
      
      const data = await res.json();
      setTracks(data.files || []);
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error("Fetch Tracks Error:", err);
        showToast("Failed to load tracks", "error");
      }
    } finally {
      setIsLoading(false);
    }
  }, [roomId, showToast]);

  const fetchRoomInfo = useCallback(async () => {
    if (!roomId || !session?.user?.id) return;
    
    try {
      const res = await fetch(`/api/rooms?rcode=${roomId}&user_id=${session.user.id}`);
      
      if (!res.ok) {
        throw new Error(`Failed to fetch room info: ${res.status}`);
      }
      
      const data = await res.json();
      if (data.success) {
        setIshost(session.user.id === data.room.hostId);
      }
    } catch (err) {
      console.error("Fetch Room Info Error:", err);
      showToast("Failed to load room info", "error");
    }
  }, [roomId, session?.user?.id, showToast]);

  useEffect(() => {
    fetchTracks();
    fetchRoomInfo();
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchTracks, fetchRoomInfo]);

  // Issue #3: Clear old audio listeners before setting new ones
  const playTrack = useCallback((index, startTime = 0, plannedStart = Date.now()) => {
    if (!tracks[index]) return;
    const audio = audioRef.current;
    if (!audio) return;

    if (driftCheckRef.current) {
      clearInterval(driftCheckRef.current);
      driftCheckRef.current = null;
    }

    playbackStateRef.current = { startTime, plannedStart, index };

    const currentSrc = audio.src ? new URL(audio.src).pathname : '';
    const newSrc = tracks[index].url;
    const newSrcPath = newSrc.startsWith('http') ? new URL(newSrc).pathname : newSrc;

    if (currentIndex !== index || currentSrc !== newSrcPath) {
      // Issue #3: Clear old listener before setting new one
      audio.onloadeddata = null;
      audio.src = newSrc;
      setCurrentIndex(index);
      
      const handleLoad = () => {
        schedulePlayback(audio, startTime, plannedStart);
      };
      
      audio.onloadeddata = handleLoad;
    } else {
      schedulePlayback(audio, startTime, plannedStart);
    }

    setIsPlaying(true);
  }, [tracks, currentIndex]);

  const schedulePlayback = useCallback((audio, startTime, plannedStart) => {
    const now = Date.now();
    const serverNow = now + timeOffset;
    const wait = plannedStart - serverNow;

    if (process.env.NODE_ENV === 'development') {
      console.log("📊 Schedule:", { wait, serverNow, plannedStart });
    }

    const executePlayback = () => {
      if (!audio) return;
      audio.currentTime = startTime;
      audio.play()
        .then(() => startDriftCorrection(audio, startTime, plannedStart))
        .catch(e => {
          console.error("Play error:", e);
          showToast("Playback failed. Try unlocking audio.", "error");
        });
    };

    if (wait > 50) {
      setTimeout(executePlayback, wait);
    } else if (wait > -1000) {
      executePlayback();
    } else {
      const elapsed = Math.abs(wait) / 1000;
      const catchUpTime = startTime + elapsed;
      
      if (catchUpTime < audio.duration) {
        audio.currentTime = catchUpTime;
        audio.play()
          .then(() => startDriftCorrection(audio, startTime, plannedStart))
          .catch(e => console.error("Play error:", e));
      }
    }
  }, [timeOffset, showToast]);

  // Issue #8 & #24: Improved drift correction with smoother adjustments
  const startDriftCorrection = useCallback((audio, startTime, plannedStart) => {
  if (driftCheckRef.current) {
    clearInterval(driftCheckRef.current);
  }

  let correctionTimeout;

  const applySmoothCorrection = (drift) => {
    if (!audio) return;
    clearTimeout(correctionTimeout);

    // Small drifts don't need correction
    if (Math.abs(drift) < 0.03) return;

    // Apply very small playback rate shift
    const rate = drift > 0 ? 0.985 : 1.015;
    audio.playbackRate = rate;

    // After 1.5s, return to normal speed
    correctionTimeout = setTimeout(() => {
      if (audio) audio.playbackRate = 1.0;
    }, 1500);
  };

  driftCheckRef.current = setInterval(() => {
    // Skip correction during seek or pause
    if (!audio || audio.paused || isSeeking) {
      if (driftCheckRef.current) {
        clearInterval(driftCheckRef.current);
        driftCheckRef.current = null;
      }
      return;
    }

    const now = Date.now();
    const serverNow = now + timeOffset;
    const expectedTime = startTime + (serverNow - plannedStart) / 1000;
    const actualTime = audio.currentTime;
    const drift = expectedTime - actualTime;

    if (Math.abs(drift) > 0.03) {
      if (process.env.NODE_ENV === "development") {
        console.log(`🎧 Smooth Drift: ${drift.toFixed(3)}s → rate=${audio.playbackRate}`);
      }
      applySmoothCorrection(drift);
    }
  }, 3000);

  // Cleanup correction timeout when new correction starts or unmounts
  return () => {
    clearInterval(driftCheckRef.current);
    clearTimeout(correctionTimeout);
    driftCheckRef.current = null;
    if (audio) audio.playbackRate = 1.0;
  };
}, [timeOffset, isSeeking]);


  const pauseTrack = useCallback(() => {
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (driftCheckRef.current) {
      clearInterval(driftCheckRef.current);
      driftCheckRef.current = null;
    }
  }, []);

  // Issue #7: Safe socket emit helper
  const safeEmit = useCallback((event, payload) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, payload);
    } else {
      console.warn(`Socket not ready for ${event}`);
      showToast("Connection lost, please refresh", "error");
    }
  }, [showToast]);

  // Issue #1: Removed tracks from dependencies, only roomId
  useEffect(() => {
    if (!roomId) return;

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 10000
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      if (process.env.NODE_ENV === 'development') {
        console.log("✅ Connected:", socket.id);
      }
      
      fetchServerTime().then(() => {
        // Issue #26: Wait for join ack before requesting state
        socket.emit("join-room", roomId, (ack) => {
          if (ack && !ishost) {
            safeEmit("request-state", { roomId });
          }
        });
      });
    });

    socket.on("song-info", ({ index, progress, plannedStart }) => {
      // Access tracks from state via callback
      setTracks(currentTracks => {
        if (currentTracks[index]) {
          playTrack(index, progress, plannedStart);
        }
        return currentTracks;
      });
    });

    socket.on("pause", pauseTrack);
    
    socket.on("current-state", ({ index, progress, plannedStart, isPlaying: playing }) => {
      setTracks(currentTracks => {
        if (playing && currentTracks[index]) {
          playTrack(index, progress, plannedStart);
        } else {
          setCurrentIndex(index);
          setIsPlaying(false);
        }
        return currentTracks;
      });
    });

    socket.on("disconnect", () => {
      if (process.env.NODE_ENV === 'development') {
        console.log("❌ Disconnected");
      }
      showToast("Connection lost", "warning");
    });

    socket.on("error", (error) => {
      console.error("Socket error:", error);
      showToast("Connection error", "error");
    });

    return () => {
      if (driftCheckRef.current) {
        clearInterval(driftCheckRef.current);
      }
      socket.disconnect();
    };
  }, [roomId, ishost, fetchServerTime, safeEmit, pauseTrack, playTrack, showToast]);

  // Audio event listeners
  useEffect(() => {
    if (!audioRef.current) return;
    const audio = audioRef.current;

    const updateTime = () => setProgress(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => {
      if (ishost) nextTrack();
    };

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [ishost]);

  // Control functions
  const semiplay = useCallback((index, seekTo = null) => {
    if (!ishost || tracks.length === 0) return;

    const newProgress = seekTo !== null ? seekTo : (index === currentIndex ? progress : 0);
    const serverNow = Date.now() + timeOffset;
    const plannedStart = serverNow + PLAYBACK_BUFFER_MS;

    safeEmit("song-info", {
      index,
      progress: newProgress,
      plannedStart,
      roomId,
    });
  }, [ishost, tracks.length, currentIndex, progress, timeOffset, roomId, safeEmit]);

  const semipause = useCallback(() => {
    if (!ishost) return;
    safeEmit("pause", { roomId });
  }, [ishost, roomId, safeEmit]);

  const nextTrack = useCallback(() => {
    // Issue #19: Guard against empty playlist
    if (!ishost || tracks.length === 0) return;

    const next = (currentIndex + 1) % tracks.length;
    const serverNow = Date.now() + timeOffset;
    const plannedStart = serverNow + 1500;

    safeEmit("song-info", {
      index: next,
      progress: 0,
      plannedStart,
      roomId,
    });
  }, [ishost, tracks.length, currentIndex, timeOffset, roomId, safeEmit]);

  const prevTrack = useCallback(() => {
    // Issue #19: Guard against empty playlist
    if (!ishost || tracks.length === 0) return;

    const prev = (currentIndex - 1 + tracks.length) % tracks.length;
    const serverNow = Date.now() + timeOffset;
    const plannedStart = serverNow + 1500;

    safeEmit("song-info", {
      index: prev,
      progress: 0,
      plannedStart,
      roomId,
    });
  }, [ishost, tracks.length, currentIndex, timeOffset, roomId, safeEmit]);

  // Issue #24: Track seeking state
  const handleSeek = useCallback((e) => {
    if (!ishost) return;
    const newProgress = parseFloat(e.target.value);
    
    setIsSeeking(true);
    
    if (driftCheckRef.current) {
      clearInterval(driftCheckRef.current);
      driftCheckRef.current = null;
    }
    
    if (audioRef.current) {
      audioRef.current.currentTime = newProgress;
    }
    setProgress(newProgress);
    
    if (seekTimeoutRef.current) {
      clearTimeout(seekTimeoutRef.current);
    }
    
    seekTimeoutRef.current = setTimeout(() => {
      setIsSeeking(false);
      
      const serverNow = Date.now() + timeOffset;
      const plannedStart = serverNow + 500;
      
      playbackStateRef.current = {
        startTime: newProgress,
        plannedStart,
        index: currentIndex
      };
      
      safeEmit("song-info", {
        index: currentIndex,
        progress: newProgress,
        plannedStart,
        roomId,
      });
      
      if (audioRef.current && !audioRef.current.paused) {
        startDriftCorrection(audioRef.current, newProgress, plannedStart);
      }
    }, SEEK_DEBOUNCE_MS);
  }, [ishost, timeOffset, currentIndex, roomId, safeEmit, startDriftCorrection]);

  // Issue #12: Clear file input after selection
  const handleupload = useCallback((e) => {
    const files = Array.from(e.target.files);
    
    const validFiles = files.filter(f => {
      if (f.size > MAX_FILE_SIZE) {
        showToast(`${f.name} exceeds 50MB limit`, "error");
        return false;
      }
      if (!ALLOWED_AUDIO_TYPES.includes(f.type)) {
        showToast(`${f.name} is not a valid audio file`, "error");
        return false;
      }
      return true;
    });
    
    setFile(validFiles);
    // Issue #12: Clear input so same file can be selected again
    e.target.value = null;
  }, [showToast]);

  const uploadFile = useCallback(async () => {
    // Issue #25: Check roomId before upload
    if (!roomId) {
      showToast("Room not ready for upload", "error");
      return;
    }
    
    if (!ishost) {
      showToast("Only host can upload songs", "error");
      return;
    }
    if (!file || file.length === 0) {
      showToast("Please select files", "error");
      return;
    }

    try {
      showToast(`Uploading ${file.length} file(s)...`, "info");
      
      await Promise.all(
        file.map(async (f) => {
          const res = await fetch(
            `/api/upload-url?fileName=${encodeURIComponent(f.name)}&fileType=${encodeURIComponent(f.type)}&roomId=${roomId}`
          );
          const data = await res.json();
          
          if (!data.url) throw new Error(`Failed to get upload URL for ${f.name}`);

          // Issue #20: Add Content-Length header
          const putRes = await fetch(data.url, {
            method: "PUT",
            headers: { 
              "Content-Type": f.type,
              "Content-Length": f.size.toString()
            },
            body: f,
          });

          if (!putRes.ok) throw new Error(`Upload failed for ${f.name}`);
        })
      );

      await fetchTracks();
      setFile([]);
      showToast("Upload complete ✅", "success");
    } catch (err) {
      console.error("Upload Error:", err);
      showToast(`Upload failed: ${err.message}`, "error");
    }
  }, [ishost, file, roomId, fetchTracks, showToast]);

  const unlockAudio = useCallback(() => {
    if (!audioRef.current) return;
    
    const audio = audioRef.current;
    const silentAudio = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";
    
    audio.src = silentAudio;
    audio.muted = true;
    audio.volume = 0;
    
    const playPromise = audio.play();
    
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setTimeout(() => {
            audio.pause();
            audio.muted = false;
            audio.volume = 1;
            audio.src = "";
            setUnlocked(true);
            showToast("Audio unlocked! Ready to play.", "success");
          }, 100);
        })
        .catch((err) => {
          console.warn("❌ Unlock failed:", err);
          showToast("Please interact with the page to enable audio", "error");
        });
    }
  }, [showToast]);

  const formatTime = useCallback((time) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  }, []);

  const songName = useMemo(() => {
    const track = tracks[currentIndex];
    if (!track || !track.key) return "No track selected";
    
    const parts = track.key.split("/");
    return parts[parts.length - 1] || "Unknown track";
  }, [tracks, currentIndex]);

  const buttonStyle = useMemo(() => ({
    enabled: { opacity: 1, cursor: 'pointer' },
    disabled: { opacity: 0.5, cursor: 'not-allowed', pointerEvents: 'none' }
  }), []);

  // Issue #21: Cleanup all intervals on unmount
  useEffect(() => {
    return () => {
      if (driftCheckRef.current) clearInterval(driftCheckRef.current);
      if (timeSyncIntervalRef.current) clearInterval(timeSyncIntervalRef.current);
      if (seekTimeoutRef.current) clearTimeout(seekTimeoutRef.current);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  // Issue #27: Cleanup on navigation
  useEffect(() => {
    const handleRouteChange = () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };

    // Next.js 13+ App Router doesn't have router.events
    // So we rely on component unmount cleanup
    return handleRouteChange;
  }, []);

  return (
    <div className={styles.container}>
      {toast.show && (
        <div className={`${styles.toast} ${styles[toast.type]}`}>
          {toast.message}
        </div>
      )}

      {!unlocked && (
        <div className={styles.unlock}>
          <button onClick={unlockAudio}>Start Listening</button>
        </div>
      )}

      <div className={styles.top}>
        <button onClick={() => router.back()}>
          <img src="/back.svg" alt="back" />
        </button>
        <div className={styles.title}>Virtual Room</div>
        <button onClick={() => setSidebar(true)}>
          <img src="/side.svg" alt="menu" />
        </button>
      </div>

      <div className={styles.song_info}>
        <div className={styles.newbg}>
          {/* Issue #15: Use ref for Lottie speed control */}
          <Lottie 
            lottieRef={lottieRef}
            animationData={coolAnimation} 
            loop={isPlaying}
          />
        </div>
        {ishost && (
          <div className={styles.add}>
            <div
              className={styles.add2}
              onClick={() => fileInputRef.current?.click()}
            >
              <img src="/plus.svg" alt="add" />
            </div>

            <div className={styles.upload} onClick={uploadFile}>
              <img src="/upload.svg" alt="upload" />
            </div>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: "none" }}
              multiple
              accept="audio/*"
              onChange={handleupload}
            />
          </div>
        )}
      </div>

      <div className={styles.songname}>{songName}</div>

      <div className={styles.seekbar}>
        <input
          type="range"
          min="0"
          max={duration || 0}
          value={progress}
          step="0.1"
          onChange={handleSeek}
          disabled={!ishost}
        />
        <div className={styles.format}>
          {formatTime(progress)} / {formatTime(duration)}
        </div>
      </div>

      <div className={styles.song_btn}>
        <div className={styles.btn}>
          <img 
            src="/prev.svg" 
            alt="prev" 
            onClick={prevTrack}
            style={ishost ? buttonStyle.enabled : buttonStyle.disabled}
          />
          <div className={styles.stop}>
            {!isPlaying ? (
              <img 
                src="/play.svg" 
                alt="play" 
                onClick={() => semiplay(currentIndex)}
                style={ishost ? buttonStyle.enabled : buttonStyle.disabled}
              />
            ) : (
              <img 
                src="/pause.svg" 
                alt="pause" 
                onClick={semipause}
                style={ishost ? buttonStyle.enabled : buttonStyle.disabled}
              />
            )}
          </div>
          <img 
            src="/next.svg" 
            alt="next" 
            onClick={nextTrack}
            style={ishost ? buttonStyle.enabled : buttonStyle.disabled}
          />
        </div>
      </div>

      <div className={`${styles.side} ${sidebar ? styles.open : ""}`}>
        <img onClick={() => setSidebar(false)} src="/cross.svg" alt="close" />
        <div className={styles.title}>Playlist</div>
        
        {/* Issue #23: Loading state */}
        {isLoading ? (
          <p style={{ padding: '20px', textAlign: 'center' }}>Loading tracks...</p>
        ) : tracks.length === 0 ? (
          <p style={{ padding: '20px', textAlign: 'center' }}>No tracks yet</p>
        ) : (
          <ul>
            {tracks.map((track, index) => {
              if (!track || !track.key) return null;
              
              const name = track.key.split("/").pop() || "Unknown";
              const shortName = name.length > 15 ? name.slice(0, 15) + "..." : name;
              const isActive = index === currentIndex;
              
              return (
                <li 
                  key={track.id || `${track.key}-${index}`}
                  onClick={() => ishost && semiplay(index, 0)}
                  style={{ 
                    cursor: ishost ? 'pointer' : 'default',
                    fontWeight: isActive ? 'bold' : 'normal',
                  }}
                >
                  {shortName}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <audio ref={audioRef} hidden />
    </div>
  );
}