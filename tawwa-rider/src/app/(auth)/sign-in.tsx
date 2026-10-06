import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StatusScreen } from '@/components/rider/StatusScreen';
import { AppText } from '@/components/ui/AppText';
import { BrandMark } from '@/components/ui/BrandMark';
import { Icon } from '@/components/ui/Icon';
import { OperationalButton } from '@/components/ui/OperationalButton';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useAuth } from '@/features/auth/AuthProvider';
import {
  isValidEmail,
  isValidOtp,
  normalizePhone,
  sendPhoneOtp,
  signInWithEmail,
  verifyPhoneOtp,
} from '@/features/auth/signIn';
import { useI18n, type Language, type TranslationKey } from '@/i18n';
import { colors, radius, spacing, touchTarget } from '@/theme/tokens';

type Method = 'phone' | 'email';

export default function SignInScreen() {
  const { t, language, setLanguage } = useI18n();
  const { status } = useAuth();
  const [method, setMethod] = useState<Method>('phone');
  const [phone, setPhone] = useState('');
  const [otpSentTo, setOtpSentTo] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<TranslationKey | null>(null);

  if (status === 'config_missing') {
    return <StatusScreen icon="settings-outline" tone="danger" title={t('config.missing.title')} body={t('config.missing.body')} />;
  }

  const run = async (validate: () => TranslationKey | null, action: () => Promise<void>) => {
    const invalid = validate();
    if (invalid) {
      setError(invalid);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await action();
    } catch {
      setError('auth.error.generic');
    } finally {
      setBusy(false);
    }
  };

  const onSendOtp = () => {
    const normalized = normalizePhone(phone);
    void run(
      () => (normalized ? null : 'auth.error.invalidPhone'),
      async () => {
        if (!normalized) return;
        await sendPhoneOtp(normalized);
        setOtpSentTo(normalized);
      },
    );
  };

  const onVerify = () =>
    void run(
      () => (isValidOtp(otp) ? null : 'auth.error.invalidOtp'),
      () => (otpSentTo ? verifyPhoneOtp(otpSentTo, otp) : Promise.resolve()),
    );

  const onEmail = () =>
    void run(
      () => (isValidEmail(email) && password.length > 0 ? null : 'auth.error.invalidEmail'),
      () => signInWithEmail(email, password),
    );

  const otherLanguage: Language = language === 'ar' ? 'en' : 'ar';

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Pressable
            accessibilityRole="button"
            onPress={() => void setLanguage(otherLanguage)}
            style={styles.langSwitch}
            hitSlop={8}
          >
            <Icon name="language-outline" size={18} color={colors.primary} />
            <AppText variant="caption" tone="primary">
              {otherLanguage === 'ar' ? 'العربية' : 'English'}
            </AppText>
          </Pressable>

          <View style={styles.brand}>
            <BrandMark />
            <AppText variant="display" tone="primary" center>
              {t('app.name')}
            </AppText>
            <AppText variant="heading" center>
              {t('auth.title')}
            </AppText>
            <AppText tone="muted" center>
              {t('auth.subtitle')}
            </AppText>
          </View>

          <SegmentedControl
            value={method}
            onChange={(m) => {
              setMethod(m);
              setError(null);
            }}
            options={[
              { value: 'phone', label: t('auth.method.phone') },
              { value: 'email', label: t('auth.method.email') },
            ]}
          />

          {method === 'phone' && !otpSentTo ? (
            <View style={styles.form}>
              <Field label={t('auth.phone.label')}>
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  placeholder={t('auth.phone.placeholder')}
                  placeholderTextColor={colors.textMuted}
                  keyboardType="phone-pad"
                  autoComplete="tel"
                  textContentType="telephoneNumber"
                  style={[styles.input, styles.ltrInput]}
                />
              </Field>
              <OperationalButton label={t('auth.phone.send')} onPress={onSendOtp} loading={busy} size="large" />
            </View>
          ) : null}

          {method === 'phone' && otpSentTo ? (
            <View style={styles.form}>
              <AppText tone="muted">{t('auth.otp.hint', { phone: otpSentTo })}</AppText>
              <Field label={t('auth.otp.label')}>
                <TextInput
                  value={otp}
                  onChangeText={setOtp}
                  keyboardType="number-pad"
                  autoComplete="sms-otp"
                  textContentType="oneTimeCode"
                  maxLength={6}
                  style={[styles.input, styles.ltrInput, styles.otp]}
                />
              </Field>
              <OperationalButton label={t('auth.otp.verify')} onPress={onVerify} loading={busy} size="large" />
              <OperationalButton
                label={t('auth.otp.change')}
                variant="ghost"
                onPress={() => {
                  setOtpSentTo(null);
                  setOtp('');
                }}
              />
            </View>
          ) : null}

          {method === 'email' ? (
            <View style={styles.form}>
              <Field label={t('auth.email.label')}>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  style={[styles.input, styles.ltrInput]}
                />
              </Field>
              <Field label={t('auth.password.label')}>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoComplete="password"
                  style={[styles.input, styles.ltrInput]}
                />
              </Field>
              <OperationalButton label={t('auth.email.submit')} onPress={onEmail} loading={busy} size="large" />
            </View>
          ) : null}

          {error ? (
            <AppText tone="danger" accessibilityRole="alert">
              {t(error)}
            </AppText>
          ) : null}

          <AppText variant="caption" tone="muted" center>
            {t('auth.noSignup')}
          </AppText>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <AppText variant="caption" tone="muted">
        {label}
      </AppText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { padding: spacing.xl, gap: spacing.xl, paddingBottom: spacing.xxxl },
  langSwitch: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, alignSelf: 'flex-end' },
  brand: { alignItems: 'center', gap: spacing.sm, marginTop: spacing.lg },
  form: { gap: spacing.lg },
  field: { gap: spacing.xs },
  input: {
    minHeight: touchTarget.primary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    fontSize: 18,
    color: colors.text,
  },
  /** Phone numbers, emails and codes are always entered left-to-right. */
  ltrInput: { writingDirection: 'ltr', textAlign: 'left' },
  otp: { letterSpacing: 8, fontSize: 24, textAlign: 'center' },
});
