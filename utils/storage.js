import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_SETTINGS } from './theme';

const STORAGE_KEY = 'va_settings';

export async function loadSettings() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      if (!saved || typeof saved !== 'object' || Array.isArray(saved)) {
        return DEFAULT_SETTINGS;
      }

      return {
        ...DEFAULT_SETTINGS,
        ...saved,
        tracking: saved.tracking ?? saved.kerning ?? DEFAULT_SETTINGS.tracking,
      };
    }
  } catch (e) {
    console.warn('Failed to load settings:', e);
  }
  return DEFAULT_SETTINGS;
}

export async function saveSettings(settings) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('Failed to save settings:', e);
  }
}
