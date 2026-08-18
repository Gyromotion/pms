import React, { useState, useEffect } from 'react';
import { Joyride, STATUS, EVENTS } from 'react-joyride';
import { db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

export default function GuidedTour({ currentUser }) {
  const [run, setRun] = useState(false);

  useEffect(() => {
    // Check the current tour ID from the database (could be 'true' or a timestamp)
    const currentTourId = currentUser?.needsTour?.toString();
    const seenTourId = localStorage.getItem(`tour_seen_${currentUser?.uid}`);
    
    // If they have a valid tour requested, and it doesn't match what they already saw
    if (currentTourId && currentTourId !== 'false' && seenTourId !== currentTourId) {
      // Small delay to ensure DOM is fully painted
      const timer = setTimeout(() => {
        setRun(true);
        
        // INSTANTLY lock it in local storage. Even if they refresh mid-tour, it will never show again!
        localStorage.setItem(`tour_seen_${currentUser?.uid}`, currentTourId);
        
        // Also silently try to clear the database (might fail due to permissions, which is fine)
        if (currentUser?.uid) {
          setDoc(doc(db, 'users', currentUser.uid), { needsTour: false }, { merge: true }).catch(() => {});
        }
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [currentUser]);

  const steps = [
    {
      target: '.app-container',
      content: "Welcome to the Gyromotion Patient Management System! Let's take a quick tour.",
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '.sidebar',
      content: 'Here is your main navigation menu. Use this to switch between your Dashboard, Patient Directory, Data Reports, and Settings.',
      placement: 'right',
    },
    {
      target: '.main-content',
      content: 'This is your main workspace. When you select a tab on the left, you can search patients, add new records, or view reports here.',
      placement: 'left',
    },
    {
      target: '.sidebar-footer',
      content: 'Down here is your profile and the secure Sign Out button. Enjoy using the system!',
      placement: 'right',
    }
  ];

  const handleJoyrideCallback = (data) => {
    const { status, type, action } = data;
    const finishedStatuses = [STATUS.FINISHED, STATUS.SKIPPED];
    
    if (finishedStatuses.includes(status) || type === EVENTS.TOUR_END || action === 'close') {
      setRun(false);
    }
  };

  return (
    <Joyride
      callback={handleJoyrideCallback}
      continuous
      hideCloseButton
      run={run}
      scrollToFirstStep
      showProgress
      showSkipButton
      steps={steps}
      styles={{
        options: {
          zIndex: 10000,
          primaryColor: '#1e3a8a',
          textColor: '#0f172a',
          backgroundColor: '#ffffff',
        }
      }}
    />
  );
}
