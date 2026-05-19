import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { COLORS } from '../utils/theme';
import { extractTextFromImage } from '../utils/gemini';

export default function HomeScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const insets = useSafeAreaInsets();

  async function handleImage(result) {
    if (!result || result.canceled) return;
    
    const asset = result.assets?.[0];
    if (!asset || !asset.uri) {
      Alert.alert('Error', 'Could not get image.');
      return;
    }

    try {
      setLoading(true);
      const base64 = await FileSystem.readAsStringAsync(asset.uri, {
         encoding: 'base64',
      });

      setLoadingMsg('Extracting text...');
      const mimeType = asset.mimeType || 'image/jpeg';
      const text = await extractTextFromImage(base64, mimeType);

      navigation.navigate('Reader', { extractedText: text });
    } catch (err) {
      Alert.alert('OCR Failed', err.message || 'Could not extract text from image.');
    } finally {
      setLoading(false);
      setLoadingMsg('');
    }
  }

  async function openCamera() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera access is needed.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.9,
    });
    handleImage(result);
  }

  async function openLibrary() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Photo library access is needed.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
    });
    handleImage(result);
  }

  return (
    <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: COLORS.bg }}>
      <View style={styles.container}>
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.subtitle}>OCR MODE</Text>
          <Text style={styles.title}>VISUAL AIDE</Text>
          <Text style={styles.description}>
            Upload or capture an image to extract text into a highly readable, customizable format.
          </Text>
        </View>

        {/* Action Buttons */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.accent} />
            <Text style={styles.loadingText}>{loadingMsg}</Text>
          </View>
        ) : (
          <View style={styles.actions}>
            <TouchableOpacity style={styles.actionBtn} onPress={openCamera} activeOpacity={0.8}>
              <View style={styles.iconContainer}>
                <Text style={styles.actionIcon}>📷</Text>
              </View>
              <View style={styles.actionTextContainer}>
                <Text style={styles.actionLabel}>Camera</Text>
                <Text style={styles.actionDesc}>Capture a document</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtn} onPress={openLibrary} activeOpacity={0.8}>
              <View style={styles.iconContainer}>
                <Text style={styles.actionIcon}>🖼️</Text>
              </View>
              <View style={styles.actionTextContainer}>
                <Text style={styles.actionLabel}>Photo Library</Text>
                <Text style={styles.actionDesc}>Upload from gallery</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>DYSLEXIA ACCESSIBILITY TOOL</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingVertical: 24,
  },
  header: {
    marginTop: 32,
    marginBottom: 40,
  },
  subtitle: {
    fontSize: 12,
    letterSpacing: 4,
    color: COLORS.accent,
    marginBottom: 8,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 2,
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  actions: {
    flex: 1,
    justifyContent: 'center',
    gap: 16,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 20,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: COLORS.bg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionIcon: {
    fontSize: 24,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
    letterSpacing: 1,
  },
  actionDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  loadingText: {
    color: COLORS.accent,
    fontSize: 13,
    letterSpacing: 3,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 8,
  },
  footerText: {
    fontSize: 10,
    letterSpacing: 2,
    color: COLORS.border,
    textTransform: 'uppercase',
  },
});