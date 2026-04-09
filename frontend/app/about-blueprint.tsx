import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Linking,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const DISCORD_URL = 'https://discord.gg/blueprintarchitect';
const TERMS_URL = 'https://blueprint.com/terms';
const PRIVACY_URL = 'https://blueprint.com/privacy';
const SUPPORT_EMAIL = 'architect@blueprint.com';

export default function AboutBlueprintScreen() {
  const router = useRouter();

  const openUrl = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (error) {
      console.error('Could not open url:', error);
    }
  };

  const openMail = async () => {
    try {
      await Linking.openURL(`mailto:${SUPPORT_EMAIL}`);
    } catch (error) {
      console.error('Could not open mail app:', error);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={20} color="#E5E7EB" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>About Blueprint</Text>
        <View style={styles.topBarSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={styles.logoWrap}>
            <Image source={require('../assets/images/icon.png')} style={styles.logo} resizeMode="contain" />
          </View>

            <Text style={styles.kicker}>ABOUT BLUEPRINT: THE ARCHITECT&apos;S VISION</Text>
          <Text style={styles.version}>Version: Architect Edition v1.2 (2026)</Text>
          <Text style={styles.mission}>Our Mission: Transparency in earning.</Text>
        </View>

        <View style={styles.letterCard}>
          <Text style={styles.sectionEyebrow}>The Community & Team (Option 3 Mix)</Text>
          <Text style={styles.sectionTitle}>Built for the 12,000+.</Text>
          <Text style={styles.bodyText}>
            You are not building alone. You are part of a global collective of Architects using data to win.
            Whether you are chasing your first $50 Quick Win or scaling a $10k/mo Passive Pipeline,
            we are tracking the data to keep you ahead.
          </Text>

          <View style={styles.divider} />

          <Text style={styles.teamLine}>Developed by Zico & The Architect Team.</Text>

          <TouchableOpacity style={styles.linkRow} onPress={openMail} activeOpacity={0.85}>
            <View style={styles.linkIconWrap}>
              <Ionicons name="mail-open-outline" size={16} color="#00D95F" />
            </View>
            <View style={styles.linkTextWrap}>
              <Text style={styles.linkLabel}>Support</Text>
              <Text style={styles.linkValue}>{SUPPORT_EMAIL}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#6B7280" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkRow} onPress={() => openUrl(DISCORD_URL)} activeOpacity={0.85}>
            <View style={styles.linkIconWrap}>
              <Ionicons name="people-outline" size={16} color="#60A5FA" />
            </View>
            <View style={styles.linkTextWrap}>
              <Text style={styles.linkLabel}>Community</Text>
              <Text style={styles.linkValue}>Join the Architect Discord</Text>
            </View>
            <Ionicons name="open-outline" size={15} color="#6B7280" />
          </TouchableOpacity>

          <View style={styles.legalRow}>
            <TouchableOpacity onPress={() => openUrl(TERMS_URL)} activeOpacity={0.8}>
              <Text style={styles.legalLink}>Terms of Service</Text>
            </TouchableOpacity>
            <Text style={styles.legalDot}>|</Text>
            <TouchableOpacity onPress={() => openUrl(PRIVACY_URL)} activeOpacity={0.8}>
              <Text style={styles.legalLink}>Privacy Policy</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#05080F',
  },
  topBar: {
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#1F2937',
    backgroundColor: '#0C1220',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F3F4F6',
    letterSpacing: 0.2,
  },
  topBarSpacer: {
    width: 36,
    height: 36,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 36,
    gap: 14,
  },
  heroCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#173A2A',
    backgroundColor: '#0A1222',
    paddingVertical: 22,
    paddingHorizontal: 18,
    alignItems: 'center',
  },
  logoWrap: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 1,
    borderColor: '#00D95F60',
    backgroundColor: '#02130B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  logo: {
    width: 58,
    height: 58,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.6,
    color: '#34D399',
    marginBottom: 6,
  },
  version: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E5E7EB',
    marginBottom: 4,
  },
  mission: {
    fontSize: 13,
    color: '#A3A3A3',
  },
  letterCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1F2937',
    backgroundColor: '#0B1020',
    padding: 18,
  },
  sectionTitle: {
    fontSize: 22,
    lineHeight: 28,
    color: '#FFFFFF',
    fontWeight: '800',
    marginBottom: 10,
    letterSpacing: -0.2,
  },
  sectionEyebrow: {
    color: '#34D399',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  bodyText: {
    color: '#C7CDD8',
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '500',
  },
  divider: {
    marginVertical: 16,
    height: 1,
    backgroundColor: '#1F2937',
  },
  teamLine: {
    color: '#F3F4F6',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 14,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1F2937',
    backgroundColor: '#0D1424',
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 10,
  },
  linkIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#101B2E',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  linkTextWrap: {
    flex: 1,
  },
  linkLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  linkValue: {
    color: '#F3F4F6',
    fontSize: 14,
    fontWeight: '600',
  },
  legalRow: {
    marginTop: 4,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  legalLink: {
    color: '#86EFAC',
    fontSize: 13,
    fontWeight: '600',
  },
  legalDot: {
    color: '#64748B',
    fontSize: 13,
  },
});
