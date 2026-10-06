import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { Image, Linking, Pressable, StyleSheet, View } from 'react-native';

import { BackendPendingBanner } from '@/components/rider/BackendPendingBanner';
import { VehicleBadge } from '@/components/rider/VehicleBadge';
import { ZoneBadge } from '@/components/rider/ZoneBadge';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { Icon, type IconName } from '@/components/ui/Icon';
import { OperationalButton } from '@/components/ui/OperationalButton';
import { Pill, type PillTone } from '@/components/ui/Pill';
import { Screen } from '@/components/ui/Screen';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useAuth } from '@/features/auth/AuthProvider';
import { callPhone } from '@/features/maps/openNavigation';
import { useRider } from '@/features/rider/RiderProvider';
import { useI18n, type Language, type TranslationKey } from '@/i18n';
import { env } from '@/lib/env';
import type { RiderApprovalStatus } from '@/services/rider/types';
import { colors, radius, spacing, touchTarget } from '@/theme/tokens';

const approvalCopy: Record<RiderApprovalStatus, { label: TranslationKey; tone: PillTone }> = {
  pending_approval: { label: 'approval.pending_approval', tone: 'warning' },
  approved: { label: 'approval.approved', tone: 'success' },
  rejected: { label: 'approval.rejected', tone: 'danger' },
  suspended: { label: 'approval.suspended', tone: 'danger' },
  inactive: { label: 'approval.inactive', tone: 'neutral' },
};

function LinkRow({ icon, label, detail, onPress }: { icon: IconName; label: string; detail?: string; onPress?: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.linkRow, pressed && styles.pressed, !onPress && styles.disabled]}
    >
      <Icon name={icon} size={22} color={colors.primary} />
      <View style={styles.flex}>
        <AppText variant="bodyStrong">{label}</AppText>
        {detail ? (
          <AppText variant="caption" tone="muted">
            {detail}
          </AppText>
        ) : null}
      </View>
      {onPress ? <Icon name="chevron-forward" size={18} color={colors.textMuted} directional /> : null}
    </Pressable>
  );
}

export default function AccountScreen() {
  const { t, language, setLanguage } = useI18n();
  const { session, signOut } = useAuth();
  const { context, backendPending } = useRider();

  const version = Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? '—';
  const build = Application.nativeBuildVersion;
  const approval = context ? approvalCopy[context.approval_status] : null;
  const phone = context?.phone ?? session?.user.phone ?? null;
  const email = session?.user.email ?? null;
  const { supportPhone, termsUrl, privacyUrl } = env;

  return (
    <Screen>
      <AppText variant="title">{t('account.title')}</AppText>
      {backendPending ? <BackendPendingBanner /> : null}

      <Card>
        <View style={styles.profile}>
          {context?.avatar_url ? (
            <Image source={{ uri: context.avatar_url }} style={styles.avatar} accessibilityIgnoresInvertColors />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Icon name="person" size={32} color={colors.primary} />
            </View>
          )}
          <View style={styles.flex}>
            <AppText variant="heading">{context?.full_name ?? t('common.notAvailable')}</AppText>
            {phone ? (
              <AppText tone="muted" style={styles.ltr}>
                {phone}
              </AppText>
            ) : null}
            {email ? (
              <AppText variant="caption" tone="muted" style={styles.ltr}>
                {email}
              </AppText>
            ) : null}
          </View>
        </View>
        <View style={styles.row}>
          <AppText variant="caption" tone="muted" style={styles.flex}>
            {t('account.approval')}
          </AppText>
          <Pill label={approval ? t(approval.label) : t('approval.unknown')} tone={approval?.tone ?? 'neutral'} />
        </View>
        <View style={styles.row}>
          <AppText variant="caption" tone="muted" style={styles.flex}>
            {t('account.availability')}
          </AppText>
          <Pill
            label={context ? t(context.is_online ? 'status.online' : 'status.offline') : t('common.notAvailable')}
            tone={context?.is_online ? 'success' : 'neutral'}
          />
        </View>
      </Card>

      <Card>
        <AppText variant="heading">{t('account.operational')}</AppText>
        <View style={styles.row}>
          <AppText variant="caption" tone="muted" style={styles.flex}>
            {t('home.zone')}
          </AppText>
          <ZoneBadge zone={context?.zone ?? null} />
        </View>
        <View style={styles.row}>
          <AppText variant="caption" tone="muted" style={styles.flex}>
            {t('home.vehicle')}
          </AppText>
          <VehicleBadge vehicle={context?.vehicle_type ?? null} />
        </View>
        <AppText variant="caption" tone="muted">
          {t('account.operationalNote')}
        </AppText>
      </Card>

      <Card>
        <AppText variant="heading">{t('account.language')}</AppText>
        <SegmentedControl<Language>
          value={language}
          onChange={(next) => void setLanguage(next)}
          options={[
            { value: 'ar', label: 'العربية' },
            { value: 'en', label: 'English' },
          ]}
        />
        <AppText variant="caption" tone="muted">
          {t('account.language.restart')}
        </AppText>
      </Card>

      <Card>
        <LinkRow
          icon="headset-outline"
          label={t('account.support')}
          detail={supportPhone ?? t('account.supportUnavailable')}
          onPress={supportPhone ? () => void callPhone(supportPhone) : undefined}
        />
        <LinkRow
          icon="document-text-outline"
          label={t('account.terms')}
          onPress={termsUrl ? () => void Linking.openURL(termsUrl) : undefined}
        />
        <LinkRow
          icon="shield-checkmark-outline"
          label={t('account.privacy')}
          onPress={privacyUrl ? () => void Linking.openURL(privacyUrl) : undefined}
        />
        <LinkRow icon="information-circle-outline" label={t('account.version')} detail={build ? `${version} (${build})` : version} />
      </Card>

      <OperationalButton label={t('common.signOut')} icon="log-out-outline" variant="danger" onPress={() => void signOut()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  profile: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  avatar: { width: 64, height: 64, borderRadius: radius.pill },
  avatarFallback: { backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  ltr: { writingDirection: 'ltr' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: touchTarget.min },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.7 },
});
