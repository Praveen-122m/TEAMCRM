import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';
import { resolveMediaUrl } from '../utils/mediaUrl';

const generateWaveform = (url, count = 30) => {
  const hash = Array.from(url || '').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const bars = [];
  for (let i = 0; i < count; i++) {
    const height = Math.abs(Math.sin(hash + i * 1.5)) * 18 + 6; // between 6px and 24px
    bars.push(Math.round(height));
  }
  return bars;
};

export const VoiceNotePlayer = ({ audioUrl, isOwn }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef(null);
  const animationRef = useRef(null);

  const resolvedUrl = resolveMediaUrl(audioUrl);
  const barsCount = 35;
  const waveformBars = generateWaveform(audioUrl, barsCount);

  useEffect(() => {
    const audio = new Audio(resolvedUrl);
    audioRef.current = audio;

    const onLoadedMetadata = () => {
      if (audio.duration === Infinity || isNaN(audio.duration)) {
        // Workaround for browser webm/ogg recording duration bugs: seek to the end
        audio.currentTime = 1e9;
        audio.ontimeupdate = () => {
          audio.ontimeupdate = null;
          setDuration(audio.duration || 0);
          audio.currentTime = 0;
        };
      } else {
        setDuration(audio.duration || 0);
      }
    };

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      cancelAnimationFrame(animationRef.current);
    };

    const onPause = () => {
      setIsPlaying(false);
    };

    const onPlay = () => {
      setIsPlaying(true);
    };

    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('play', onPlay);

    // Load media
    audio.load();

    return () => {
      audio.pause();
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('play', onPlay);
      cancelAnimationFrame(animationRef.current);
    };
  }, [resolvedUrl]);

  // Tick progress loop for smooth animation
  useEffect(() => {
    let animId;
    const tick = () => {
      if (audioRef.current && !audioRef.current.paused) {
        setCurrentTime(audioRef.current.currentTime);
        animId = requestAnimationFrame(tick);
      }
    };
    if (isPlaying) {
      animId = requestAnimationFrame(tick);
    }
    return () => cancelAnimationFrame(animId);
  }, [isPlaying]);

  // Global play event handling (only one voice note plays at a time)
  useEffect(() => {
    const handleGlobalPlay = (e) => {
      if (e.detail?.url !== resolvedUrl && isPlaying) {
        audioRef.current?.pause();
      }
    };

    window.addEventListener('voice-note-play', handleGlobalPlay);
    return () => {
      window.removeEventListener('voice-note-play', handleGlobalPlay);
    };
  }, [resolvedUrl, isPlaying]);

  const handlePlayPause = () => {
    if (!audioRef.current) return;

    if (audioRef.current.paused) {
      // Pause other audio players
      window.dispatchEvent(new CustomEvent('voice-note-play', { detail: { url: resolvedUrl } }));
      audioRef.current.play().catch((err) => {
        console.error('Audio play failed', err);
      });
    } else {
      audioRef.current.pause();
    }
  };

  const handleWaveformClick = (e) => {
    if (!audioRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const clickPercent = Math.max(0, Math.min(1, clickX / width));
    const newTime = clickPercent * duration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (seconds) => {
    if (isNaN(seconds) || seconds === Infinity) return '0:00';
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  const progressPercent = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className={`mt-2 flex items-center gap-3 px-4 py-2.5 rounded-2xl border ${
      isOwn 
        ? 'bg-white/10 border-white/20 text-white' 
        : 'bg-crm-darker/60 border-crm-border text-crm-text'
    } min-w-[260px] max-w-sm`}>
      <button
        type="button"
        onClick={handlePlayPause}
        className={`w-9 h-9 flex items-center justify-center rounded-full shrink-0 transition-transform hover:scale-105 active:scale-95 ${
          isOwn ? 'bg-white text-crm-primary' : 'bg-crm-primary text-crm-primary-text shadow-glow'
        }`}
      >
        {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} className="ml-0.5" fill="currentColor" />}
      </button>

      <div className="flex-1 flex flex-col gap-1.5 min-w-0">
        {/* Interactive Waveform Visualizer */}
        <div 
          onClick={handleWaveformClick}
          className="flex items-end gap-[2px] h-7 cursor-pointer select-none"
          title="Click to seek"
        >
          {waveformBars.map((height, i) => {
            const isPlayed = (i / barsCount) * 100 <= progressPercent;
            return (
              <div
                key={i}
                style={{ height: `${height}px` }}
                className={`w-[3px] rounded-full transition-colors duration-150 ${
                  isPlayed 
                    ? (isOwn ? 'bg-white shadow-[0_0_4px_rgba(255,255,255,0.5)]' : 'bg-crm-primary') 
                    : (isOwn ? 'bg-white/30' : 'bg-crm-border/60')
                }`}
              />
            );
          })}
        </div>

        <div className="flex justify-between text-[10px] opacity-70 font-mono">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      <Volume2 size={14} className="opacity-40 shrink-0" />
    </div>
  );
};

export default VoiceNotePlayer;
