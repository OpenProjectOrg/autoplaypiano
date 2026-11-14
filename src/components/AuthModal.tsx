import React, { useState } from "react";
import {
  Modal,
  TextInput,
  PasswordInput,
  Button,
  SegmentedControl,
  Stack,
  Group,
  Text,
  Title,
  Alert,
  Anchor,
  Box,
  ThemeIcon,
} from "@mantine/core";
import {
  User,
  Mail,
  Lock,
  LogIn,
  UserPlus,
  AlertCircle,
  KeyRound,
  CheckCircle2,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import {
  loginUser,
  registerUser,
  requestPasswordReset,
  resetPasswordWithCode,
} from "../lib/local-db";
import { UserProfile } from "../lib/types";
import { useTranslation } from "../i18n";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserProfile) => void;
  isMandatory?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  isMandatory = false,
}) => {
  const { t } = useTranslation();
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Forgot password state
  const [resetStep, setResetStep] = useState<"request" | "verify">("request");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const cleanEmail = email.trim();
      if (!cleanEmail.includes("@") || !cleanEmail.includes(".")) {
        throw new Error(
          "Gunakan format alamat email yang valid (contoh: nama@email.com). Kolom ini tidak boleh diisi nama saja."
        );
      }

      if (mode === "register") {
        if (!name.trim()) throw new Error("Nama lengkap wajib diisi");
        if (password.length < 6) throw new Error("Password minimal 6 karakter");
        const user = await registerUser(cleanEmail, password, name);
        onSuccess(user);
        onClose();
      } else if (mode === "login") {
        const user = await loginUser(cleanEmail, password);
        onSuccess(user);
        onClose();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan saat autentikasi";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (resetStep === "request") {
        if (!email.trim()) throw new Error("Masukkan email Anda");
        const res = await requestPasswordReset(email);
        setResetStep("verify");
        setSuccessMsg(`Kode reset telah dikirim! Gunakan kode verifikasi: ${res.resetCode}`);
      } else {
        if (!resetCode.trim()) throw new Error("Masukkan 6 digit kode reset");
        if (newPassword.length < 6) throw new Error("Password baru minimal 6 karakter");
        const res = await resetPasswordWithCode(email, resetCode, newPassword);
        setSuccessMsg(res.message);
        setTimeout(() => {
          setMode("login");
          setResetStep("request");
          setResetCode("");
          setNewPassword("");
        }, 1500);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal reset password";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const modalTitle = (
    <Group justify="space-between" align="center" style={{ width: "100%" }} wrap="nowrap">
      <Group gap="xs">
        <ThemeIcon color="coral" variant="light" size="lg" radius="md">
          <Sparkles size={18} />
        </ThemeIcon>
        <Box>
          <Title order={4} fw={700}>
            {mode === "login"
              ? t("auth.loginTitle")
              : mode === "register"
              ? t("auth.registerTitle")
              : t("auth.forgotTitle")}
          </Title>
          <Text size="xs" c="dimmed">
            {mode === "login"
              ? t("auth.loginSubtitle")
              : mode === "register"
              ? t("auth.registerSubtitle")
              : t("auth.forgotSubtitle")}
          </Text>
        </Box>
      </Group>
    </Group>
  );

  return (
    <Modal
      opened={isOpen}
      onClose={() => {
        if (!isMandatory) onClose();
      }}
      withCloseButton={!isMandatory}
      closeOnClickOutside={!isMandatory}
      closeOnEscape={!isMandatory}
      title={modalTitle}
      size="md"
      padding="lg"
      styles={{
        content: {
          backgroundColor: "var(--canvas)",
          border: "1px solid var(--hairline)",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.12)",
        },
        header: {
          backgroundColor: "var(--canvas)",
          borderBottom: "1px solid var(--hairline)",
          paddingBottom: "12px",
        },
      }}
    >
      {mode === "forgot" ? (
        <form onSubmit={handleForgotSubmit}>
          <Stack gap="md" mt="sm">
            <TextInput
              label="Alamat Email Terdaftar"
              placeholder="nama@email.com"
              leftSection={<Mail size={16} />}
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
              required
              disabled={resetStep === "verify"}
            />

            {resetStep === "verify" && (
              <>
                <TextInput
                  label="Kode Verifikasi 6-Digit"
                  placeholder="123456"
                  leftSection={<KeyRound size={16} />}
                  value={resetCode}
                  onChange={(e) => setResetCode(e.currentTarget.value)}
                  required
                  styles={{
                    input: {
                      fontFamily: "var(--font-mono)",
                      letterSpacing: "4px",
                      textAlign: "center",
                      fontWeight: 600,
                    },
                  }}
                />

                <PasswordInput
                  label="Kata Sandi Baru"
                  description="Minimal 6 karakter"
                  placeholder="••••••••"
                  leftSection={<Lock size={16} />}
                  leftSectionPointerEvents="none"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.currentTarget.value)}
                  required
                />
              </>
            )}

            {error && (
              <Alert icon={<AlertCircle size={16} />} color="red" variant="light" title="Perhatian">
                {error}
              </Alert>
            )}

            {successMsg && (
              <Alert icon={<CheckCircle2 size={16} />} color="teal" variant="light" title="Berhasil">
                {successMsg}
              </Alert>
            )}

            <Group grow pt="xs">
              <Button
                variant="default"
                leftSection={<ArrowLeft size={16} />}
                onClick={() => {
                  setMode("login");
                  setResetStep("request");
                }}
              >
                {t("common.back")}
              </Button>
              <Button type="submit" color="coral" loading={loading}>
                {resetStep === "request" ? t("auth.sendResetCodeButton") : t("auth.resetPasswordButton")}
              </Button>
            </Group>
          </Stack>
        </form>
      ) : (
        <Stack gap="md" mt="xs">
          {/* Mantine Segmented Control for Switch Mode */}
          <SegmentedControl
            value={mode}
            onChange={(val) => {
              setMode(val as "login" | "register");
              setError(null);
            }}
            data={[
              { label: t("auth.signInButton"), value: "login" },
              { label: t("auth.registerButton"), value: "register" },
            ]}
            color="coral"
            fullWidth
            radius="md"
            styles={{
              root: {
                backgroundColor: "var(--surface-cream-strong)",
                border: "1px solid var(--hairline)",
              },
            }}
          />

          <form onSubmit={handleSubmit}>
            <Stack gap="sm">
              {mode === "register" && (
                <TextInput
                  label={t("auth.nameLabel")}
                  placeholder={t("auth.namePlaceholder")}
                  leftSection={<User size={16} />}
                  leftSectionPointerEvents="none"
                  value={name}
                  onChange={(e) => setName(e.currentTarget.value)}
                  required
                />
              )}

              <TextInput
                type="email"
                label={t("auth.emailLabel")}
                placeholder={t("auth.emailPlaceholder")}
                leftSection={<Mail size={16} />}
                leftSectionPointerEvents="none"
                value={email}
                onChange={(e) => setEmail(e.currentTarget.value)}
                required
              />

              <Box>
                <Group justify="space-between" mb={4}>
                  <Text size="sm" fw={500}>
                    {t("auth.passwordLabel")}
                  </Text>
                  {mode === "login" && (
                    <Anchor
                      component="button"
                      type="button"
                      size="xs"
                      c="coral.6"
                      onClick={() => setMode("forgot")}
                    >
                      {t("auth.forgotPasswordLink")}
                    </Anchor>
                  )}
                </Group>
                <PasswordInput
                  placeholder="••••••••"
                  leftSection={<Lock size={16} />}
                  leftSectionPointerEvents="none"
                  value={password}
                  onChange={(e) => setPassword(e.currentTarget.value)}
                  required
                />
              </Box>

              {error && (
                <Alert icon={<AlertCircle size={16} />} color="red" variant="light" title={t("common.error")}>
                  {error}
                </Alert>
              )}

              <Button
                type="submit"
                color="coral"
                fullWidth
                size="md"
                mt="xs"
                loading={loading}
                leftSection={mode === "login" ? <LogIn size={18} /> : <UserPlus size={18} />}
              >
                {mode === "login" ? t("auth.signInButton") : t("auth.registerButton")}
              </Button>
            </Stack>
          </form>

          <Text size="xs" ta="center" c="dimmed">
            {mode === "login" ? (
              <>
                {t("auth.noAccountPrompt")}{" "}
                <Anchor component="button" size="xs" c="coral.6" fw={600} onClick={() => setMode("register")}>
                  {t("auth.registerButton")}
                </Anchor>
              </>
            ) : (
              <>
                {t("auth.hasAccountPrompt")}{" "}
                <Anchor component="button" size="xs" c="coral.6" fw={600} onClick={() => setMode("login")}>
                  {t("auth.signInButton")}
                </Anchor>
              </>
            )}
          </Text>
        </Stack>
      )}
    </Modal>
  );
};
