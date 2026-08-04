import { useCallback, useRef, useEffect } from 'react';
import { useAuth } from './useAuth';

export const useNotificationSound = () => {
  const { user } = useAuth();
  const audioRef = useRef(null);

  useEffect(() => {
    // We use a clean, minimal data URI beep sound to avoid missing static assets
    // This is a simple 0.5s ping sound
    const pingSoundDataURI = 'data:audio/mp3;base64,//OExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//OExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq';
    
    // Attempt to load from public folder first, fallback to dataURI
    audioRef.current = new Audio('/sounds/notification.mp3');
    
    audioRef.current.addEventListener('error', () => {
      // If no file exists in public/sounds, fallback to a silent ping or nothing to prevent crashes
      console.warn('[AUDIO] Custom notification sound not found at /sounds/notification.mp3');
    });

  }, []);

  const playSound = useCallback(() => {
    const settings = user?.settings || {};
    // Only play if soundEnabled is true or not explicitly disabled
    if (settings.soundEnabled !== false && audioRef.current) {
      try {
        audioRef.current.currentTime = 0;
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            // Autoplay policy might block this until user interacts with the page
            console.warn('[AUDIO] Autoplay blocked or failed:', error);
          });
        }
      } catch (err) {
        console.error('[AUDIO] Playback error:', err);
      }
    }
  }, [user]);

  return { playSound };
};
