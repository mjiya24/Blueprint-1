import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, StatusBar, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? 'https://blueprint-1-mnvh.onrender.com';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const QUICK_PROMPTS = [
  "What's the fastest way to get my first client?",
  "I'm struggling with outreach — any tips?",
  "What should I focus on this week?",
  "How do I handle rejection or no-replies?",
];

export default function BlueprintGuideScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const params = useLocalSearchParams();
  const ideaId = params.idea_id as string;
  const ideaTitle = (params.idea_title as string) || 'your Blueprint';

  const [user, setUser] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    AsyncStorage.getItem('user').then(d => {
      if (d) setUser(JSON.parse(d));
      setIsLoading(false);
    });
  }, []);

  useEffect(() => {
    if (user && ideaId) loadHistory();
  }, [user, ideaId]);

  const loadHistory = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/blueprint-guide/history/${user.id}/${ideaId}`);
      setMessages(res.data.map((m: any) => ({ role: m.role, content: m.content })));
    } catch {
      // No history yet
    }
  };

  const sendMessage = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || isThinking) return;
    setInput('');
    const userMsg: Message = { role: 'user', content: msg };
    setMessages(prev => [...prev, userMsg]);
    setIsThinking(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    try {
      const res = await axios.post(`${API_URL}/api/blueprint-guide/chat/${user.id}`, {
        message: msg,
        idea_id: ideaId,
      });
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.response }]);
    } catch (e: any) {
      const errMsg = e?.response?.status === 403
        ? "Architect tier required. Upgrade to unlock Blueprint Guide."
        : "Something went wrong. Please try again.";
      setMessages(prev => [...prev, { role: 'assistant', content: errMsg }]);
    } finally {
      setIsThinking(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.bg }]}>
        <StatusBar barStyle={theme.statusBar as any} backgroundColor={theme.bg} />
        <ActivityIndicator size="large" color="#00D95F" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <StatusBar barStyle={theme.statusBar as any} backgroundColor={theme.bg} />

      {/* Nav */}
      <View style={[styles.navBar, { borderBottomColor: theme.border }]}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: theme.surfaceAlt }]} onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/home'))}>
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.navCenter}>
          <View style={styles.guideIndicator} />
          <View>
            <Text style={[styles.navTitle, { color: theme.text }]}>Blueprint Guide</Text>
            <Text style={[styles.navSub, { color: theme.textMuted }]} numberOfLines={1}>{ideaTitle}</Text>
          </View>
        </View>
        <View style={styles.architectPill}>
          <Ionicons name="flash" size={10} color="#000" />
          <Text style={styles.architectPillText}>AI</Text>
        </View>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={styles.messages}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
      >
        {messages.length === 0 && !isThinking && (
          <View style={styles.emptyState}>
            <View style={styles.avatarLarge}>
              <Ionicons name="flash" size={32} color="#000" />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>Blueprint Guide</Text>
            <Text style={[styles.emptyDesc, { color: theme.textSub }]}>
              Your AI accountability coach. Ask anything about your active blueprint — strategy, obstacles, next steps.
            </Text>
            <View style={styles.quickPromptsSection}>
              <Text style={[styles.quickLabel, { color: theme.textMuted }]}>TRY ASKING</Text>
              {QUICK_PROMPTS.map((p, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.quickPrompt, { backgroundColor: theme.surface, borderColor: theme.border }]}
                  onPress={() => sendMessage(p)}
                  data-testid={`quick-prompt-${i}`}
                >
                  <Text style={[styles.quickPromptText, { color: theme.text }]}>{p}</Text>
                  <Ionicons name="arrow-forward" size={14} color="#00D95F" />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {messages.map((msg, i) => (
          <View
            key={i}
            style={[styles.bubble, msg.role === 'user' ? styles.userBubble : styles.assistantBubble]}
          >
            {msg.role === 'assistant' && (
              <View style={styles.assistantAvatar}>
                <Ionicons name="flash" size={12} color="#000" />
              </View>
            )}
            <View style={[styles.bubbleContent, msg.role === 'user' ? styles.userBubbleContent : [styles.assistantBubbleContent, { backgroundColor: theme.surface, borderColor: theme.border }]]}>
              <Text style={[styles.bubbleText, { color: msg.role === 'user' ? '#000' : theme.text }]}>
                {msg.content}
              </Text>
            </View>
          </View>
        ))}

        {isThinking && (
          <View style={[styles.bubble, styles.assistantBubble]}>
            <View style={styles.assistantAvatar}>
              <Ionicons name="flash" size={12} color="#000" />
            </View>
            <View style={styles.assistantBubbleContent}>
              <View style={styles.thinkingDots}>
                <View style={[styles.dot, styles.dot1]} />
                <View style={[styles.dot, styles.dot2]} />
                <View style={[styles.dot, styles.dot3]} />
              </View>
            </View>
          </View>
        )}
        <View style={{ height: 8 }} />
      </ScrollView>

      {/* Input */}
      <View style={[styles.inputBar, { backgroundColor: theme.bg, borderTopColor: theme.border }]}>
        <TextInput
          style={[styles.textInput, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
          placeholder="Ask your Blueprint Guide..."
          placeholderTextColor={theme.textMuted}
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={500}
          data-testid="chat-input"
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || isThinking) && styles.sendBtnDisabled]}
          onPress={() => sendMessage()}
          disabled={!input.trim() || isThinking}
          data-testid="send-message-btn"
        >
          <Ionicons name="send" size={18} color={input.trim() && !isThinking ? '#000' : '#2A2C35'} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  loadingContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  navBar: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingTop: 56, paddingBottom: 12, gap: 12, borderBottomWidth: 1, borderBottomColor: '#1A1C23',
  },
  backBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#1A1C23', justifyContent: 'center', alignItems: 'center' },
  navCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  guideIndicator: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#00D95F' },
  navTitle: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  navSub: { fontSize: 11, color: '#4A4A4A' },
  architectPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#00D95F', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  architectPillText: { fontSize: 10, fontWeight: '800', color: '#000' },
  messages: { flex: 1 },
  messagesContent: { padding: 16, paddingBottom: 8 },
  emptyState: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 16 },
  avatarLarge: { width: 72, height: 72, borderRadius: 20, backgroundColor: '#00D95F', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF', marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: '#8E8E8E', textAlign: 'center', lineHeight: 20, marginBottom: 28 },
  quickPromptsSection: { width: '100%' },
  quickLabel: { fontSize: 10, color: '#4A4A4A', fontWeight: '800', letterSpacing: 1.5, marginBottom: 10 },
  quickPrompt: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#1A1C23', borderRadius: 12, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: '#2A2C35',
  },
  quickPromptText: { fontSize: 13, color: '#FFFFFF', flex: 1 },
  bubble: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end', gap: 8 },
  userBubble: { justifyContent: 'flex-end' },
  assistantBubble: { justifyContent: 'flex-start' },
  assistantAvatar: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#00D95F', justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  bubbleContent: { maxWidth: '80%', borderRadius: 16, padding: 12 },
  userBubbleContent: { backgroundColor: '#00D95F', borderBottomRightRadius: 4 },
  assistantBubbleContent: { backgroundColor: '#1A1C23', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#2A2C35' },
  bubbleText: { fontSize: 14, color: '#FFFFFF', lineHeight: 20 },
  userBubbleText: { color: '#000' },
  thinkingDots: { flexDirection: 'row', gap: 4, padding: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#00D95F', opacity: 0.6 },
  dot1: {}, dot2: { opacity: 0.4 }, dot3: { opacity: 0.2 },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    padding: 12, paddingBottom: 28, borderTopWidth: 1, borderTopColor: '#1A1C23',
    backgroundColor: '#000',
  },
  textInput: {
    flex: 1, backgroundColor: '#1A1C23', borderRadius: 14, paddingHorizontal: 16,
    paddingVertical: 12, color: '#FFFFFF', fontSize: 15, borderWidth: 1, borderColor: '#2A2C35',
    maxHeight: 120,
  },
  sendBtn: {
    width: 46, height: 46, borderRadius: 12, backgroundColor: '#00D95F',
    justifyContent: 'center', alignItems: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#1A1C23' },
});
