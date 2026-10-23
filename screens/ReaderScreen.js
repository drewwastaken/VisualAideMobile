import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Platform,
  Modal,
  TextInput,
  PanResponder,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import * as Speech from 'expo-speech';
import {
  COLORS,
  CONTRAST_PRESETS,
  FONT_COLORS,
  FONTS,
  FONT_OPTIONS,
  PRESETS,
  TINT_COLORS,
  DEFAULT_SETTINGS,
  SPEECH_RATE_MIN,
  SPEECH_RATE_MAX,
} from '../utils/theme';
import { loadSettings, saveSettings } from '../utils/storage';
import { lookupWord } from '../utils/dictionary';
import useConnectivity from '../utils/useConnectivity';

function splitIntoSentences(text) {
  if (!text) return [];
  const matches = text.match(/[^.!?]+[.!?]+(\s+|$)|[^.!?]+$/g);
  return matches ? matches.map((s) => s.trim()).filter(Boolean) : [text.trim()];
}

function hexToRgba(hex, opacity) {
  const match = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!match) return 'transparent';
  const value = match[1];
  const red = parseInt(value.slice(0, 2), 16);
  const green = parseInt(value.slice(2, 4), 16);
  const blue = parseInt(value.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${Math.max(0, Math.min(0.75, opacity))})`;
}

function SettingSlider({ label, value, minimum, maximum, step, formatValue, onValueChange, textColor, accentColor }) {
  return (
    <View style={styles.sliderGroup}>
      <View style={styles.sliderLabelRow}>
        <Text style={[styles.controlLabel, textColor && { color: textColor }]}>{label}</Text>
        <Text style={[styles.sliderValue, accentColor && { color: accentColor }]}>{formatValue(value)}</Text>
      </View>
      <Slider
        style={styles.slider}
        minimumValue={minimum}
        maximumValue={maximum}
        step={step}
        value={value}
        onValueChange={onValueChange}
        minimumTrackTintColor={accentColor || COLORS.accent}
        maximumTrackTintColor={COLORS.border}
        thumbTintColor={accentColor || COLORS.accent}
      />
    </View>
  );
}

export default function ReaderScreen({ route, navigation }) {
  const { extractedText } = route.params;
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const isOnline = useConnectivity();

  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [fontPickerVisible, setFontPickerVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [customColorDraft, setCustomColorDraft] = useState(DEFAULT_SETTINGS.customTextColor);
  const [dictionaryVisible, setDictionaryVisible] = useState(false);
  const [dictionaryLoading, setDictionaryLoading] = useState(false);
  const [dictionaryEntry, setDictionaryEntry] = useState(null);
  const [dictionaryError, setDictionaryError] = useState('');

  const paragraphs = useMemo(
    () => extractedText.split(/\r?\n/).map((paragraph) => paragraph.trim()),
    [extractedText]
  );
  const paragraphSentences = useMemo(
    () => paragraphs.map(splitIntoSentences),
    [paragraphs]
  );
  const sentences = useMemo(() => paragraphSentences.flat(), [paragraphSentences]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentSentence, setCurrentSentence] = useState(-1);
  const [rulerTop, setRulerTop] = useState(null);
  const rulerTopRef = useRef(0);
  const rulerStartRef = useRef(0);
  const speechPositionRef = useRef({ sentenceIndex: 0, charIndex: 0 });
  const speakingRef = useRef(false);

  useEffect(() => {
    loadSettings().then((loadedSettings) => {
      setSettings(loadedSettings);
      setCustomColorDraft(loadedSettings.customTextColor);
    });
  }, []);

  // Stop any in-progress speech if the user navigates away
  useEffect(() => {
    return () => {
      speakingRef.current = false;
      Speech.stop();
    };
  }, []);

  const speakFrom = useCallback((index, startAt = 0) => {
    if (index >= sentences.length) {
      speakingRef.current = false;
      setIsSpeaking(false);
      setIsPaused(false);
      setCurrentSentence(-1);
      return;
    }
    setCurrentSentence(index);
    speechPositionRef.current = { sentenceIndex: index, charIndex: startAt };
    Speech.speak(sentences[index].slice(startAt), {
      rate: settings.speechRate,
      onBoundary: ({ charIndex }) => {
        if (speakingRef.current) {
          speechPositionRef.current = { sentenceIndex: index, charIndex: startAt + charIndex };
        }
      },
      onDone: () => {
        if (speakingRef.current) {
          speechPositionRef.current = { sentenceIndex: index + 1, charIndex: 0 };
          speakFrom(index + 1);
        }
      },
      onError: () => {
        speakingRef.current = false;
        setIsSpeaking(false);
        setIsPaused(false);
        speechPositionRef.current = { sentenceIndex: 0, charIndex: 0 };
        setCurrentSentence(-1);
      },
    });
  }, [sentences, settings.speechRate]);

  function handlePlay() {
    if (isSpeaking || sentences.length === 0) return;
    speakingRef.current = true;
    setIsSpeaking(true);
    setIsPaused(false);
    const position = isPaused ? speechPositionRef.current : { sentenceIndex: 0, charIndex: 0 };
    speakFrom(position.sentenceIndex, position.charIndex);
  }

  async function handlePauseResume() {
    try {
      if (isPaused) {
        const position = speechPositionRef.current;
        speakingRef.current = true;
        setIsPaused(false);
        speakFrom(position.sentenceIndex, position.charIndex);
      } else {
        speakingRef.current = false;
        await Speech.stop();
        setIsPaused(true);
      }
    } catch (error) {
      Alert.alert('Speech Control Unavailable', error.message || 'Could not change speech playback.');
    }
  }

  function handleStop() {
    speakingRef.current = false;
    Speech.stop();
    setIsSpeaking(false);
    setIsPaused(false);
    speechPositionRef.current = { sentenceIndex: 0, charIndex: 0 };
    setCurrentSentence(-1);
  }

  const updateSettings = useCallback((patch) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  function applyPreset(level) {
    const preset = PRESETS[level];
    updateSettings({ ...preset, level });
  }

  function handleManualChange(patch) {
    updateSettings({ ...patch, level: 0 });
  }

  async function openDictionary(word) {
    setDictionaryVisible(true);
    setDictionaryLoading(true);
    setDictionaryEntry(null);
    setDictionaryError('');
    try {
      const entry = await lookupWord(word);
      setDictionaryEntry(entry);
    } catch (error) {
      setDictionaryError(isOnline
        ? error.message
        : 'This word is not in the offline dictionary. Connect to the internet to look it up.');
    } finally {
      setDictionaryLoading(false);
    }
  }

  const effectiveFocusHeight = Math.min(settings.focusHeight, windowHeight);

  useEffect(() => {
    const maxTop = Math.max(0, windowHeight - effectiveFocusHeight);
    setRulerTop((currentTop) => {
      const nextTop = currentTop === null
        ? maxTop / 2
        : Math.max(0, Math.min(maxTop, currentTop));
      rulerTopRef.current = nextTop;
      return nextTop;
    });
  }, [effectiveFocusHeight, windowHeight]);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      rulerStartRef.current = rulerTopRef.current;
    },
    onPanResponderMove: (_, gesture) => {
      const maxTop = Math.max(0, windowHeight - effectiveFocusHeight);
      const nextTop = Math.max(0, Math.min(maxTop, rulerStartRef.current + gesture.dy));
      rulerTopRef.current = nextTop;
      setRulerTop(nextTop);
    },
  }), [effectiveFocusHeight, windowHeight]);

  const palette = settings.isActive
    ? (CONTRAST_PRESETS[settings.contrastPreset] || CONTRAST_PRESETS.default)
    : CONTRAST_PRESETS.default;
  const currentTextColor = settings.textColor === 'custom'
    ? (/^#[0-9a-fA-F]{6}$/.test(settings.customTextColor) ? settings.customTextColor : palette.text)
    : settings.textColor === 'default'
      ? palette.text
      : settings.textColor;

  function getFontFamily(fontKey) {
    if (Platform.OS === 'android') {
      if (fontKey === 'verdana' || fontKey === 'trebuchet') return 'sans-serif';
      if (fontKey === 'comicSans') return 'casual';
    }
    return FONTS[fontKey] || undefined;
  }

  const textStyle = settings.isActive
    ? {
        letterSpacing: settings.tracking,
        lineHeight: settings.leading * 18,
        fontFamily: getFontFamily(settings.font),
        textAlign: settings.leftAlign ? 'left' : 'auto',
        color: currentTextColor,
      }
    : {};

  const selectedFontLabel = FONT_OPTIONS.find((f) => f.value === settings.font)?.label || 'Website Default';
  const effectiveRulerTop = Math.max(
    0,
    Math.min(windowHeight - effectiveFocusHeight, rulerTop ?? (windowHeight - effectiveFocusHeight) / 2)
  );
  const tint = TINT_COLORS.find((option) => option.value === settings.tintColor) || TINT_COLORS[0];
  const tintBackground = hexToRgba(tint.color, settings.tintIntensity);
  let sentenceCursor = 0;

  return (
    <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: palette.bg }}>
      <View style={styles.container}>

        <View style={styles.readerTopRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={[styles.backText, { color: palette.text }]}>← BACK</Text>
          </TouchableOpacity>
          <View style={[styles.connectivityBadge, { borderColor: isOnline ? palette.accent : COLORS.border }]}>
            <View style={[styles.connectivityDot, { backgroundColor: isOnline ? palette.accent : COLORS.textSecondary }]} />
            <Text style={[styles.connectivityText, { color: palette.text }]}>{isOnline ? 'ONLINE' : 'OFFLINE'}</Text>
          </View>
        </View>

        {/* Scrollable text area */}
        <ScrollView
          style={styles.textArea}
          contentContainerStyle={styles.textContent}
          showsVerticalScrollIndicator={false}
        >
          {paragraphSentences.map((paragraph, paragraphIndex) => (
            <Text
              key={paragraphIndex}
              style={[
                styles.extractedText,
                textStyle,
                { marginBottom: settings.isActive ? settings.paragraphSpacing : 0 },
              ]}
            >
              {paragraph.map((sentence, sentenceIndex) => {
                const globalSentenceIndex = sentenceCursor++;
                return (
                  <Text
                    key={`${paragraphIndex}-${sentenceIndex}`}
                    style={[
                      globalSentenceIndex === currentSentence && styles.sentenceHighlight,
                      globalSentenceIndex === currentSentence && { color: currentTextColor },
                    ]}
                  >
                    {sentence.split(/(\s+)/).map((token, tokenIndex) => {
                      if (/^\s+$/.test(token)) {
                        const spacing = settings.isActive ? '\u200A'.repeat(settings.wordSpacing) : '';
                        return token.replace(/ /g, ` ${spacing}`);
                      }
                      const word = token.replace(/^[^a-zA-Z']+|[^a-zA-Z']+$/g, '');
                      const onLongPress = word ? () => openDictionary(word) : undefined;
                      if (!settings.isActive || !settings.bionicReading) {
                        return <Text key={tokenIndex} onLongPress={onLongPress}>{token}</Text>;
                      }

                      const characters = Array.from(token);
                      const boldCount = Math.ceil(characters.length / 2);
                      return (
                        <Text key={tokenIndex} onLongPress={onLongPress}>
                          <Text style={styles.bionicPrefix}>{characters.slice(0, boldCount).join('')}</Text>
                          {characters.slice(boldCount).join('')}
                        </Text>
                      );
                    })}
                    {' '}
                  </Text>
                );
              })}
            </Text>
          ))}
        </ScrollView>

        {/* Bottom Controls Panel */}
        <View
          style={[
            styles.panel,
            {
              backgroundColor: palette.surface,
              paddingBottom: Math.max(Platform.OS === 'ios' ? 8 : 16, insets.bottom + 8),
            },
          ]}
        >

          {/* Master Toggle */}
          <View style={styles.toggleRow}>
            <View>
              <Text style={[styles.toggleLabel, { color: palette.text }]}>VISUAL AIDE</Text>
              <Text style={[styles.toggleStatus, { color: settings.isActive ? palette.accent : COLORS.textSecondary }]}>
                {settings.isActive ? 'System active.' : 'System inactive.'}
              </Text>
            </View>
            <Switch
              value={settings.isActive}
              onValueChange={(val) => updateSettings({ isActive: val })}
              trackColor={{ false: COLORS.border, true: COLORS.accent }}
              thumbColor={settings.isActive ? '#000' : '#666'}
              ios_backgroundColor={COLORS.border}
            />
          </View>

          <View style={styles.panelDivider} />

          {/* Text to Speech (independent of the visual-aide toggle above) */}
          <View style={styles.ttsRow}>
            <TouchableOpacity
              style={[styles.ttsBtn, isSpeaking && { backgroundColor: hexToRgba(palette.accent, 0.12), borderColor: palette.accent }]}
              onPress={isSpeaking ? handleStop : handlePlay}
              activeOpacity={0.7}
              disabled={sentences.length === 0}
            >
              <Text style={[styles.ttsBtnText, { color: palette.text }, isSpeaking && { color: palette.accent }]}>
                {isSpeaking ? '■ STOP' : '▶ PLAY'}
              </Text>
            </TouchableOpacity>
            {isSpeaking ? (
              <TouchableOpacity style={styles.ttsBtn} onPress={handlePauseResume} activeOpacity={0.7}>
                <Text style={[styles.ttsBtnText, { color: palette.text }]}>
                  {isPaused ? '▶ RESUME' : 'Ⅱ PAUSE'}
                </Text>
              </TouchableOpacity>
            ) : null}
            <View style={styles.ttsSliderGroup}>
              <View style={styles.sliderLabelRow}>
                <Text style={[styles.controlLabel, { color: palette.text }]}>Speed</Text>
                <Text style={[styles.sliderValue, { color: palette.accent }]}>{settings.speechRate.toFixed(1)}x</Text>
              </View>
              <Slider
                style={styles.slider}
                minimumValue={SPEECH_RATE_MIN}
                maximumValue={SPEECH_RATE_MAX}
                step={0.1}
                value={settings.speechRate}
                onValueChange={(val) => updateSettings({ speechRate: parseFloat(val.toFixed(1)) })}
                minimumTrackTintColor={palette.accent}
                maximumTrackTintColor={COLORS.border}
                thumbTintColor={palette.accent}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.fontShortcut, { backgroundColor: hexToRgba(palette.accent, 0.08), borderColor: palette.accent }]}
            onPress={() => setFontPickerVisible(true)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`Change reading font. Current font: ${selectedFontLabel}`}
          >
            <Text style={[styles.fontShortcutIcon, { color: palette.accent }]}>Aa</Text>
            <View style={styles.fontShortcutCopy}>
              <Text style={[styles.fontShortcutTitle, { color: palette.text }]} numberOfLines={1}>
                FONT: {selectedFontLabel}
              </Text>
                <Text style={styles.fontShortcutHint}>Tap to choose a typeface · Long-press a word for its meaning</Text>
            </View>
            <Text style={[styles.settingsButtonArrow, { color: palette.accent }]}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => setSettingsVisible(true)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Open accessibility settings"
          >
            <Text style={[styles.settingsButtonText, { color: palette.text }]}>
              MORE READING SETTINGS
            </Text>
            <Text style={[styles.settingsButtonArrow, { color: palette.text }]}>›</Text>
          </TouchableOpacity>
        </View>
      </View>

      {settings.isActive && settings.tintIntensity > 0 ? (
        <View
          pointerEvents="none"
          style={[styles.tintOverlay, { backgroundColor: tintBackground, top: -insets.top, bottom: -insets.bottom }]}
        />
      ) : null}

      {settings.isActive && settings.focusMode !== 'off' ? (
        <View
          pointerEvents="box-none"
          style={[styles.focusOverlay, { top: -insets.top, bottom: -insets.bottom }]}
        >
          {settings.focusMode === 'mask' ? (
            <>
              <View pointerEvents="none" style={[styles.focusMask, { height: effectiveRulerTop }]} />
              <View
                pointerEvents="none"
                style={[styles.focusMask, { top: effectiveRulerTop + effectiveFocusHeight, bottom: 0 }]}
              />
            </>
          ) : null}
          <View
            {...panResponder.panHandlers}
            accessibilityRole="adjustable"
            accessibilityLabel="Reading focus area; drag vertically to move"
            style={[
              styles.focusSlot,
              settings.focusMode === 'mask' && styles.focusSlotMask,
              {
                top: effectiveRulerTop,
                height: effectiveFocusHeight,
                borderColor: palette.text,
              },
            ]}
          >
            <View style={styles.focusGrip} />
          </View>
        </View>
      ) : null}

      <Modal
        visible={settingsVisible}
        animationType="slide"
        onRequestClose={() => setSettingsVisible(false)}
      >
        <View style={[styles.settingsPage, { paddingTop: insets.top, backgroundColor: palette.bg }]}>
          <View style={styles.settingsHeader}>
            <View>
              <Text style={[styles.settingsTitle, { color: palette.text }]}>ACCESSIBILITY</Text>
              <Text style={styles.settingsSubtitle}>Personalize your reading view</Text>
            </View>
            <TouchableOpacity
              style={styles.closeSettingsButton}
              onPress={() => setSettingsVisible(false)}
              accessibilityRole="button"
              accessibilityLabel="Close accessibility settings"
            >
              <Text style={[styles.closeSettingsText, { color: palette.text }]}>DONE</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={[styles.settingsContent, { paddingBottom: insets.bottom + 24 }]}
            showsVerticalScrollIndicator={false}
          >
            <View style={{ opacity: settings.isActive ? 1 : 0.35 }} pointerEvents={settings.isActive ? 'auto' : 'none'}>
              <Text style={styles.sectionLabel}>SEVERITY LEVELS</Text>
              <View style={styles.levelGroup}>
                {[1, 2, 3].map((level) => {
                  const isSelected = settings.level === level;
                  return (
                    <TouchableOpacity
                      key={level}
                      style={[
                        styles.levelBtn,
                        isSelected && { backgroundColor: hexToRgba(palette.accent, 0.12), borderColor: palette.accent },
                      ]}
                      onPress={() => applyPreset(level)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.levelBtnText, { color: palette.text }, isSelected && { color: palette.accent }]}>
                        {`L${level}: ${['', 'Mild', 'Mod', 'Max'][level]}`}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.sectionLabel}>TYPOGRAPHY</Text>
              <View style={styles.controlRow}>
                <Text style={[styles.controlLabel, { color: palette.text }]}>Typeface</Text>
                <TouchableOpacity
                  style={styles.selectBtn}
                  onPress={() => setFontPickerVisible(true)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.selectBtnText} numberOfLines={1}>{selectedFontLabel}</Text>
                  <Text style={styles.selectArrow}>▾</Text>
                </TouchableOpacity>
              </View>

              <SettingSlider
                label="Tracking"
                textColor={palette.text}
                accentColor={palette.accent}
                value={settings.tracking}
                minimum={0}
                maximum={6}
                step={0.5}
                formatValue={(value) => `${value.toFixed(1)} px`}
                onValueChange={(value) => handleManualChange({ tracking: value })}
              />
              <SettingSlider
                label="Word spacing"
                textColor={palette.text}
                accentColor={palette.accent}
                value={settings.wordSpacing}
                minimum={0}
                maximum={12}
                step={1}
                formatValue={(value) => `${value} px`}
                onValueChange={(value) => handleManualChange({ wordSpacing: value })}
              />
              <SettingSlider
                label="Line height"
                textColor={palette.text}
                accentColor={palette.accent}
                value={settings.leading}
                minimum={1}
                maximum={2.8}
                step={0.1}
                formatValue={(value) => `${value.toFixed(1)}x`}
                onValueChange={(value) => handleManualChange({ leading: parseFloat(value.toFixed(1)) })}
              />
              <SettingSlider
                label="Paragraph spacing"
                textColor={palette.text}
                accentColor={palette.accent}
                value={settings.paragraphSpacing}
                minimum={0}
                maximum={24}
                step={1}
                formatValue={(value) => `${value} px`}
                onValueChange={(value) => handleManualChange({ paragraphSpacing: value })}
              />

              <View style={styles.settingToggleRow}>
                <Text style={[styles.controlLabel, { color: palette.text }]}>Enforce left alignment</Text>
                <Switch
                  value={settings.leftAlign}
                  onValueChange={(value) => handleManualChange({ leftAlign: value })}
                  trackColor={{ false: COLORS.border, true: COLORS.accent }}
                  thumbColor={settings.leftAlign ? '#000' : '#666'}
                />
              </View>
              <View style={styles.settingToggleRow}>
                <View style={styles.toggleDescription}>
                  <Text style={[styles.controlLabel, { color: palette.text }]}>Bionic reading</Text>
                  <Text style={styles.settingsHint}>Emphasize the beginning of each word.</Text>
                </View>
                <Switch
                  value={settings.bionicReading}
                  onValueChange={(value) => handleManualChange({ bionicReading: value })}
                  trackColor={{ false: COLORS.border, true: COLORS.accent }}
                  thumbColor={settings.bionicReading ? '#000' : '#666'}
                />
              </View>

              <Text style={styles.sectionLabel}>READING CONTRAST</Text>
              <View style={styles.choiceGroup}>
                {Object.entries(CONTRAST_PRESETS).map(([value, option]) => {
                  const selected = settings.contrastPreset === value;
                  return (
                    <TouchableOpacity
                      key={value}
                      style={[
                        styles.choiceChip,
                        { backgroundColor: option.bg, borderColor: selected ? palette.accent : COLORS.border },
                      ]}
                      onPress={() => handleManualChange({ contrastPreset: value, textColor: 'default' })}
                      accessibilityRole="button"
                      accessibilityLabel={`Use ${option.label} contrast`}
                    >
                      <Text style={[styles.choiceChipText, { color: option.text }]}>{option.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.sectionLabel}>TEXT COLOR</Text>
              <View style={styles.choiceGroup}>
                {FONT_COLORS.map((option) => {
                  const selected = settings.textColor === option.value;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.colorChoice,
                        option.color && { backgroundColor: option.color },
                        selected && { borderColor: palette.accent, borderWidth: 3 },
                      ]}
                      onPress={() => {
                        handleManualChange({ textColor: option.value });
                        if (option.value === 'custom') setCustomColorDraft(settings.customTextColor);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`Text color: ${option.label}`}
                    >
                      {option.value === 'custom' || option.value === 'default' ? (
                        <Text style={styles.colorChoiceLabel}>{option.label}</Text>
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
              {settings.textColor === 'custom' ? (
                <TextInput
                  style={[styles.customColorInput, { color: palette.text }]}
                  value={customColorDraft}
                  onChangeText={(value) => {
                    setCustomColorDraft(value);
                    if (/^#[0-9a-fA-F]{6}$/.test(value)) {
                      handleManualChange({ customTextColor: value });
                    }
                  }}
                  placeholder="#RRGGBB"
                  placeholderTextColor={COLORS.textSecondary}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={7}
                  accessibilityLabel="Custom text color in hexadecimal"
                />
              ) : null}

              <Text style={styles.sectionLabel}>READING RULER / FOCUS</Text>
              <View style={styles.choiceGroup}>
                {[
                  { label: 'Off', value: 'off' },
                  { label: 'Focus bar', value: 'bar' },
                  { label: 'Reading mask', value: 'mask' },
                ].map((option) => {
                  const selected = settings.focusMode === option.value;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.modeButton,
                        selected && { backgroundColor: hexToRgba(palette.accent, 0.12), borderColor: palette.accent },
                      ]}
                      onPress={() => handleManualChange({ focusMode: option.value })}
                    >
                      <Text style={[styles.modeButtonText, { color: palette.text }, selected && { color: palette.accent, fontWeight: '700' }]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {settings.focusMode !== 'off' ? (
                <SettingSlider
                  label="Focus slot height"
                  textColor={palette.text}
                  accentColor={palette.accent}
                  value={settings.focusHeight}
                  minimum={40}
                  maximum={240}
                  step={10}
                  formatValue={(value) => `${value} px`}
                  onValueChange={(value) => handleManualChange({ focusHeight: value })}
                />
              ) : null}

              <Text style={styles.sectionLabel}>COLOR OVERLAY</Text>
              <View style={styles.tintGroup}>
                {TINT_COLORS.map((option) => {
                  const selected = settings.tintColor === option.value;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.tintSwatch,
                        { backgroundColor: option.color },
                        selected && { borderColor: palette.accent, borderWidth: 3 },
                      ]}
                      onPress={() => handleManualChange({ tintColor: option.value })}
                      accessibilityRole="button"
                      accessibilityLabel={`${option.label} color overlay`}
                    />
                  );
                })}
              </View>
              <SettingSlider
                label="Overlay intensity"
                textColor={palette.text}
                accentColor={palette.accent}
                value={settings.tintIntensity}
                minimum={0}
                maximum={0.75}
                step={0.05}
                formatValue={(value) => `${Math.round(value * 100)}%`}
                onValueChange={(value) => handleManualChange({ tintIntensity: value })}
              />
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Font Picker Modal */}
      <Modal
        visible={fontPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFontPickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setFontPickerVisible(false)}
        >
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>SELECT TYPEFACE</Text>
            {FONT_OPTIONS.map((option) => {
              const isSelected = settings.font === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.modalOption, isSelected && styles.modalOptionActive]}
                  onPress={() => {
                    handleManualChange({ font: option.value });
                    setFontPickerVisible(false);
                  }}
                >
                  <Text style={[styles.modalOptionText, isSelected && styles.modalOptionTextActive]}>
                    {option.label}
                  </Text>
                  {isSelected && <Text style={styles.modalCheck}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
      <Modal
        visible={dictionaryVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDictionaryVisible(false)}
      >
        <View style={styles.dictionaryOverlay}>
          <View style={[styles.dictionaryCard, { backgroundColor: palette.surface, borderColor: palette.accent }]}>
            <View style={styles.dictionaryHeader}>
              <Text style={[styles.dictionaryTitle, { color: palette.text }]}>WORD MEANING</Text>
              <TouchableOpacity onPress={() => setDictionaryVisible(false)} accessibilityLabel="Close word meaning">
                <Text style={[styles.dictionaryClose, { color: palette.text }]}>✕</Text>
              </TouchableOpacity>
            </View>
            {dictionaryLoading ? (
              <Text style={styles.dictionaryHint}>Looking up word…</Text>
            ) : dictionaryError ? (
              <Text style={styles.dictionaryError}>{dictionaryError}</Text>
            ) : dictionaryEntry ? (
              <>
                <View style={styles.dictionaryWordRow}>
                  <Text style={[styles.dictionaryWord, { color: palette.accent }]}>{dictionaryEntry.word}</Text>
                  <TouchableOpacity
                    style={styles.dictionarySpeakButton}
                    onPress={() => Speech.speak(dictionaryEntry.word, { rate: settings.speechRate })}
                    accessibilityRole="button"
                    accessibilityLabel={`Pronounce ${dictionaryEntry.word}`}
                  >
                    <Text style={[styles.dictionarySpeakText, { color: palette.text }]}>▶ SAY</Text>
                  </TouchableOpacity>
                </View>
                {dictionaryEntry.phonetic ? (
                  <Text style={styles.dictionaryHint}>{dictionaryEntry.phonetic}</Text>
                ) : null}
                <Text style={[styles.dictionaryDefinition, { color: palette.text }]}>{dictionaryEntry.definition}</Text>
                {dictionaryEntry.synonyms?.length ? (
                  <Text style={[styles.dictionaryHint, { marginTop: 12 }]}>
                    Easier words: {dictionaryEntry.synonyms.slice(0, 5).join(', ')}
                  </Text>
                ) : null}
                <Text style={styles.dictionarySource}>
                  {dictionaryEntry.source === 'offline' ? 'Available offline' : 'Online dictionary'}
                </Text>
              </>
            ) : (
              <Text style={styles.dictionaryError}>No definition found for this word.</Text>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  readerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 18,
  },
  connectivityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 5,
    gap: 6,
  },
  connectivityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  connectivityText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
  },
  backText: {
    color: COLORS.accent,
    fontSize: 12,
    letterSpacing: 2,
    fontWeight: '600',
  },
  textArea: {
    flex: 1,
    paddingHorizontal: 20,
  },
  textContent: {
    paddingBottom: 20,
  },
  extractedText: {
    fontSize: 16,
    color: COLORS.textPrimary,
    lineHeight: 26,
  },
  sentenceHighlight: {
    backgroundColor: COLORS.accentBg,
    fontWeight: '600',
  },
  bionicPrefix: {
    fontWeight: '800',
  },
  panel: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 8 : 16,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  toggleLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 2,
    color: COLORS.textPrimary,
  },
  toggleStatus: {
    fontSize: 12,
    marginTop: 2,
  },
  panelDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginBottom: 14,
  },
  sectionLabel: {
    fontSize: 10,
    letterSpacing: 2,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginTop: 4,
  },
  levelGroup: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  ttsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  ttsBtn: {
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  ttsBtnActive: {
    backgroundColor: COLORS.accentBg,
    borderColor: COLORS.accent,
  },
  ttsBtnText: {
    fontSize: 12,
    color: COLORS.textPrimary,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  ttsBtnTextActive: {
    color: COLORS.accent,
  },
  ttsSliderGroup: {
    flex: 1,
  },
  fontShortcut: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 2,
  },
  fontShortcutIcon: {
    fontSize: 20,
    fontWeight: '800',
    marginRight: 12,
  },
  fontShortcutCopy: {
    flex: 1,
  },
  fontShortcutTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  fontShortcutHint: {
    color: COLORS.textSecondary,
    fontSize: 10,
    marginTop: 3,
  },
  settingsButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 10,
    paddingBottom: 4,
  },
  settingsButtonText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  settingsButtonArrow: {
    fontSize: 20,
  },
  levelBtn: {
    flex: 1,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: 'center',
  },
  levelBtnActive: {
    backgroundColor: COLORS.accentBg,
    borderColor: COLORS.accent,
  },
  levelBtnText: {
    fontSize: 11,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  levelBtnTextActive: {
    color: COLORS.accent,
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  controlLabel: {
    fontSize: 12,
    color: COLORS.textPrimary,
    letterSpacing: 0.5,
  },
  selectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    maxWidth: 180,
    gap: 6,
  },
  selectBtnText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    flex: 1,
  },
  selectArrow: {
    fontSize: 12,
    color: COLORS.accent,
  },
  sliderGroup: {
    marginBottom: 8,
  },
  sliderLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  sliderValue: {
    fontSize: 11,
    color: COLORS.accent,
    fontWeight: '600',
  },
  slider: {
    width: '100%',
    height: 32,
  },
  settingsPage: {
    flex: 1,
  },
  settingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  settingsTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 2,
  },
  settingsSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  closeSettingsButton: {
    padding: 10,
  },
  closeSettingsText: {
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 1,
  },
  settingsContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  settingToggleRow: {
    minHeight: 52,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 12,
  },
  toggleDescription: {
    flex: 1,
    paddingRight: 12,
  },
  settingsHint: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 3,
  },
  choiceGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  choiceChip: {
    borderWidth: 2,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  choiceChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  colorChoice: {
    minWidth: 44,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  colorChoiceSelected: {
    borderColor: COLORS.accent,
    borderWidth: 3,
  },
  colorChoiceLabel: {
    color: COLORS.textPrimary,
    fontSize: 10,
    fontWeight: '600',
  },
  customColorInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  modeButton: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  modeButtonActive: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accentBg,
  },
  modeButtonText: {
    color: COLORS.textPrimary,
    fontSize: 12,
  },
  modeButtonTextActive: {
    color: COLORS.accent,
    fontWeight: '700',
  },
  tintGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  tintSwatch: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  tintSwatchSelected: {
    borderColor: COLORS.accent,
    borderWidth: 3,
  },
  tintOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 5,
    elevation: 5,
  },
  focusOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 6,
    elevation: 6,
  },
  focusMask: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.62)',
  },
  focusSlot: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: 2,
    borderBottomWidth: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  focusSlotMask: {
    backgroundColor: 'transparent',
  },
  focusGrip: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    padding: 20,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 11,
    letterSpacing: 3,
    color: COLORS.textSecondary,
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginBottom: 4,
  },
  modalOptionActive: {
    backgroundColor: COLORS.accentBg,
  },
  modalOptionText: {
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  modalOptionTextActive: {
    color: COLORS.accent,
  },
  modalCheck: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: '700',
  },
  dictionaryOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  dictionaryCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 20,
  },
  dictionaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dictionaryTitle: {
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: '700',
  },
  dictionaryClose: {
    fontSize: 20,
    paddingHorizontal: 6,
  },
  dictionaryWordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dictionaryWord: {
    fontSize: 24,
    fontWeight: '800',
    flex: 1,
  },
  dictionarySpeakButton: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  dictionarySpeakText: {
    fontSize: 11,
    fontWeight: '700',
  },
  dictionaryDefinition: {
    fontSize: 16,
    lineHeight: 24,
    marginTop: 14,
  },
  dictionaryHint: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  dictionaryError: {
    color: '#ff9b9b',
    fontSize: 14,
    lineHeight: 21,
  },
  dictionarySource: {
    color: COLORS.textSecondary,
    fontSize: 10,
    marginTop: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});