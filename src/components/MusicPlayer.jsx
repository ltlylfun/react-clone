import React from "../fakeReact";
import "../styles/MusicPlayer.css";

const { useState, useEffect } = React;

const localSongs = [
  {
    id: 1,
    title: "Intentions",
    artist: "Justin Bieber, Quavo",
    audioSrc: "/music/Justin Bieber _ Quavo - Intentions.mp3",
  },
  {
    id: 2,
    title: "Changes",
    artist: "Justin Bieber",
    audioSrc: "/music/Justin Bieber - Changes.mp3",
  },
  {
    id: 3,
    title: "ETA",
    artist: "Justin Bieber",
    audioSrc: "/music/Justin Bieber - ETA.mp3",
  },
];

export default function MusicPlayer() {
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audio] = useState(new Audio());
  const [error, setError] = useState(null);

  const currentSong = localSongs[currentSongIndex] || localSongs[0];

  useEffect(() => {
    try {
      if (!currentSong || !currentSong.audioSrc) {
        throw new Error("无效的音频源");
      }

      const loadAndPlaySong = () => {
        audio.pause();
        audio.src = currentSong.audioSrc;

        if (isPlaying) {
          const playPromise = audio.play();
          if (playPromise !== undefined) {
            playPromise.catch((error) => {
              console.error("播放失败:", error);
              setIsPlaying(false);
            });
          }
        }
      };

      loadAndPlaySong();

      return () => {
        audio.pause();
        audio.src = "";
      };
    } catch (err) {
      console.error("音频加载错误:", err);
      setError(err.message);
      setIsPlaying(false);
    }
  }, [currentSongIndex, currentSong]);

  const handlePrevious = () => {
    if (currentSongIndex > 0) {
      setCurrentSongIndex(currentSongIndex - 1);
    } else {
      setCurrentSongIndex(localSongs.length - 1);
    }
  };

  const handleNext = () => {
    if (currentSongIndex < localSongs.length - 1) {
      setCurrentSongIndex(currentSongIndex + 1);
    } else {
      setCurrentSongIndex(0);
    }
  };

  const togglePlay = () => {
    try {
      if (!isPlaying) {
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch((error) => {
            console.error("播放失败:", error);
          });
        }
      } else {
        audio.pause();
      }
      setIsPlaying(!isPlaying);
    } catch (err) {
      console.error("播放控制错误:", err);
      setIsPlaying(false);
    }
  };

  if (error) {
    return <div className="music-player">加载错误: {error}</div>;
  }

  return (
    <div className="music-player">
      <div className="song-title">
        {currentSong ? currentSong.title : "无法加载歌曲"}
      </div>

      <div className="controls">
        <button onClick={handlePrevious} className="control-btn">
          ⏮
        </button>
        <button onClick={togglePlay} className="control-btn play-btn">
          {isPlaying ? "⏸" : "▶"}
        </button>
        <button onClick={handleNext} className="control-btn">
          ⏭
        </button>
      </div>
    </div>
  );
}
