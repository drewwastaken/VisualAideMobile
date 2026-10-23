import { useEffect, useState } from 'react';
import * as Network from 'expo-network';

export default function useConnectivity() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    let active = true;
    const refresh = () => {
      Network.getNetworkStateAsync().then((state) => {
        if (active) setIsOnline(Boolean(state.isConnected && state.isInternetReachable !== false));
      }).catch((error) => {
        console.warn('Failed to check network status:', error);
      });
    };

    refresh();
    const interval = setInterval(refresh, 30000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  return isOnline;
}
