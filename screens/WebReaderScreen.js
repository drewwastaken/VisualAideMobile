import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import { WebView } from 'react-native-webview';
import * as Speech from 'expo-speech';
import {
  COLORS,
  CONTRAST_PRESETS,
  DEFAULT_SETTINGS,
  FONT_OPTIONS,
  FONT_COLORS,
  PRESETS,
  TINT_COLORS,
  SPEECH_RATE_MIN,
  SPEECH_RATE_MAX,
} from '../utils/theme';
import { lookupWord } from '../utils/dictionary';
import { loadSettings, saveSettings } from '../utils/storage';
import useConnectivity from '../utils/useConnectivity';
import { createWebAccessibilityScript } from '../utils/webAccessibility';

const WEB_FONT_ASSETS = {
  openDyslexicRegular: require('../assets/fonts/OpenDyslexic-Regular.otf'),
  openDyslexicBold: require('../assets/fonts/OpenDyslexic-Bold.otf'),
  lexend: require('../assets/fonts/Lexend.ttf'),
  atkinsonRegular: require('../assets/fonts/AtkinsonHyperlegible-Regular.ttf'),
  atkinsonBold: require('../assets/fonts/AtkinsonHyperlegible-Bold.ttf'),
};

function normalizeUrl(value) {
  const input = value.trim();
  const url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(input) ? input : `https://${input}`);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Only web pages using HTTP or HTTPS can be opened.');
  }
  return url.toString();
}

function SliderControl({ label, value, minimum, maximum, step, formatValue, onChange, accent }) {
  return (
    <View style={styles.sliderGroup}>
      <View style={styles.sliderLabelRow}>
        <Text style={styles.controlLabel}>{label}</Text>
        <Text style={[styles.sliderValue, { color: accent }]}>{formatValue(value)}</Text>
      </View>
      <Slider
        style={styles.slider}
        minimumValue={minimum}
        maximumValue={maximum}
        step={step}
        value={value}
        onValueChange={onChange}
        minimumTrackTintColor={accent}
        maximumTrackTintColor={COLORS.border}
        thumbTintColor={accent}
      />
    </View>
  );
}

export default function WebReaderScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const isOnline = useConnectivity();
  const webViewRef = useRef(null);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [address, setAddress] = useState('');
  const [pageUrl, setPageUrl] = useState('');
  const [pageTitle, setPageTitle] = useState('');
  const [webReady, setWebReady] = useState(false);
  const [pageLoading, setPageLoading] = useState(false);
  const [pageError, setPageError] = useState('');
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [fontPickerVisible, setFontPickerVisible] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [definitionVisible, setDefinitionVisible] = useState(false);
  const [definitionLoading, setDefinitionLoading] = useState(false);
  const [definition, setDefinition] = useState(null);
  const [definitionError, setDefinitionError] = useState('');
  const [customColorDraft, setCustomColorDraft] = useState(DEFAULT_SETTINGS.customTextColor);
  const [webFontData, setWebFontData] = useState({});
  const palette = settings.isActive
    ? (CONTRAST_PRESETS[settings.contrastPreset] || CONTRAST_PRESETS.default)
    : CONTRAST_PRESETS.default;

  const installScript = useMemo(() => createWebAccessibilityScript(settings, true, webFontData), [settings, webFontData]);
  const updateScript = useMemo(() => createWebAccessibilityScript(settings), [settings]);

  useEffect(() => {
    loadSettings().then((loadedSettings) => {
      setSettings(loadedSettings);
      setCustomColorDraft(loadedSettings.customTextColor);
    });
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all(Object.entries(WEB_FONT_ASSETS).map(async ([name, module]) => {
      const asset = Asset.fromModule(module);
      await asset.downloadAsync();
      if (!asset.localUri) throw new Error(`Could not load bundled font: ${name}`);
      const data = await FileSystem.readAsStringAsync(asset.localUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return [name, data];
    })).then((entries) => {
      if (active) setWebFontData(Object.fromEntries(entries));
    }).catch((error) => {
      console.warn('Failed to load bundled web-reader fonts:', error);
      if (active) Alert.alert('Web fonts unavailable', 'The web reader will use fonts installed by the website or device.');
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (webReady) webViewRef.current?.injectJavaScript(updateScript);
  }, [settings, updateScript, webReady]);

  useEffect(() => {
    if (webReady && Object.keys(webFontData).length) {
      webViewRef.current?.injectJavaScript(installScript);
    }
  }, [webFontData, webReady, installScript]);

  useEffect(() => () => {
    Speech.stop();
  }, []);

  const updateSettings = useCallback((patch) => {
    setSettings((previous) => {
      const next = { ...previous, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  function setManualSettings(patch) {
    updateSettings({ ...patch, level: 0 });
  }

  function openPage() {
    try {
      const normalized = normalizeUrl(address);
      setPageError('');
      setSelectedText('');
      setWebReady(false);
      setPageUrl(normalized);
      setAddress(normalized);
    } catch (error) {
      Alert.alert('Invalid address', error.message);
    }
  }

  function handleWebMessage(event) {
    let message;
    try {
      message = JSON.parse(event.nativeEvent.data);
    } catch (error) {
      console.warn('Ignored an invalid message from the web reader:', error);
      return;
    }
    if (message?.type === 'selection' && typeof message.text === 'string') {
      setSelectedText(message.text.slice(0, 4000));
    } else if (message?.type === 'toggle') {
      updateSettings({ isActive: !settings.isActive });
    }
  }

  function handleShouldStartLoad(request) {
    return request.url === 'about:blank' || /^https?:\/\//i.test(request.url);
  }

  function speakSelectedText() {
    const text = selectedText.trim();
    if (!text) return;
    Speech.stop();
    setIsSpeaking(true);
    Speech.speak(text, {
      rate: settings.speechRate,
      onDone: () => setIsSpeaking(false),
      onStopped: () => setIsSpeaking(false),
      onError: (error) => {
        setIsSpeaking(false);
        Alert.alert('Speech unavailable', error.message || 'Could not read the selected text.');
      },
    });
  }

  async function lookUpSelectedWord() {
    const word = selectedText.trim();
    if (!/^[\p{L}'-]+$/u.test(word)) {
      Alert.alert('Select one word', 'Select a single word on the page to look up its meaning.');
      return;
    }
    setDefinitionVisible(true);
    setDefinitionLoading(true);
    setDefinition(null);
    setDefinitionError('');
    try {
      setDefinition(await lookupWord(word));
    } catch (error) {
      setDefinitionError(isOnline
        ? error.message
        : 'This word is not in the offline dictionary. Connect to the internet to look it up.');
    } finally {
      setDefinitionLoading(false);
    }
  }

  function applyPreset(level) {
    updateSettings({ ...PRESETS[level], level });
  }

  const selectedFontLabel = FONT_OPTIONS.find((option) => option.value === settings.font)?.label || 'Default';
  const selectedWord = useMemo(() => /^[\p{L}'-]+$/u.test(selectedText.trim()), [selectedText]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top, backgroundColor: palette.bg }]}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} accessibilityRole="button">
            <Text style={[styles.backText, { color: palette.accent }]}>← BACK</Text>
          </TouchableOpacity>
          <View style={[styles.connectivityBadge, { borderColor: isOnline ? palette.accent : COLORS.border }]}>
            <View style={[styles.connectivityDot, { backgroundColor: isOnline ? palette.accent : COLORS.textSecondary }]} />
            <Text style={[styles.connectivityText, { color: palette.text }]}>{isOnline ? 'ONLINE' : 'OFFLINE'}</Text>
          </View>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setSettingsVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Open web accessibility settings"
          >
            <Text style={[styles.headerButtonText, { color: palette.text }]}>Aa SETTINGS</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.addressRow}>
          <TextInput
            value={address}
            onChangeText={setAddress}
            onSubmitEditing={openPage}
            placeholder="Enter a website address"
            placeholderTextColor={COLORS.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            returnKeyType="go"
            style={[styles.addressInput, { color: palette.text, borderColor: COLORS.border }]}
            accessibilityLabel="Website address"
          />
          <TouchableOpacity style={[styles.goButton, { backgroundColor: palette.accent }]} onPress={openPage}>
            <Text style={styles.goButtonText}>GO</Text>
          </TouchableOpacity>
        </View>
        {pageTitle ? <Text style={[styles.pageTitle, { color: palette.text }]} numberOfLines={1}>{pageTitle}</Text> : null}
      </View>

      {pageUrl ? (
        <>
          <WebView
            ref={webViewRef}
            source={{ uri: pageUrl }}
            style={styles.webView}
            originWhitelist={['http://*', 'https://*', 'about:blank']}
            javaScriptEnabled
            domStorageEnabled
            mixedContentMode="never"
            thirdPartyCookiesEnabled={false}
            sharedCookiesEnabled={false}
            setSupportMultipleWindows={false}
            onShouldStartLoadWithRequest={handleShouldStartLoad}
            onLoadStart={() => {
              setPageLoading(true);
              setWebReady(false);
              setPageError('');
            }}
            onLoadEnd={(event) => {
              setPageLoading(false);
              setPageTitle(event.nativeEvent.title || '');
              setWebReady(true);
              webViewRef.current?.injectJavaScript(installScript);
            }}
            onError={(event) => {
              setPageLoading(false);
              setPageError(event.nativeEvent.description || 'The page could not be loaded.');
            }}
            onHttpError={(event) => {
              if (event.nativeEvent.statusCode >= 400) {
                setPageError(`The website returned error ${event.nativeEvent.statusCode}.`);
              }
            }}
            onMessage={handleWebMessage}
            accessibilityLabel="Web page with accessibility reading controls"
          />
          {pageLoading ? (
            <View style={styles.loadingBadge}>
              <ActivityIndicator color={palette.accent} size="small" />
              <Text style={[styles.loadingText, { color: palette.text }]}>Loading page…</Text>
            </View>
          ) : null}
          {pageError ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{pageError}</Text>
              <TouchableOpacity onPress={() => setPageError('')}><Text style={styles.dismissText}>DISMISS</Text></TouchableOpacity>
            </View>
          ) : null}
          {selectedText ? (
            <View style={[styles.selectionToolbar, { backgroundColor: palette.surface, borderColor: palette.accent, paddingBottom: insets.bottom + 10 }]}>
              <Text style={[styles.selectionPreview, { color: palette.text }]} numberOfLines={1}>{selectedText}</Text>
              <View style={styles.selectionActions}>
                <TouchableOpacity style={styles.selectionButton} onPress={isSpeaking ? () => { Speech.stop(); setIsSpeaking(false); } : speakSelectedText}>
                  <Text style={[styles.selectionButtonText, { color: palette.accent }]}>{isSpeaking ? 'STOP' : '▶ READ'}</Text>
                </TouchableOpacity>
                {selectedWord ? (
                  <TouchableOpacity style={styles.selectionButton} onPress={lookUpSelectedWord}>
                    <Text style={[styles.selectionButtonText, { color: palette.text }]}>MEANING</Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity style={styles.selectionButton} onPress={() => setSelectedText('')}>
                  <Text style={[styles.selectionButtonText, { color: palette.text }]}>CLOSE</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
        </>
      ) : (
        <View style={styles.welcome}>
          <Text style={[styles.welcomeTitle, { color: palette.text }]}>ACCESSIBLE WEB READER</Text>
          <Text style={styles.welcomeBody}>
            Open a web page to apply reading-friendly typography, contrast, overlays, and focus tools. Select text to read it aloud or look up a word.
          </Text>
          <Text style={[styles.welcomeHint, { color: palette.accent }]}>
            Dynamic pages are styled as they load. Code, icons, and controls are left untouched.
          </Text>
        </View>
      )}

      <Modal visible={settingsVisible} animationType="slide" onRequestClose={() => setSettingsVisible(false)}>
        <View style={[styles.settingsPage, { paddingTop: insets.top, paddingBottom: insets.bottom, backgroundColor: palette.bg }]}>
          <View style={styles.settingsHeader}>
            <View>
              <Text style={[styles.settingsTitle, { color: palette.text }]}>WEB ACCESSIBILITY</Text>
              <Text style={styles.settingsSubtitle}>Styles apply to this page and dynamic content</Text>
            </View>
            <TouchableOpacity onPress={() => setSettingsVisible(false)} style={styles.doneButton}>
              <Text style={[styles.settingsButtonText, { color: palette.text }]}>DONE</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.settingsContent}>
            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.controlLabel, { color: palette.text }]}>Visual Aide</Text>
                <Text style={styles.settingsHint}>Alt + Shift + V also toggles page styling when using a keyboard.</Text>
              </View>
              <Switch
                value={settings.isActive}
                onValueChange={(value) => updateSettings({ isActive: value })}
                trackColor={{ false: COLORS.border, true: palette.accent }}
              />
            </View>

            <Text style={styles.sectionLabel}>QUICK PRESETS</Text>
            <View style={styles.choiceRow}>
              {[1, 2, 3].map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[styles.choiceButton, settings.level === level && { borderColor: palette.accent }]}
                  onPress={() => applyPreset(level)}
                >
                  <Text style={[styles.choiceText, { color: palette.text }]}>L{level}: {['', 'Mild', 'Mod', 'Max'][level]}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionLabel}>TYPOGRAPHY</Text>
            <TouchableOpacity style={styles.fontButton} onPress={() => setFontPickerVisible(true)}>
              <Text style={[styles.controlLabel, { color: palette.text }]}>Typeface</Text>
              <Text style={[styles.fontButtonValue, { color: palette.accent }]}>{selectedFontLabel}  ›</Text>
            </TouchableOpacity>
            <SliderControl label="Letter spacing" value={settings.tracking} minimum={0} maximum={6} step={0.5} formatValue={(v) => `${v.toFixed(1)} px`} onChange={(v) => setManualSettings({ tracking: v })} accent={palette.accent} />
            <SliderControl label="Word spacing" value={settings.wordSpacing} minimum={0} maximum={12} step={1} formatValue={(v) => `${v} px`} onChange={(v) => setManualSettings({ wordSpacing: v })} accent={palette.accent} />
            <SliderControl label="Line height" value={settings.leading} minimum={1} maximum={2.8} step={0.1} formatValue={(v) => `${v.toFixed(1)}x`} onChange={(v) => setManualSettings({ leading: Number(v.toFixed(1)) })} accent={palette.accent} />
            <SliderControl label="Paragraph spacing" value={settings.paragraphSpacing} minimum={0} maximum={24} step={1} formatValue={(v) => `${v} px`} onChange={(v) => setManualSettings({ paragraphSpacing: v })} accent={palette.accent} />
            <View style={styles.toggleRow}>
              <Text style={[styles.controlLabel, { color: palette.text }]}>Enforce left alignment</Text>
              <Switch value={settings.leftAlign} onValueChange={(value) => setManualSettings({ leftAlign: value })} trackColor={{ false: COLORS.border, true: palette.accent }} />
            </View>
            <View style={styles.toggleRow}>
              <Text style={[styles.controlLabel, { color: palette.text }]}>Bionic reading</Text>
              <Switch value={settings.bionicReading} onValueChange={(value) => setManualSettings({ bionicReading: value })} trackColor={{ false: COLORS.border, true: palette.accent }} />
            </View>

            <Text style={styles.sectionLabel}>READING CONTRAST</Text>
            <View style={styles.choiceRow}>
              {Object.entries(CONTRAST_PRESETS).map(([value, option]) => (
                <TouchableOpacity
                  key={value}
                  style={[styles.contrastButton, { backgroundColor: option.bg, borderColor: settings.contrastPreset === value ? palette.accent : COLORS.border }]}
                  onPress={() => setManualSettings({ contrastPreset: value, textColor: 'default' })}
                >
                  <Text style={[styles.contrastText, { color: option.text }]}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.sectionLabel}>READING FOCUS & COLOR</Text>
            <View style={styles.choiceRow}>
              {[{ label: 'Off', value: 'off' }, { label: 'Focus bar', value: 'bar' }, { label: 'Reading mask', value: 'mask' }].map((item) => (
                <TouchableOpacity key={item.value} style={[styles.choiceButton, settings.focusMode === item.value && { borderColor: palette.accent }]} onPress={() => setManualSettings({ focusMode: item.value })}>
                  <Text style={[styles.choiceText, { color: palette.text }]}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {settings.focusMode !== 'off' ? (
              <SliderControl label="Focus slot height" value={settings.focusHeight} minimum={40} maximum={240} step={10} formatValue={(v) => `${v} px`} onChange={(v) => setManualSettings({ focusHeight: v })} accent={palette.accent} />
            ) : null}
            <View style={styles.swatchRow}>
              {TINT_COLORS.map((option) => (
                <TouchableOpacity key={option.value} onPress={() => setManualSettings({ tintColor: option.value })} style={[styles.tintSwatch, { backgroundColor: option.color, borderColor: settings.tintColor === option.value ? palette.accent : COLORS.border }]} accessibilityLabel={`${option.label} tint`} />
              ))}
            </View>
            <SliderControl label="Overlay intensity" value={settings.tintIntensity} minimum={0} maximum={0.75} step={0.05} formatValue={(v) => `${Math.round(v * 100)}%`} onChange={(v) => setManualSettings({ tintIntensity: v })} accent={palette.accent} />

            <Text style={styles.sectionLabel}>SPEECH</Text>
            <SliderControl label="Speech speed" value={settings.speechRate} minimum={SPEECH_RATE_MIN} maximum={SPEECH_RATE_MAX} step={0.1} formatValue={(v) => `${v.toFixed(1)}x`} onChange={(v) => updateSettings({ speechRate: Number(v.toFixed(1)) })} accent={palette.accent} />
            <Text style={styles.sectionLabel}>TEXT COLOR</Text>
            <View style={styles.choiceRow}>
              {FONT_COLORS.map((option) => (
                <TouchableOpacity key={option.value} style={[styles.colorButton, { backgroundColor: option.color || palette.bg, borderColor: settings.textColor === option.value ? palette.accent : COLORS.border }]} onPress={() => setManualSettings({ textColor: option.value })}>
                  <Text style={[styles.contrastText, { color: option.color ? (option.color.toLowerCase() === '#ffffff' ? '#111' : '#fff') : palette.text }]}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {settings.textColor === 'custom' ? (
              <TextInput
                value={customColorDraft}
                onChangeText={(value) => {
                  setCustomColorDraft(value);
                  if (/^#[0-9a-fA-F]{6}$/.test(value)) setManualSettings({ customTextColor: value });
                }}
                placeholder="#RRGGBB"
                placeholderTextColor={COLORS.textSecondary}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={7}
                style={[styles.addressInput, { color: palette.text, borderColor: COLORS.border, marginTop: 10 }]}
                accessibilityLabel="Custom web reader text color in hexadecimal"
              />
            ) : null}
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={fontPickerVisible} transparent animationType="fade" onRequestClose={() => setFontPickerVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.fontPicker}>
            <Text style={styles.fontPickerTitle}>SELECT TYPEFACE</Text>
            <ScrollView>
              {FONT_OPTIONS.map((option) => (
                <TouchableOpacity key={option.value} style={styles.fontOption} onPress={() => { setManualSettings({ font: option.value }); setFontPickerVisible(false); }}>
                  <Text style={styles.fontOptionText}>{option.label}</Text>
                  {settings.font === option.value ? <Text style={styles.fontOptionCheck}>✓</Text> : null}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={styles.fontNote}>Some font names use the closest font installed by the website or Android.</Text>
          </View>
        </View>
      </Modal>

      <Modal visible={definitionVisible} transparent animationType="fade" onRequestClose={() => setDefinitionVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.definitionCard, { backgroundColor: palette.surface, borderColor: palette.accent }]}>
            <View style={styles.settingsHeader}>
              <Text style={[styles.settingsTitle, { color: palette.text }]}>WORD MEANING</Text>
              <TouchableOpacity onPress={() => setDefinitionVisible(false)}><Text style={[styles.settingsButtonText, { color: palette.text }]}>CLOSE</Text></TouchableOpacity>
            </View>
            {definitionLoading ? <Text style={styles.settingsHint}>Looking up word…</Text> : null}
            {definitionError ? <Text style={styles.definitionError}>{definitionError}</Text> : null}
            {definition ? (
              <>
                <Text style={[styles.definitionWord, { color: palette.accent }]}>{definition.word}</Text>
                <TouchableOpacity
                  style={styles.pronounceButton}
                  onPress={() => Speech.speak(definition.word, { rate: settings.speechRate })}
                  accessibilityRole="button"
                  accessibilityLabel={`Pronounce ${definition.word}`}
                >
                  <Text style={[styles.selectionButtonText, { color: palette.accent }]}>▶ PRONOUNCE</Text>
                </TouchableOpacity>
                {definition.phonetic ? <Text style={styles.settingsHint}>{definition.phonetic}</Text> : null}
                <Text style={[styles.definitionText, { color: palette.text }]}>{definition.definition}</Text>
                {definition.synonyms?.length ? <Text style={styles.settingsHint}>Easier words: {definition.synonyms.slice(0, 5).join(', ')}</Text> : null}
                <Text style={styles.settingsHint}>{definition.source === 'offline' ? 'Available offline' : 'Online dictionary'}</Text>
              </>
            ) : null}
            {!definitionLoading && !definitionError && !definition ? <Text style={styles.settingsHint}>No definition found.</Text> : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { backgroundColor: COLORS.surface, paddingHorizontal: 14, paddingBottom: 10 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 42 },
  backText: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  headerButton: { padding: 8 },
  headerButtonText: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  connectivityBadge: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4, gap: 5 },
  connectivityDot: { width: 6, height: 6, borderRadius: 3 },
  connectivityText: { fontSize: 8, fontWeight: '700', letterSpacing: 0.8 },
  addressRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  addressInput: { flex: 1, height: 42, borderWidth: 1, borderRadius: 7, paddingHorizontal: 10, fontSize: 13 },
  goButton: { width: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 7 },
  goButtonText: { color: '#111', fontWeight: '800', fontSize: 12 },
  pageTitle: { fontSize: 10, marginTop: 6 },
  webView: { flex: 1, backgroundColor: '#fff' },
  welcome: { flex: 1, justifyContent: 'center', padding: 28 },
  welcomeTitle: { fontSize: 21, fontWeight: '800', letterSpacing: 1, marginBottom: 16 },
  welcomeBody: { color: COLORS.textSecondary, fontSize: 15, lineHeight: 24 },
  welcomeHint: { fontSize: 12, lineHeight: 19, marginTop: 18 },
  loadingBadge: { position: 'absolute', top: 106, right: 12, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.surface, padding: 10, borderRadius: 8 },
  loadingText: { fontSize: 11 },
  errorBanner: { backgroundColor: '#3a1616', padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  errorText: { color: '#ffb0b0', flex: 1, fontSize: 12 },
  dismissText: { color: '#fff', fontSize: 10, fontWeight: '700', paddingLeft: 8 },
  selectionToolbar: { borderTopWidth: 1, padding: 12 },
  selectionPreview: { fontSize: 12, marginBottom: 8 },
  selectionActions: { flexDirection: 'row', gap: 8 },
  selectionButton: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 6, paddingVertical: 8, paddingHorizontal: 12 },
  selectionButtonText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.7 },
  settingsPage: { flex: 1 },
  settingsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  settingsTitle: { fontSize: 14, fontWeight: '800', letterSpacing: 1.3 },
  settingsSubtitle: { color: COLORS.textSecondary, fontSize: 10, marginTop: 4 },
  doneButton: { padding: 8 },
  settingsButtonText: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  settingsContent: { paddingHorizontal: 18, paddingBottom: 32 },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 58, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  settingsHint: { color: COLORS.textSecondary, fontSize: 11, lineHeight: 17, marginTop: 4 },
  sectionLabel: { color: COLORS.textSecondary, fontSize: 10, fontWeight: '700', letterSpacing: 1.6, marginTop: 18, marginBottom: 9 },
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choiceButton: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 9 },
  choiceText: { fontSize: 11 },
  fontButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 42 },
  fontButtonValue: { fontSize: 11, maxWidth: '58%' },
  controlLabel: { color: COLORS.textPrimary, fontSize: 12 },
  sliderGroup: { marginTop: 8 },
  sliderLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sliderValue: { fontSize: 11, fontWeight: '700' },
  slider: { width: '100%', height: 32 },
  contrastButton: { borderWidth: 1, borderRadius: 6, paddingVertical: 8, paddingHorizontal: 10 },
  contrastText: { fontSize: 10 },
  swatchRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, marginBottom: 4 },
  tintSwatch: { width: 32, height: 32, borderRadius: 16, borderWidth: 2 },
  colorButton: { borderWidth: 1, borderRadius: 6, padding: 8 },
  modalOverlay: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: 'rgba(0,0,0,0.75)' },
  fontPicker: { maxHeight: '80%', backgroundColor: '#171717', borderRadius: 12, padding: 18 },
  fontPickerTitle: { color: '#fff', fontSize: 12, fontWeight: '700', letterSpacing: 1.5, marginBottom: 8 },
  fontOption: { minHeight: 46, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: COLORS.border },
  fontOptionText: { color: '#eee', fontSize: 12 },
  fontOptionCheck: { color: COLORS.accent, fontSize: 16 },
  fontNote: { color: COLORS.textSecondary, fontSize: 10, lineHeight: 15, marginTop: 10 },
  definitionCard: { borderWidth: 1, borderRadius: 12, paddingBottom: 18 },
  definitionWord: { fontSize: 24, fontWeight: '800', marginHorizontal: 18, marginTop: 14 },
  pronounceButton: { alignSelf: 'flex-start', marginHorizontal: 18, marginTop: 10, borderWidth: 1, borderColor: COLORS.border, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 8 },
  definitionText: { fontSize: 15, lineHeight: 23, marginHorizontal: 18, marginTop: 12, marginBottom: 12 },
  definitionError: { color: '#ff9b9b', fontSize: 13, lineHeight: 20, margin: 18 },
});
