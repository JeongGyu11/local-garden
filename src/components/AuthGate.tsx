import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import { Provider, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

WebBrowser.maybeCompleteAuthSession();

const ONBOARDING_KEY = 'local-garden:onboarding-complete';
const NATIVE_REDIRECT_URL = 'localgarden://auth/callback';

type AuthGateProps = {
  children: (session: Session) => React.ReactNode;
};

const createSessionFromUrl = async (url: string) => {
  const callbackUrl = new URL(url);
  const hashParams = new URLSearchParams(callbackUrl.hash.replace(/^#/, ''));
  const queryParams = callbackUrl.searchParams;
  const code = queryParams.get('code') ?? hashParams.get('code');
  const accessToken = hashParams.get('access_token') ?? queryParams.get('access_token');
  const refreshToken = hashParams.get('refresh_token') ?? queryParams.get('refresh_token');

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return;
  }

  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) throw error;
    return;
  }

  throw new Error('로그인 인증 정보를 받지 못했습니다.');
};

export const AuthGate: React.FC<AuthGateProps> = ({ children }) => {
  const [checking, setChecking] = useState(true);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [signingInWith, setSigningInWith] = useState<'google' | 'apple' | 'kakao' | null>(null);

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const url = window.location.href;
        if (url.includes('error=')) {
          const searchParams = new URLSearchParams(window.location.search || window.location.hash.replace(/^#/, ''));
          const errorDesc = searchParams.get('error_description') ?? searchParams.get('error');
          if (errorDesc) {
            Alert.alert('로그인 오류', `카카오 인증 중 오류 발생: ${decodeURIComponent(errorDesc)}`);
          }
        }
      }

      const [seen, sessionResult] = await Promise.all([
        AsyncStorage.getItem(ONBOARDING_KEY),
        supabase.auth.getSession(),
      ]);

      if (!mounted) return;

      const currentSession = sessionResult.data.session;
      setSession(currentSession);
      if (currentSession) {
        await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
        setOnboardingComplete(true);
      } else {
        setOnboardingComplete(seen === 'true');
      }
      setChecking(false);
    }

    initAuth();

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (mounted) {
        setSession(nextSession);
        if (nextSession) {
          AsyncStorage.setItem(ONBOARDING_KEY, 'true');
          setOnboardingComplete(true);
        }
      }
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const finishOnboarding = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    setOnboardingComplete(true);
  };

  const signInWithOAuth = async (provider: Extract<Provider, 'google' | 'apple' | 'kakao'>) => {
    setSigningInWith(provider);
    try {
      const redirectTo =
        Platform.OS === 'web' && typeof window !== 'undefined'
          ? window.location.origin
          : NATIVE_REDIRECT_URL;
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });
      if (error) throw error;

      if (!data?.url) {
        throw new Error('인증 URL을 생성하지 못했습니다.');
      }

      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.location.href = data.url;
      } else {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
        if (result.type === 'success' && result.url) {
          await createSessionFromUrl(result.url);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '로그인 중 문제가 발생했습니다.';
      Alert.alert('로그인 실패', message);
    } finally {
      setSigningInWith(null);
    }
  };

  if (checking) {
    return (
      <View style={styles.loadingScreen}>
        <Text style={styles.loadingSprout}>🌱</Text>
        <ActivityIndicator color="#2D6A4F" />
      </View>
    );
  }

  if (!onboardingComplete) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.heroGlow} />
        <View style={styles.content}>
          <View style={styles.logoBadge}><Text style={styles.logoEmoji}>🌱</Text></View>
          <Text style={styles.brand}>로컬 가든</Text>
          <Text style={styles.title}>여행에서 발견한 씨앗으로{`\n`}나만의 정원을 키워요</Text>
          <Text style={styles.description}>
            주변 관광지를 탐험하고 씨앗을 모아 지역의 특별한 작물을 길러보세요.
          </Text>

          <View style={styles.featureList}>
            <View style={styles.featureRow}><Text style={styles.featureIcon}>🧭</Text><Text style={styles.featureText}>GPS 주변 인기 명소 탐험</Text></View>
            <View style={styles.featureRow}><Text style={styles.featureIcon}>🎁</Text><Text style={styles.featureText}>방문 인증으로 지역 씨앗 획득</Text></View>
            <View style={styles.featureRow}><Text style={styles.featureIcon}>🌾</Text><Text style={styles.featureText}>나만의 농장과 도감 완성</Text></View>
          </View>
        </View>
        <TouchableOpacity style={styles.primaryButton} onPress={finishOnboarding}>
          <Text style={styles.primaryButtonText}>시작하기</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFFBE8" />
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (!session) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.loginContent}>
          <View style={styles.logoBadge}><Text style={styles.logoEmoji}>🌿</Text></View>
          <Text style={styles.brand}>로컬 가든</Text>
          <Text style={styles.loginTitle}>내 정원으로 돌아가기</Text>
          <Text style={styles.description}>로그인하면 게임 기록이 계정별로 안전하게 저장됩니다.</Text>

          <TouchableOpacity
            style={[styles.googleButton, signingInWith !== null && styles.disabledButton]}
            onPress={() => signInWithOAuth('google')}
            disabled={signingInWith !== null}
          >
            {signingInWith === 'google' ? (
              <ActivityIndicator color="#334155" />
            ) : (
              <>
                <Text style={styles.googleMark}>G</Text>
                <Text style={styles.googleButtonText}>Google로 계속하기</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.appleButton, signingInWith !== null && styles.disabledButton]}
            onPress={() => signInWithOAuth('apple')}
            disabled={signingInWith !== null}
          >
            {signingInWith === 'apple' ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="logo-apple" size={22} color="#FFFFFF" />
                <Text style={styles.appleButtonText}>Apple로 계속하기</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.kakaoButton, signingInWith !== null && styles.disabledButton]}
            onPress={() => signInWithOAuth('kakao')}
            disabled={signingInWith !== null}
          >
            {signingInWith === 'kakao' ? (
              <ActivityIndicator color="#191919" />
            ) : (
              <>
                <Text style={styles.kakaoMark}>K</Text>
                <Text style={styles.kakaoButtonText}>카카오로 계속하기</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setOnboardingComplete(false)}>
            <Text style={styles.replayText}>온보딩 다시 보기</Text>
          </TouchableOpacity>
          <Text style={styles.terms}>계속하면 서비스 이용약관 및 개인정보 처리방침에 동의하게 됩니다.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return <>{children(session)}</>;
};

const styles = StyleSheet.create({
  loadingScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F0D5', gap: 14 },
  loadingSprout: { fontSize: 48 },
  screen: { flex: 1, backgroundColor: '#F5F0D5', paddingHorizontal: 24, overflow: 'hidden' },
  heroGlow: { position: 'absolute', width: 420, height: 420, borderRadius: 210, backgroundColor: '#B9DB8C', top: -180, right: -160, opacity: 0.65 },
  content: { flex: 1, justifyContent: 'center', maxWidth: 430, width: '100%', alignSelf: 'center' },
  loginContent: { flex: 1, justifyContent: 'center', alignItems: 'center', maxWidth: 430, width: '100%', alignSelf: 'center' },
  logoBadge: { width: 76, height: 76, borderRadius: 24, backgroundColor: '#2D6A4F', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#1B4332', marginBottom: 15 },
  logoEmoji: { fontSize: 38 },
  brand: { fontSize: 15, fontWeight: '900', color: '#7C4E22', letterSpacing: 2, marginBottom: 12 },
  title: { fontSize: 30, lineHeight: 40, fontWeight: '900', color: '#183C2B', letterSpacing: -1 },
  loginTitle: { fontSize: 28, fontWeight: '900', color: '#183C2B', marginBottom: 10 },
  description: { fontSize: 15, lineHeight: 23, fontWeight: '600', color: '#52644E', marginTop: 13, maxWidth: 360, textAlign: 'left' },
  featureList: { gap: 10, marginTop: 30 },
  featureRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.58)', borderWidth: 1, borderColor: '#D6C99D', borderRadius: 14, padding: 13, gap: 12 },
  featureIcon: { fontSize: 24 },
  featureText: { fontSize: 14, fontWeight: '800', color: '#344A38' },
  primaryButton: { height: 56, maxWidth: 430, width: '100%', alignSelf: 'center', marginBottom: 24, borderRadius: 14, backgroundColor: '#2D6A4F', borderWidth: 3, borderColor: '#1B4332', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  primaryButtonText: { fontSize: 17, fontWeight: '900', color: '#FFFBE8' },
  googleButton: { width: '100%', height: 56, marginTop: 32, borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: '#D7D2BC', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  disabledButton: { opacity: 0.6 },
  googleMark: { fontSize: 21, fontWeight: '900', color: '#4285F4' },
  googleButtonText: { fontSize: 16, fontWeight: '800', color: '#334155' },
  appleButton: { width: '100%', height: 56, marginTop: 12, borderRadius: 14, backgroundColor: '#111111', borderWidth: 2, borderColor: '#111111', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  appleButtonText: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  kakaoButton: { width: '100%', height: 56, marginTop: 12, borderRadius: 14, backgroundColor: '#FEE500', borderWidth: 2, borderColor: '#E6CF00', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  kakaoMark: { fontSize: 17, fontWeight: '900', color: '#191919' },
  kakaoButtonText: { fontSize: 16, fontWeight: '800', color: '#191919' },
  pendingRow: { flexDirection: 'row', gap: 8, marginTop: 15 },
  pendingPill: { backgroundColor: '#E7DFC2', borderRadius: 20, paddingHorizontal: 13, paddingVertical: 7 },
  pendingText: { color: '#786C4A', fontSize: 11, fontWeight: '800' },
  replayText: { marginTop: 18, color: '#2D6A4F', fontSize: 12, fontWeight: '800', textDecorationLine: 'underline' },
  terms: { marginTop: 22, color: '#7C795F', fontSize: 11, lineHeight: 17, textAlign: 'center', maxWidth: 310 },
});
