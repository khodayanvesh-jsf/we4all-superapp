const PERM_DONE_KEY = 'we4all_permissions_onboarded_v1';
const PERM_STATUS_KEY = 'we4all_permissions_status_v1';

export function hasCompletedPermissionOnboarding() {
  try {
    return localStorage.getItem(PERM_DONE_KEY) === 'true';
  } catch {
    return true;
  }
}

export function markPermissionOnboardingDone(statusMap = {}) {
  try {
    localStorage.setItem(PERM_DONE_KEY, 'true');
    localStorage.setItem(PERM_STATUS_KEY, JSON.stringify({ ...statusMap, updatedAt: new Date().toISOString() }));
  } catch {
    // ignore storage errors
  }
}

export function getSavedPermissionStatus() {
  try {
    return JSON.parse(localStorage.getItem(PERM_STATUS_KEY) || '{}');
  } catch {
    return {};
  }
}

export async function requestUpfrontDevicePermissions() {
  const results = {
    location: 'skipped',
    camera: 'skipped',
    microphone: 'skipped',
    notifications: 'skipped',
  };

  if (typeof navigator !== 'undefined' && navigator.geolocation) {
    results.location = await new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        () => resolve('granted'),
        (err) => resolve(err?.code === 1 ? 'denied' : 'unavailable'),
        { enableHighAccuracy: false, timeout: 6000, maximumAge: 300000 }
      );
    });
  }

  if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      stream.getTracks().forEach((track) => track.stop());
      results.camera = 'granted';
      results.microphone = 'granted';
    } catch {
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioStream.getTracks().forEach((track) => track.stop());
        results.microphone = 'granted';
      } catch {
        results.camera = 'denied';
        results.microphone = 'denied';
      }
    }
  }

  if (typeof window !== 'undefined' && 'Notification' in window && typeof Notification.requestPermission === 'function') {
    try {
      results.notifications = await Notification.requestPermission();
    } catch {
      results.notifications = 'unavailable';
    }
  }

  markPermissionOnboardingDone(results);
  return results;
}