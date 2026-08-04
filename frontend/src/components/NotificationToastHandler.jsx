import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { onMessageListener } from '../firebase';
import { Bell } from 'lucide-react';

export const NotificationToastHandler = () => {
  useEffect(() => {
    const unsubscribe = onMessageListener((payload) => {
      console.log('[FCM Foreground] Message received. ', payload);
        
      toast.custom((t) => (
          <div
            className={`${
              t.visible ? 'animate-enter' : 'animate-leave'
            } max-w-md w-full bg-crm-card border border-crm-border shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
          >
            <div className="flex-1 w-0 p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 pt-0.5">
                  <div className="h-10 w-10 rounded-full bg-crm-primary/20 flex items-center justify-center text-crm-primary">
                    <Bell size={20} />
                  </div>
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-crm-text">
                    {payload.notification?.title || 'New Notification'}
                  </p>
                  <p className="mt-1 text-sm text-crm-textMuted">
                    {payload.notification?.body || 'You have a new message'}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex border-l border-crm-border">
              <button
                onClick={() => toast.dismiss(t.id)}
                className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-crm-primary hover:text-crm-primaryHover focus:outline-none focus:ring-2 focus:ring-crm-primary"
              >
                Close
              </button>
            </div>
          </div>
        ), { duration: 4000 });
      });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  return null;
};
