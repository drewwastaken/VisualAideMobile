import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Platform,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import { COLORS, FONTS, FONT_OPTIONS, PRESETS, DEFAULT_SETTINGS } from '../utils/theme';
import { loadSettings, saveSettings } from '../utils/storage';

export default function ReaderScreen({ route, navigation }) {
  const { extractedText } = route.params;
  const insets = useSafeAreaInsets();

  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [fontPickerVisible, setFontPickerVisible] = useState(false);

  useEffect(() => {
    loadSettings().then(setSettings);
  }, []);

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

  function getFontFamily(fontKey) {
    return FONTS[fontKey] || undefined;
  }

  const textStyle = settings.isActive
    ? {
        letterSpacing: settings.kerning,
        lineHeight: settings.leading * 18,
        fontFamily: getFontFamily(settings.font),
        textAlign: 'left',
      }
    : {};

  const controlsOpacity = settings.isActive ? 1 : 0.3;
  const controlsPointerEvents = settings.isActive ? 'auto' : 'none';

  const selectedFontLabel = FONT_OPTIONS.find((f) => f.value === settings.font)?.label || 'Website Default';

  return (
    <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: '#0d0d0d' }}>
      <View style={styles.container}>

        {/* Back button */}
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← BACK</Text>
        </TouchableOpacity>

        {/* Scrollable text area */}
        <ScrollView
          style={styles.textArea}
          contentContainerStyle={styles.textContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.extractedText, textStyle]}>{extractedText}</Text>
        </ScrollView>

        {/* Bottom Controls Panel */}
        <View style={styles.panel}>

          {/* Master Toggle */}
          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.toggleLabel}>VISUAL AIDE</Text>
              <Text style={[styles.toggleStatus, { color: settings.isActive ? COLORS.accent : COLORS.textSecondary }]}>
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

          {/* Controls (dimmed when inactive) */}
          <View style={{ opacity: controlsOpacity }} pointerEvents={controlsPointerEvents}>

            {/* Severity Levels */}
            <Text style={styles.sectionLabel}>SEVERITY LEVELS</Text>
            <View style={styles.levelGroup}>
              {[1, 2, 3].map((lvl) => {
                const labels = { 1: 'L1: Mild', 2: 'L2: Mod', 3: 'L3: Max' };
                const isActive = settings.level === lvl;
                return (
                  <TouchableOpacity
                    key={lvl}
                    style={[styles.levelBtn, isActive && styles.levelBtnActive]}
                    onPress={() => applyPreset(lvl)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.levelBtnText, isActive && styles.levelBtnTextActive]}>
                      {labels[lvl]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Granular Override */}
            <Text style={styles.sectionLabel}>GRANULAR OVERRIDE</Text>

            {/* Typeface Picker */}
            <View style={styles.controlRow}>
              <Text style={styles.controlLabel}>Typeface</Text>
              <TouchableOpacity
                style={styles.selectBtn}
                onPress={() => setFontPickerVisible(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.selectBtnText} numberOfLines={1}>{selectedFontLabel}</Text>
                <Text style={styles.selectArrow}>▾</Text>
              </TouchableOpacity>
            </View>

            {/* Kerning Slider */}
            <View style={styles.sliderGroup}>
              <View style={styles.sliderLabelRow}>
                <Text style={styles.controlLabel}>Kerning (Spacing)</Text>
                <Text style={styles.sliderValue}>{settings.kerning.toFixed(1)}</Text>
              </View>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={5}
                step={0.5}
                value={settings.kerning}
                onValueChange={(val) => handleManualChange({ kerning: val })}
                minimumTrackTintColor={COLORS.accent}
                maximumTrackTintColor={COLORS.border}
                thumbTintColor={COLORS.accent}
              />
            </View>

            {/* Leading Slider */}
            <View style={styles.sliderGroup}>
              <View style={styles.sliderLabelRow}>
                <Text style={styles.controlLabel}>Leading (Line Height)</Text>
                <Text style={styles.sliderValue}>{settings.leading.toFixed(1)}</Text>
              </View>
              <Slider
                style={styles.slider}
                minimumValue={1.0}
                maximumValue={2.5}
                step={0.1}
                value={settings.leading}
                onValueChange={(val) => handleManualChange({ leading: parseFloat(val.toFixed(1)) })}
                minimumTrackTintColor={COLORS.accent}
                maximumTrackTintColor={COLORS.border}
                thumbTintColor={COLORS.accent}
              />
            </View>
          </View>
        </View>
      </View>

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
});