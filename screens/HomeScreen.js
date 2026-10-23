import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { isSupported, recognizeText } from 'expo-mlkit-ocr';
import { COLORS } from '../utils/theme';
import useConnectivity from '../utils/useConnectivity';
import PdfText from '../modules/pdf-text';

export default function HomeScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const insets = useSafeAreaInsets();
  const isOnline = useConnectivity();

  async function handleImage(result) {
    if (!result || result.canceled) return;
    
    const asset = result.assets?.[0];
    if (!asset || !asset.uri) {
      Alert.alert('Error', 'Could not get image.');
      return;
    }

    try {
      setLoading(true);
      setLoadingMsg('Reading text on device...');
      const { text } = await recognizeText(asset.uri);

      if (!text.trim()) {
        Alert.alert('No Text Found', 'Could not find readable text in this image. Try a clearer, well-lit image.');
        return;
      }

      navigation.navigate('Reader', { extractedText: text });
    } catch (err) {
      Alert.alert('OCR Failed', err.message || 'Could not read text from this image.');
    } finally {
      setLoading(false);
      setLoadingMsg('');
    }
  }

  async function openCamera() {
    if (Platform.OS === 'web' || !isSupported()) {
      Alert.alert('OCR Not Available', 'On-device text recognition is not supported on this device.');
      return;
    }
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
    if (Platform.OS === 'web' || !isSupported()) {
      Alert.alert('OCR Not Available', 'On-device text recognition is not supported on this device.');
      return;
    }
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

  async function openPdf() {
    if (Platform.OS !== 'android' || !PdfText) {
      Alert.alert('PDF reader unavailable', 'On-device PDF reading is currently available in the Android app.');
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled) return;
      const pdf = result.assets?.[0];
      if (!pdf?.uri) {
        Alert.alert('PDF unavailable', 'The selected PDF could not be opened.');
        return;
      }

      setLoading(true);
      setLoadingMsg('Reading PDF pages on device…');
      const { text } = await PdfText.extractText(pdf.uri);
      if (!text.trim()) {
        Alert.alert('No text found', 'Could not recognize readable text in this PDF. Try a clearer or text-based document.');
        return;
      }
      navigation.navigate('Reader', { extractedText: text, sourceTitle: pdf.name });
    } catch (error) {
      Alert.alert('PDF reading failed', error.message || 'Could not read this PDF on the device.');
    } finally {
      setLoading(false);
      setLoadingMsg('');
    }
  }

  return (
    <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: COLORS.bg }}>
      <View style={styles.container}>
        
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerStatusRow}>
            <Text style={styles.subtitle}>OCR MODE</Text>
            <View style={styles.connectivity}>
              <View style={[styles.connectivityDot, { backgroundColor: isOnline ? COLORS.accent : COLORS.textSecondary }]} />
              <Text style={[styles.connectivityText, { color: isOnline ? COLORS.accent : COLORS.textSecondary }]}>
                {isOnline ? 'ONLINE' : 'OFFLINE'}
              </Text>
            </View>
          </View>
          <Text style={styles.title}>VISUAL AIDE</Text>
          <Text style={styles.description}>
            Scan images or PDFs offline, or open a website, then read the content with accessible fonts, speech, and reading controls.
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

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => navigation.navigate('WebReader')}
              activeOpacity={0.8}
            >
              <View style={styles.iconContainer}>
                <Text style={styles.actionIcon}>Aa</Text>
              </View>
              <View style={styles.actionTextContainer}>
                <Text style={styles.actionLabel}>Web Reader</Text>
                <Text style={styles.actionDesc}>Read websites with accessibility tools</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtn} onPress={openPdf} activeOpacity={0.8}>
              <View style={styles.iconContainer}>
                <Text style={styles.actionIcon}>PDF</Text>
              </View>
              <View style={styles.actionTextContainer}>
                <Text style={styles.actionLabel}>PDF Reader</Text>
                <Text style={styles.actionDesc}>Extract and read document text offline</Text>
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
    paddingVertical: 16,
  },
  header: {
    marginTop: 18,
    marginBottom: 18,
  },
  subtitle: {
    fontSize: 12,
    letterSpacing: 4,
    color: COLORS.accent,
    marginBottom: 8,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  headerStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  connectivity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  connectivityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  connectivityText: {
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 1,
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
    gap: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 14,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.bg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
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