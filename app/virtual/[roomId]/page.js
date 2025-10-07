"use client";

import styles from "./virtual.module.css";
import { useState, useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { io } from "socket.io-client";
import { useRouter } from "next/navigation";

export default function Virtual() {
  const [tracks, setTracks] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [stop, setStop] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [ishost, setIshost] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [timeOffset, setTimeOffset] = useState(0);
  const [sidebar, setSidebar] = useState(false);
  const [file, setFile] = useState([]);

  const audioRef = useRef(null);
  const fileInputRef = useRef(null);
  const socketRef = useRef(null);
  const driftCheckRef = useRef(null);
  const playbackStateRef = useRef({ startTime: 0, plannedStart: 0, index: -1 });

  const { data: session, status } = useSession();
  const router = useRouter();
  const { roomId } = useParams();

  // Redirect if not logged in
  useEffect(() => {
    if (status === "loading") return;
    if (!session) router.replace("/login");
  }, [session, status, router]);

  // ---------- Fetch server time for offset ----------
  const fetchServerTime = async () => {
    try {
      const samples = [];
      for (let i = 0; i < 5; i++) {
        const clientSend = Date.now();
        const res = await fetch("/api/time", { cache: "no-store" });
        const data = await res.json();
        const clientReceive = Date.now();
        const offset = data.time - ((clientSend + clientReceive) / 2);
        samples.push(offset);
        if (i < 4) await new Promise(r => setTimeout(r, 100));
      }
      samples.sort((a, b) => a - b);
      const medianOffset = samples[Math.floor(samples.length / 2)];
      setTimeOffset(medianOffset);
      return medianOffset;
    } catch (err) {
      console.error("Failed to fetch server time:", err);
      return 0;
    }
  };

  useEffect(() => {
    fetchServerTime();
    const interval = setInterval(fetchServerTime, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // ---------- Socket setup ----------
  useEffect(() => {
    if (!roomId) return;

    const socket = io(process.env.NEXT_PUBLIC_BACKEND_URL, { transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("connect", async () => {
      console.log("Connected:", socket.id);
      await fetchServerTime();
      socket.emit("join-room", roomId);
      if (!ishost) socket.emit("request-state", { roomId });
    });

    socket.on("song-info", ({ index, progress, plannedStart }) => {
      if (!tracks[index]) return;
      playTrack(index, progress, plannedStart);
    });

    socket.on("pause", pauseTrack);

    socket.on("current-state", ({ index, progress, plannedStart, isPlaying }) => {
      if (isPlaying && tracks[index]) playTrack(index, progress, plannedStart);
      else { setCurrentIndex(index); setStop(false); }
    });

    return () => {
      if (driftCheckRef.current) clearInterval(driftCheckRef.current);
      socket.disconnect();
    };
  }, [roomId, tracks, ishost]);

  // ---------- Fetch tracks & room info ----------
  const fetchTracks = async () => {
    if (!roomId) return;
    try {
      const res = await fetch(`/api/tracks?roomId=${roomId}`);
      const data = await res.json();
      setTracks(data.files || []);
    } catch (err) { console.error(err); }
  };

  const fetchRoomInfo = async () => {
    if (!roomId || !session?.user?.id) return;
    try {
      const res = await fetch(`/api/rooms?rcode=${roomId}&user_id=${session.user.id}`);
      const data = await res.json();
      if (data.success) setIshost(session.user.id === data.room.hostId);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchTracks(); fetchRoomInfo(); }, [roomId, session?.user?.id]);

  // ---------- Audio listeners ----------
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setProgress(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => ishost && nextTrack();

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [tracks, ishost, currentIndex]);

  // ---------- Play track ----------
  const playTrack = (index, startTime = 0, plannedStart = Date.now()) => {
    if (!tracks[index]) return;
    const audio = audioRef.current;
    if (!audio) return;

    if (driftCheckRef.current) clearInterval(driftCheckRef.current);

    playbackStateRef.current = { startTime, plannedStart, index };

    if (currentIndex !== index || audio.src !== tracks[index].url) {
      audio.src = tracks[index].url;
      setCurrentIndex(index);
      audio.onloadeddata = () => schedulePlayback(audio, startTime, plannedStart);
    } else schedulePlayback(audio, startTime, plannedStart);

    setStop(true);
  };

  const schedulePlayback = (audio, startTime, plannedStart) => {
    const serverNow = Date.now() + timeOffset;
    const wait = plannedStart - serverNow;

    if (wait > 50) setTimeout(() => { audio.currentTime = startTime; audio.play(); startDriftCorrection(audio, startTime, plannedStart); }, wait);
    else if (wait > -1000) { audio.currentTime = startTime; audio.play(); startDriftCorrection(audio, startTime, plannedStart); }
    else { const elapsed = (-wait) / 1000; const catchUp = startTime + elapsed; if (catchUp < audio.duration) { audio.currentTime = catchUp; audio.play(); startDriftCorrection(audio, startTime, plannedStart); } }
  };

  const startDriftCorrection = (audio, startTime, plannedStart) => {
    driftCheckRef.current = setInterval(() => {
      if (audio.paused) return clearInterval(driftCheckRef.current);
      const serverNow = Date.now() + timeOffset;
      const expected = startTime + (serverNow - plannedStart) / 1000;
      if (Math.abs(audio.currentTime - expected) > 0.2) audio.currentTime = expected;
    }, 1000);
  };
  // ---------- IMPROVED CONTROL FUNCTIONS ----------
  const semiplay = (index, seekTo = null) => {
    if (!ishost || tracks.length === 0) return;

    const newProgress = seekTo !== null ? seekTo : (index === currentIndex ? progress : 0);
    // plannedStart should be in server time
    const serverNow = Date.now() + timeOffset;
    const plannedStart = serverNow + 2000; // 2s buffer for network

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
    const serverNow = Date.now() + timeOffset;
    const plannedStart = serverNow + 1500;

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
    const serverNow = Date.now() + timeOffset;
    const plannedStart = serverNow + 1500;

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
      const serverNow = Date.now() + timeOffset;
      const plannedStart = serverNow + 1000;
      
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