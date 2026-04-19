// Thin wrapper around @capacitor/haptics.
// Silently no-ops on web and when permissions are unavailable.
// Import HapticsPlugin lazily so the bundle doesn't fail on web builds.

async function runHaptic(fn: () => Promise<void>) {
  try {
    await fn();
  } catch {
    // Not a native platform or permission denied — ignore silently.
  }
}

export function hapticLight(): void {
  void runHaptic(async () => {
    const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
    await Haptics.impact({ style: ImpactStyle.Light });
  });
}

export function hapticMedium(): void {
  void runHaptic(async () => {
    const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
    await Haptics.impact({ style: ImpactStyle.Medium });
  });
}

export function hapticSuccess(): void {
  void runHaptic(async () => {
    const { Haptics, NotificationType } = await import("@capacitor/haptics");
    await Haptics.notification({ type: NotificationType.Success });
  });
}

export function hapticError(): void {
  void runHaptic(async () => {
    const { Haptics, NotificationType } = await import("@capacitor/haptics");
    await Haptics.notification({ type: NotificationType.Error });
  });
}
