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

  const audioRef = useRef(null);
  const fileInputRef = useRef(null);
  const socketRef = useRef(null);

  const { data: session, status } = useSession();
  const router = useRouter();
  const { roomId } = useParams();
  let song_name = "";

  // Redirect if not logged in
  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.replace("/login");
    }
  }, [session, status, router]);

  // Socket setup
  useEffect(() => {
    if (!roomId || tracks.length === 0) return;

    const socket = io("http://localhost:3001");
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Connected to Socket.IO:", socket.id);
      socket.emit("join-room", roomId);
    });

    socket.on("song-info", ({ index, progress, plannedStart }) => {
      if (!tracks[index]) {
        console.warn("Track not found:", index);
        return;
      }
      playTrack(index, progress, plannedStart);
    });

    socket.on("pause", () => {
      pauseTrack(false);
    });

    return () => socket.disconnect();
  }, [roomId, tracks]);

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
      if (audio.currentTime >= audio.duration) nextTrack();
    };

    const updateDuration = () => setDuration(audio.duration);

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
    };
  }, [tracks]);

  useEffect(() => {
    if (ishost && progress >= duration && duration > 0) {
      nextTrack();
    }
  }, [progress, duration]);

  // ---------- CONTROL FUNCTIONS ----------

  // Play or semi-play
  const semiplay = (index, x) => {
    if (tracks.length === 0) return;
    const newProgress = x === -1 ? 0 : progress;
    const plannedStart = Date.now() + 2000; // 2s global delay

    socketRef.current.emit("song-info", {
      index,
      progress: newProgress,
      plannedStart,
      roomId,
    });
  };

  const playTrack = (index, startTime = 0, plannedStart = Date.now()) => {
    if (!tracks[index]) return;
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.src !== tracks[index].url) {
      audio.src = tracks[index].url;
    }
    setProgress(startTime);
    setCurrentIndex(index);

    const delay = Math.max(0, plannedStart - Date.now());
    setTimeout(() => {
      audio.currentTime = startTime;
      audio.play();
    }, delay);

    setStop(true);

    // Drift correction
    if (audio.driftCheck) clearInterval(audio.driftCheck);
    audio.driftCheck = setInterval(() => {
      const expected = startTime + (Date.now() - plannedStart) / 1000;
      const diff = Math.abs(audio.currentTime - expected);
      if (diff > 0.3 && !audio.paused) {
        audio.currentTime = expected;
      }
    }, 3000);

    audio.onended = () => clearInterval(audio.driftCheck);
  };

  // Pause
  const semipause = (emit = true) => {
    if (ishost && emit) {
      socketRef.current?.emit("pause", { roomId });
    }
  };

  const pauseTrack = () => {
    setStop(false);
    if (audioRef.current) audioRef.current.pause();
  };

  // Next / Prev tracks
  const nextTrack = (emit = true) => {
    if (!ishost) return;
    if (tracks.length === 0) return;

    const next = (currentIndex + 1) % tracks.length;
    const plannedStart = Date.now() + 2000; // 2s delay

    if (emit) {
      socketRef.current.emit("song-info", {
        index: next,
        progress: 0,
        plannedStart,
        roomId,
      });
    }
  };

  const prevTrack = (emit = true) => {
    if (!ishost) return;
    if (tracks.length === 0) return;

    const prev = (currentIndex - 1 + tracks.length) % tracks.length;
    const plannedStart = Date.now() + 2000; // 2s delay

    if (emit) {
      socketRef.current.emit("song-info", {
        index: prev,
        progress: 0,
        plannedStart,
        roomId,
      });
    }
  };

  // Seek
  const handleSeek = (e) => {
    if (!ishost) return;
    const newProgress = parseFloat(e.target.value);
    const plannedStart = Date.now() + 2000; // 2s delay

    socketRef.current.emit("song-info", {
      index: currentIndex,
      progress: newProgress,
      plannedStart,
      roomId,
    });

    setProgress(newProgress);
  };

  // ---------- FILE UPLOAD ----------
  const handleupload = (e) => {
    setFile(Array.from(e.target.files));
  };

  const uploadFile = async () => {
    if (!ishost) return alert("Only host can upload songs");
    if (!file || file.length === 0) return alert("Please select files");

    try {
      for (let i = 0; i < file.length; i++) {
        const f = file[i];
        const res = await fetch(
          `/api/upload-url?fileName=${f.name}&fileType=${f.type}&roomId=${roomId}&action=upload`
        );
        const data = await res.json();
        await fetch(data.url, {
          method: "PUT",
          headers: { "Content-Type": f.type },
          body: f,
        });
      }
      fetchTracks();
    } catch (err) {
      console.error("Upload Error:", err);
    }
  };
  async function deleteTrack(trackId) {
  const res = await fetch("/api/delete-track", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ trackId }),
  });

  if (res.ok) {
    alert("Deleted from S3 + DB");
  } else {
    alert("Delete failed");
  }
}

  // ---------- UI HELPERS ----------
  const formatTime = (time) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  };


  // ---------- UI ----------
  return (
    <div className={styles.container}>
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
      <div className={styles.songname}>
        {tracks.map((track,index)=>{
          if(index===currentIndex){
            song_name = track.key.split("/")[1];
          }
        })}
        {song_name}
      </div>
      <div className={styles.seekbar}>
        <input
          type="range"
          min="0"
          max={duration || 0}
          value={progress}
          step="0.1"
          onInput={handleSeek}
        />
        <div>
          {formatTime(progress)} / {formatTime(duration)}
        </div>
      </div>

      <div className={styles.song_btn}>
        <div className={styles.btn}>
          <img src="/prev.svg" alt="prev" onClick={prevTrack} />
          <div className={styles.stop}>
            {!stop ? (
              <img
                src="/play.svg"
                alt="play"
                onClick={() => semiplay(currentIndex)}
              />
            ) : (
              <img src="/pause.svg" alt="pause" onClick={semipause} />
            )}
          </div>
          <img src="/next.svg" alt="next" onClick={nextTrack} />
        </div>
      </div>

      <div className={`${styles.side} ${sidebar ? styles.open : ""}`}>
        <img onClick={() => setSidebar(false)} src="/cross.svg" alt="close" />
        <div className={styles.title}>Playlist</div>
        <ul>
          {tracks.map((track, index) => {
            const name = track.key.split("/")[1];
            const shortName =
              name.length > 15 ? name.slice(0, 15) + "..." : name;
            return (
              <li key={index} onClick={() => ishost && semiplay(index,-1)}>
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