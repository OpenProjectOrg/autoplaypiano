import React, { useState } from "react";
import { UserProfile } from "../lib/types";
import { useTranslation } from "../i18n";
import {
  updateUserProfile,
  updateUserPassword,
  toggleMFA,
} from "../lib/local-db";
import {
  Shield,
  Key,
  Lock,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  CreditCard,
  Copy,
  Check,
} from "lucide-react";
import {
  Box,
  SimpleGrid,
  Paper,
  Title,
  Text,
  TextInput,
  PasswordInput,
  Button,
  Group,
  Stack,
  Alert,
  Avatar,
  Badge,
  ActionIcon,
  Tooltip,
  Code,
  Switch,
} from "@mantine/core";

interface ProfileViewProps {
  user: UserProfile | null;
  onUserUpdated: (user: UserProfile) => void;
  onOpenPricing?: () => void;
  onOpenAuth: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  onUserUpdated,
  onOpenAuth,
}) => {
  const { t } = useTranslation();

  if (!user) {
    return (
      <Box p="xl" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 400 }}>
        <Paper p="xl" radius="lg" withBorder style={{ textAlign: "center", maxWidth: 440, backgroundColor: "var(--surface-card)" }}>
          <Shield size={48} color="#cc785c" style={{ margin: "0 auto 12px" }} />
          <Title order={3} mb="xs" fw={700}>
            {t("profile.loginRequiredTitle")}
          </Title>
          <Text size="sm" c="dimmed" mb="lg">
            {t("profile.loginRequiredDesc")}
          </Text>
          <Button color="coral" onClick={onOpenAuth} fullWidth>
            {t("profile.loginRequiredButton")}
          </Button>
        </Paper>
      </Box>
    );
  }

  // Edit Profile State
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || "");
  const [profileMsg, setProfileMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Update Password State
  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [passMsg, setPassMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [passLoading, setPassLoading] = useState(false);

  // MFA State
  const [mfaEnabled, setMfaEnabled] = useState(user.mfaEnabled);
  const [mfaMethod] = useState<"authenticator" | "sms">(user.mfaMethod || "authenticator");
  const [mfaStep, setMfaStep] = useState<"idle" | "verify">("idle");
  const [mfaCode, setMfaCode] = useState("");
  const [mfaSecret] = useState("JBSWY3DPEHPK3PXP");
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [mfaMsg, setMfaMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Handle Edit Profile Save
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg(null);
    setProfileLoading(true);
    try {
      const updated = await updateUserProfile(user.id, {
        name: name.trim(),
        email: email.trim(),
        avatarUrl: avatarUrl.trim(),
      });
      onUserUpdated(updated);
      setProfileMsg({ type: "success", text: "Profil Anda berhasil diperbarui!" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setProfileMsg({ type: "error", text: msg });
    } finally {
      setProfileLoading(false);
    }
  };

  // Handle Password Update
  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassMsg(null);
    if (newPass.length < 6) {
      setPassMsg({ type: "error", text: "Password baru minimal 6 karakter." });
      return;
    }
    if (newPass !== confirmPass) {
      setPassMsg({ type: "error", text: "Konfirmasi password baru tidak cocok." });
      return;
    }

    setPassLoading(true);
    try {
      const res = await updateUserPassword(currentPass, newPass);
      setPassMsg({ type: "success", text: res.message });
      setCurrentPass("");
      setNewPass("");
      setConfirmPass("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setPassMsg({ type: "error", text: msg });
    } finally {
      setPassLoading(false);
    }
  };

  // Handle MFA Toggle
  const handleToggleMFA = async (enable: boolean) => {
    setMfaMsg(null);
    if (enable) {
      setMfaStep("verify");
    } else {
      const updated = await toggleMFA(false, mfaMethod);
      setMfaEnabled(false);
      setMfaStep("idle");
      onUserUpdated(updated);
      setMfaMsg({ type: "success", text: "Autentikasi dua langkah (MFA) dinonaktifkan." });
    }
  };

  const handleVerifyMFACode = async () => {
    setMfaMsg(null);
    if (mfaCode.trim().length !== 6) {
      setMfaMsg({ type: "error", text: "Masukkan 6 digit kode dari aplikasi authenticator." });
      return;
    }

    const updated = await toggleMFA(true, mfaMethod);
    setMfaEnabled(true);
    setMfaStep("idle");
    setMfaCode("");
    onUserUpdated(updated);
    setMfaMsg({ type: "success", text: "Autentikasi dua langkah (MFA) berhasil diaktifkan dengan aman!" });
  };

  const copySecretKey = () => {
    navigator.clipboard.writeText(mfaSecret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  return (
    <Box p="lg" style={{ maxWidth: 1100, margin: "0 auto" }}>
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
        {/* Left Column: Account Information & Password */}
        <Stack gap="lg">
          {/* Card 1: Account Information */}
          <Paper p="lg" radius="lg" withBorder style={{ backgroundColor: "var(--surface-card)" }}>
            <Group gap="sm" mb="md">
              <Avatar src={avatarUrl || user.avatarUrl} radius="xl" size="lg" color="coral">
                {name.charAt(0).toUpperCase()}
              </Avatar>
              <Box>
                <Title order={4} fw={700}>
                  {t("profile.editProfileTitle")}
                </Title>
                <Text size="xs" c="dimmed">
                  {t("profile.accountInfoSubtitle")}
                </Text>
              </Box>
            </Group>

            <form onSubmit={handleSaveProfile}>
              <Stack gap="sm">
                <TextInput
                  label={t("profile.fullNameLabel")}
                  value={name}
                  onChange={(e) => setName(e.currentTarget.value)}
                  required
                />

                <TextInput
                  label={t("profile.emailLabel")}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.currentTarget.value)}
                  required
                />

                <TextInput
                  label={t("profile.avatarUrlLabel")}
                  placeholder="https://..."
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.currentTarget.value)}
                />

                {profileMsg && (
                  <Alert
                    icon={profileMsg.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                    color={profileMsg.type === "success" ? "teal" : "red"}
                    variant="light"
                  >
                    {profileMsg.text}
                  </Alert>
                )}

                <Button type="submit" color="coral" loading={profileLoading} mt="xs">
                  {t("profile.saveProfileButton")}
                </Button>
              </Stack>
            </form>
          </Paper>

          {/* Card 2: Password Security */}
          <Paper p="lg" radius="lg" withBorder style={{ backgroundColor: "var(--surface-card)" }}>
            <Group gap="xs" mb="md">
              <Key size={18} color="#cc785c" />
              <Title order={4} fw={700}>
                {t("profile.changePasswordTitle")}
              </Title>
            </Group>

            <form onSubmit={handleSavePassword}>
              <Stack gap="sm">
                <PasswordInput
                  label={t("profile.currentPasswordLabel")}
                  placeholder="••••••••"
                  leftSection={<Lock size={16} />}
                  leftSectionPointerEvents="none"
                  value={currentPass}
                  onChange={(e) => setCurrentPass(e.currentTarget.value)}
                  required
                />

                <Group grow>
                  <PasswordInput
                    label={t("profile.newPasswordLabel")}
                    placeholder="••••••••"
                    leftSection={<Lock size={16} />}
                    leftSectionPointerEvents="none"
                    value={newPass}
                    onChange={(e) => setNewPass(e.currentTarget.value)}
                    required
                  />
                  <PasswordInput
                    label={t("profile.confirmPasswordLabel")}
                    placeholder="••••••••"
                    leftSection={<Lock size={16} />}
                    leftSectionPointerEvents="none"
                    value={confirmPass}
                    onChange={(e) => setConfirmPass(e.currentTarget.value)}
                    required
                  />
                </Group>

                {passMsg && (
                  <Alert
                    icon={passMsg.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                    color={passMsg.type === "success" ? "teal" : "red"}
                    variant="light"
                  >
                    {passMsg.text}
                  </Alert>
                )}

                <Button type="submit" variant="default" loading={passLoading} mt="xs">
                  {t("profile.savePasswordButton")}
                </Button>
              </Stack>
            </form>
          </Paper>
        </Stack>

        {/* Right Column: MFA & Plan Status */}
        <Stack gap="lg">
          {/* Card 3: Multi-Factor Authentication */}
          <Paper p="lg" radius="lg" withBorder style={{ backgroundColor: "var(--surface-card)" }}>
            <Group justify="space-between" mb="xs">
              <Group gap="xs">
                <Smartphone size={18} color="#cc785c" />
                <Title order={4} fw={700}>
                  {t("profile.mfaTitle")}
                </Title>
              </Group>
              <Switch
                checked={mfaEnabled || mfaStep === "verify"}
                onChange={(e) => handleToggleMFA(e.currentTarget.checked)}
                color="teal"
              />
            </Group>

            <Text size="xs" c="dimmed" mb="md">
              {mfaEnabled
                ? t("profile.mfaActiveDesc")
                : t("profile.mfaInactiveDesc")}
            </Text>

            {mfaStep === "verify" && (
              <Paper p="sm" radius="md" withBorder mb="sm" style={{ backgroundColor: "var(--surface-soft)" }}>
                <Text size="xs" mb={4}>
                  {t("profile.mfaStep1")}
                </Text>
                <Text size="xs" mb="xs">
                  {t("profile.mfaStep2")}
                </Text>

                <Group gap="xs" mb="sm">
                  <Code fw={700} fz="sm">
                    {mfaSecret}
                  </Code>
                  <Tooltip label={copiedSecret ? t("profile.secretCopied") : t("profile.copySecret")} withArrow>
                    <ActionIcon variant="light" color={copiedSecret ? "teal" : "gray"} onClick={copySecretKey}>
                      {copiedSecret ? <Check size={14} /> : <Copy size={14} />}
                    </ActionIcon>
                  </Tooltip>
                </Group>

                <Text size="xs" mb={4}>
                  {t("profile.mfaStep3")}
                </Text>
                <Group gap="xs">
                  <TextInput
                    placeholder="123456"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.currentTarget.value.replace(/\D/g, ""))}
                    maxLength={6}
                    style={{ flex: 1 }}
                  />
                  <Button color="coral" onClick={handleVerifyMFACode}>
                    {t("profile.mfaVerifyButton")}
                  </Button>
                </Group>
              </Paper>
            )}

            {mfaMsg && (
              <Alert
                icon={mfaMsg.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                color={mfaMsg.type === "success" ? "teal" : "red"}
                variant="light"
              >
                {mfaMsg.text}
              </Alert>
            )}
          </Paper>

          {/* Card 4: Open Source Status */}
          <Paper p="lg" radius="lg" withBorder style={{ backgroundColor: "var(--surface-card)" }}>
            <Group justify="space-between" mb="xs">
              <Group gap="xs">
                <CreditCard size={18} color="#cc785c" />
                <Title order={4} fw={700}>
                  {t("profile.statusCardTitle")}
                </Title>
              </Group>
              <Badge color="coral" variant="filled" leftSection={<Sparkles size={12} />}>
                {t("common.openSource").toUpperCase()}
              </Badge>
            </Group>

            <Text size="xs" c="dimmed" mb="md">
              {t("profile.statusCardDesc")}
            </Text>
          </Paper>
        </Stack>
      </SimpleGrid>
    </Box>
  );
};
