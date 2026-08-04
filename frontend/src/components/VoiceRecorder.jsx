import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, Trash2, Send, X } from 'lucide-react';
import toast from 'react-hot-toast';

export const VoiceRecorder = ({ onSend, disabled }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playDuration, setPlayDuration] = useState(0);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const durationIntervalRef = useRef(null);
  const audioPlayerRef = useRef(null);
  const playDurationIntervalRef = useRef(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      clearInterval(durationIntervalRef.current);
      clearInterval(playDurationIntervalRef.current);
    };
  }, []);

  const startRecording = async () => {
    audioChunksRef.current = [];
    setAudioUrl(null);
    setAudioBlob(null);
    setRecordingDuration(0);
    setIsPlaying(false);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        // Stop all audio tracks to release microphone
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(200);
      setIsRecording(true);

      durationIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Mic access error:', err);
      toast.error('Unable to access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(durationIntervalRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(durationIntervalRef.current);
    }
    setAudioUrl(null);
    setAudioBlob(null);
    setRecordingDuration(0);
  };

  const handlePlayPreview = () => {
    if (!audioUrl) return;

    if (!audioPlayerRef.current) {
      audioPlayerRef.current = new Audio(audioUrl);
      audioPlayerRef.current.onended = () => {
        setIsPlaying(false);
        setPlayDuration(0);
        clearInterval(playDurationIntervalRef.current);
      };
    }

    if (isPlaying) {
      audioPlayerRef.current.pause();
      setIsPlaying(false);
      clearInterval(playDurationIntervalRef.current);
    } else {
      audioPlayerRef.current.play().catch(() => {});
      setIsPlaying(true);
      playDurationIntervalRef.current = setInterval(() => {
        if (audioPlayerRef.current) {
          setPlayDuration(Math.round(audioPlayerRef.current.currentTime));
        }
      }, 250);
    }
  };

  const handleSend = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }
    if (audioBlob) {
      onSend(audioBlob);
      clearRecorderState();
    }
  };

  const clearRecorderState = () => {
    setAudioUrl(null);
    setAudioBlob(null);
    setIsRecording(false);
    setRecordingDuration(0);
    setIsPlaying(false);
    setPlayDuration(0);
    clearInterval(durationIntervalRef.current);
    clearInterval(playDurationIntervalRef.current);
  };

  const formatTime = (seconds) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  return (
    <div className="flex items-center gap-2">
      {/* 1. HOLD/TAP TO RECORD BUTTON */}
      {!isRecording && !audioUrl && (
        <button
          type="button"
          onClick={startRecording}
          disabled={disabled}
          className="p-2.5 rounded-xl bg-crm-border/30 hover:bg-crm-primary/20 text-crm-textMuted hover:text-crm-primary transition-all duration-300 disabled:opacity-50 shrink-0"
          title="Record Voice Note"
        >
          <Mic size={20} />
        </button>
      )}

      {/* 2. RECORDING ACTIVE STATE */}
      {isRecording && (
        <div className="flex items-center gap-3 bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-1.5 flex-1 select-none">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
          <span className="text-xs text-rose-400 font-bold font-mono">Recording {formatTime(recordingDuration)}</span>
          
          {/* Simulated Waveform Visualizer */}
          <div className="flex items-center gap-0.5 h-6 overflow-hidden flex-1 px-4">
            {[1, 2, 3, 4, 3, 2, 1, 2, 3, 4, 5, 4, 3, 2, 3, 4, 3, 2, 1, 2, 3, 4, 3, 2].map((h, i) => (
              <span
                key={i}
                className="w-0.5 bg-rose-500/60 rounded-full animate-pulse"
                style={{
                  height: `${h * 15}%`,
                  animationDelay: `${i * 0.05}s`,
                }}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={stopRecording}
            className="p-1 hover:bg-rose-500/20 text-rose-400 rounded-lg transition-colors"
            title="Stop & Preview"
          >
            <Square size={14} fill="currentColor" />
          </button>
          
          <button
            type="button"
            onClick={cancelRecording}
            className="p-1 hover:bg-crm-border/40 text-crm-textMuted rounded-lg transition-colors"
            title="Cancel"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* 3. AUDIO PREVIEW PLAY/PAUSE/SEND STATE */}
      {audioUrl && !isRecording && (
        <div className="flex items-center gap-3 bg-crm-primary/10 border border-crm-primary/30 rounded-xl px-4 py-1 flex-1 select-none">
          <button
            type="button"
            onClick={handlePlayPreview}
            className="p-1.5 bg-crm-primary text-crm-primary-text rounded-lg hover:scale-105 transition-all"
            title={isPlaying ? 'Pause' : 'Play Preview'}
          >
            {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
          </button>

          <span className="text-xs text-crm-primary font-bold font-mono">
            {isPlaying ? formatTime(playDuration) : formatTime(recordingDuration)}
          </span>

          {/* Audio Waveform Track */}
          <div className="flex items-center gap-0.5 h-6 flex-1 px-4">
            {[1, 2, 3, 4, 3, 2, 1, 2, 3, 4, 5, 4, 3, 2, 3, 4, 3, 2, 1, 2, 3, 4, 3, 2].map((h, i) => {
              const isActive = isPlaying && playDuration > 0 && i / 24 <= playDuration / recordingDuration;
              return (
                <span
                  key={i}
                  className={`w-0.5 rounded-full transition-colors duration-300 ${
                    isActive ? 'bg-crm-primary' : 'bg-crm-primary/30'
                  }`}
                  style={{ height: `${h * 15}%` }}
                />
              );
            })}
          </div>

          <button
            type="button"
            onClick={clearRecorderState}
            className="p-1.5 hover:bg-rose-500/20 text-rose-400 rounded-lg transition-colors"
            title="Discard"
          >
            <Trash2 size={16} />
          </button>

          <button
            type="button"
            onClick={handleSend}
            className="p-1.5 bg-crm-primary text-crm-primary-text rounded-lg hover:scale-105 transition-all"
            title="Send Voice Note"
          >
            <Send size={14} />
          </button>
        </div>
      )}
    </div>
  );
};
