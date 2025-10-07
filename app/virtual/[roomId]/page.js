"use client";

import styles from "./virtual.module.css";
import { useState, useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { io } from "socket.io-client";
import { useRouter } from "next/navigation";

export default function Virtual() {
  const [file, setFile] = useState([]);
  const [tracks, setTracks] = useState([]);
  const [sidebar, setSidebar] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [stop, setStop] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [ishost, setIshost] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [timeOffset, setTimeOffset] = useState(0);
  
  const audioRef = useRef(null);
  const fileInputRef = useRef(null);
  const socketRef = useRef(null);
  const driftCheckRef = useRef(null);
  const playbackStateRef = useRef({
    startTime: 0,
    plannedStart: 0,
    index: -1
  });

  const { data: session, status } = useSession();
  const router = useRouter();
  const { roomId } = useParams();

  // Redirect if not logged in
  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.replace("/login");
    }
  }, [session, status, router]);

  // ---------- FETCH SERVER TIME (with multiple samples for accuracy) ----------
  const fetchServerTime = async () => {
    try {
      const samples = [];
      
      // Take 5 samples to get better accuracy
      for (let i = 0; i < 5; i++) {
        const clientSend = Date.now();
        const res = await fetch("/api/time", { method: 'GET' });
        const data = await res.json();
        const serverTime = data.time;
        const clientReceive = Date.now();
        const rtt = clientReceive - clientSend;
        const offset = serverTime - (clientSend + rtt / 2);
        
        samples.push({ offset, rtt });
        
        // Small delay between samples
        if (i < 4) await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      // Use the sample with lowest RTT (most accurate)
      samples.sort((a, b) => a.rtt - b.rtt);
      const bestSample = samples[0];
      
      setTimeOffset(bestSample.offset);
      console.log("🕒 Time offset (ms):", bestSample.offset, "RTT:", bestSample.rtt);
    } catch (err) {
      console.error("Failed to fetch server time:", err);
    }
  };

  useEffect(() => {
    fetchServerTime();
    // Re-sync time every 5 minutes to account for drift
    const interval = setInterval(fetchServerTime, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // ---------- SOCKET SETUP ----------
  useEffect(() => {
    if (!roomId) return;

    const socket = io(process.env.NEXT_PUBLIC_BACKEND_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Connected to Socket.IO:", socket.id);
      socket.emit("join-room", roomId);
      
      // Request current state if not host
      if (!ishost) {
        socket.emit("request-state", { roomId });
      }
    });

    socket.on("song-info", ({ index, progress, plannedStart }) => {
      if (!tracks[index]) return;
      playTrack(index, progress, plannedStart);
    });

    socket.on("pause", () => pauseTrack());
    
    socket.on("current-state", ({ index, progress, plannedStart, isPlaying }) => {
      if (isPlaying && tracks[index]) {
        playTrack(index, progress, plannedStart);
      } else {
        setCurrentIndex(index);
        setStop(false);
      }
    });

    return () => {
      if (driftCheckRef.current) {
        clearInterval(driftCheckRef.current);
      }
      socket.disconnect();
    };
  }, [roomId, tracks, ishost]);

  // Fetch tracks
  const fetchTracks = async () => {
    if (!roomId) return;
    try {
      const res = await fetch(`/api/tracks?roomId=${roomId}`);
      const data = await res.json();
      setTracks(data.files || []);
    } catch (err) {
      console.error("Fetch Tracks Error:", err);
    }
  };

  // Fetch room info
  const fetchRoomInfo = async () => {
    if (!roomId || !session?.user?.id) return;
    try {
      const res = await fetch(`/api/rooms?rcode=${roomId}&user_id=${session.user.id}`);
      const data = await res.json();
      if (data.success) setIshost(session.user.id === data.room.hostId);
    } catch (err) {
      console.error("Fetch Room Info Error:", err);
    }
  };

  useEffect(() => {
    fetchTracks();
    fetchRoomInfo();
  }, [roomId, session?.user?.id]);

  // Audio listeners
  useEffect(() => {
    if (!audioRef.current) return;
    const audio = audioRef.current;

    const updateTime = () => {
      setProgress(audio.currentTime);
    };

    const updateDuration = () => setDuration(audio.duration);
    
    const handleEnded = () => {
      if (ishost) {
        nextTrack();
      }
    };

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [tracks, ishost, currentIndex]);

  // ---------- IMPROVED PLAY TRACK WITH BETTER SYNC ----------
  const playTrack = (index, startTime = 0, plannedStart = Date.now()) => {
    if (!tracks[index]) return;
    const audio = audioRef.current;
    if (!audio) return;

    // Clear any existing drift check
    if (driftCheckRef.current) {
      clearInterval(driftCheckRef.current);
    }

    // Update playback state
    playbackStateRef.current = {
      startTime,
      plannedStart,
      index
    };

    // Load new track if needed
    if (currentIndex !== index || audio.src !== tracks[index].url) {
      audio.src = tracks[index].url;
      setCurrentIndex(index);
      
      // Wait for audio to be ready before playing
      audio.onloadeddata = () => {
        schedulePlayback(audio, startTime, plannedStart);
      };
    } else {
      schedulePlayback(audio, startTime, plannedStart);
    }

    setStop(true);
  };

  const schedulePlayback = (audio, startTime, plannedStart) => {
    const localPlannedStart = plannedStart - timeOffset;
    const now = Date.now();
    const wait = localPlannedStart - now;

    if (wait > 50) {
      // Future start - schedule it
      setTimeout(() => {
        audio.currentTime = startTime;
        audio.play().catch(e => console.error("Play error:", e));
        startDriftCorrection(audio, startTime, plannedStart);
      }, wait);
    } else if (wait > -1000) {
      // Very close to start time or slightly past - start immediately
      audio.currentTime = startTime;
      audio.play().catch(e => console.error("Play error:", e));
      startDriftCorrection(audio, startTime, plannedStart);
    } else {
      // Significantly late - calculate catch-up position
      const elapsed = (-wait) / 1000;
      const catchUpTime = startTime + elapsed;
      
      if (catchUpTime < audio.duration) {
        audio.currentTime = catchUpTime;
        audio.play().catch(e => console.error("Play error:", e));
        startDriftCorrection(audio, startTime, plannedStart);
      }
    }
  };

  const startDriftCorrection = (audio, startTime, plannedStart) => {
    // More aggressive drift correction
    driftCheckRef.current = setInterval(() => {
      if (audio.paused) {
        clearInterval(driftCheckRef.current);
        return;
      }
      
      const now = Date.now();
      const serverNow = now + timeOffset;
      const expectedTime = startTime + (serverNow - plannedStart) / 1000;
      const actualTime = audio.currentTime;
      const drift = expectedTime - actualTime;

      // Correct if drift exceeds threshold
      if (Math.abs(drift) > 0.25) {
        console.log(`🔧 Correcting drift: ${drift.toFixed(3)}s`);
        audio.currentTime = expectedTime;
      }
    }, 1000); // Check every second
  };

  // ---------- IMPROVED CONTROL FUNCTIONS ----------
  const semiplay = (index, seekTo = null) => {
    if (!ishost || tracks.length === 0) return;

    const newProgress = seekTo !== null ? seekTo : (index === currentIndex ? progress : 0);
    const plannedStart = Date.now() + timeOffset + 2000; // 2s buffer for network

    socketRef.current?.emit("song-info", {
      index,
      progress: newProgress,
      plannedStart,
      roomId,
    });
  };

  const semipause = () => {
    if (!ishost) return;
    socketRef.current?.emit("pause", { roomId });
  };

  const pauseTrack = () => {
    setStop(false);
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (driftCheckRef.current) {
      clearInterval(driftCheckRef.current);
    }
  };

  const nextTrack = () => {
    if (!ishost || tracks.length === 0) return;

    const next = (currentIndex + 1) % tracks.length;
    const plannedStart = Date.now() + timeOffset + 1500;

    socketRef.current?.emit("song-info", {
      index: next,
      progress: 0,
      plannedStart,
      roomId,
    });
  };

  const prevTrack = () => {
    if (!ishost || tracks.length === 0) return;

    const prev = (currentIndex - 1 + tracks.length) % tracks.length;
    const plannedStart = Date.now() + timeOffset + 1500;

    socketRef.current?.emit("song-info", {
      index: prev,
      progress: 0,
      plannedStart,
      roomId,
    });
  };

  const handleSeek = (e) => {
    if (!ishost) return;
    const newProgress = parseFloat(e.target.value);
    
    // Update local progress immediately for responsiveness
    setProgress(newProgress);
    
    // Debounce the actual seek to avoid too many emissions
    if (handleSeek.timeout) clearTimeout(handleSeek.timeout);
    
    handleSeek.timeout = setTimeout(() => {
      const plannedStart = Date.now() + timeOffset + 1000;
      
      socketRef.current?.emit("song-info", {
        index: currentIndex,
        progress: newProgress,
        plannedStart,
        roomId,
      });
    }, 300);
  };

  // ---------- FILE UPLOAD ----------
  const handleupload = (e) => setFile(Array.from(e.target.files));

  const uploadFile = async () => {
    if (!ishost) return alert("Only host can upload songs");
    if (!file || file.length === 0) return alert("Please select files");

    try {
      for (let f of file) {
        const res = await fetch(
          `/api/upload-url?fileName=${encodeURIComponent(f.name)}&fileType=${encodeURIComponent(f.type)}&roomId=${roomId}`
        );
        const data = await res.json();
        if (!data.url) throw new Error("Failed to get upload URL");

        const putRes = await fetch(data.url, {
          method: "PUT",
          headers: { "Content-Type": f.type },
          body: f,
        });

        if (!putRes.ok) throw new Error("S3 upload failed");
      }

      fetchTracks();
      setFile([]);
      alert("Upload complete ✅");
    } catch (err) {
      console.error("Upload Error:", err);
      alert("Upload failed: " + err.message);
    }
  };

  const unlockAudio = () => {
    if (audioRef.current) {
      audioRef.current.src = "/silencer.mp3";
      audioRef.current.muted = true;
      audioRef.current.play()
        .then(() => {
          audioRef.current.pause();
          audioRef.current.removeAttribute("src");
          audioRef.current.load();
          audioRef.current.muted = false;
          setUnlocked(true);
        })
        .catch((err) => {
          console.warn("❌ Unlock failed:", err);
          setUnlocked(false);
        });
    }
  };

  const formatTime = (time) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  };

  // ---------- UI ----------
  let song_name = tracks[currentIndex]?.key?.split("/")[1] || "";

  return (
    <div className={styles.container}>
      {!unlocked && (
        <div className={styles.unlock}>
          <button onClick={unlockAudio}>Start Listening</button>
        </div>
      )}

      <div className={styles.top}>
        <button>
          <img src="/back.svg" alt="" />
        </button>
        <div className={styles.title}>Virtual Room</div>
        <button onClick={() => setSidebar(true)}>
          <img src="/side.svg" alt="" />
        </button>
      </div>

      <div className={styles.song_info}>
        <div className={styles.newbg}>
          <img src="/bg.jpeg" alt="" />
        </div>
        {ishost && (
          <div className={styles.add}>
            <div
              className={styles.add2}
              onClick={() => fileInputRef.current.click()}
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
              onChange={handleupload}
            />
          </div>
        )}
      </div>

      <div className={styles.songname}>{song_name}</div>

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
            style={{ opacity: ishost ? 1 : 0.5, cursor: ishost ? 'pointer' : 'not-allowed' }}
          />
          <div className={styles.stop}>
            {!stop ? (
              <img 
                src="/play.svg" 
                alt="play" 
                onClick={() => ishost && semiplay(currentIndex)}
                style={{ opacity: ishost ? 1 : 0.5, cursor: ishost ? 'pointer' : 'not-allowed' }}
              />
            ) : (
              <img 
                src="/pause.svg" 
                alt="pause" 
                onClick={semipause}
                style={{ opacity: ishost ? 1 : 0.5, cursor: ishost ? 'pointer' : 'not-allowed' }}
              />
            )}
          </div>
          <img 
            src="/next.svg" 
            alt="next" 
            onClick={nextTrack}
            style={{ opacity: ishost ? 1 : 0.5, cursor: ishost ? 'pointer' : 'not-allowed' }}
          />
        </div>
      </div>

      <div className={`${styles.side} ${sidebar ? styles.open : ""}`}>
        <img onClick={() => setSidebar(false)} src="/cross.svg" alt="close" />
        <div className={styles.title}>Playlist</div>
        <ul>
          {tracks.map((track, index) => {
            const name = track.key.split("/")[1];
            const shortName = name.length > 15 ? name.slice(0, 15) + "..." : name;
            return (
              <li 
                key={index} 
                onClick={() => ishost && semiplay(index, 0)}
                style={{ 
                  cursor: ishost ? 'pointer' : 'default',
                  backgroundColor: index === currentIndex ? '#333' : 'transparent'
                }}
              >
                {shortName}
              </li>
            );
          })}
        </ul>
      </div>

      <audio ref={audioRef} hidden />
    </div>
  );
}