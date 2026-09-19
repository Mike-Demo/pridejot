import { WaIcon, WaTag } from "@/design-system/font-awsome-web-awesome-171158";

export function PrivacyBadge() {
  return (
    <WaTag variant="neutral" size="s" pill>
      <WaIcon slot="start" name="shield-halved" aria-hidden="true" />
      No analytics, no tracking
    </WaTag>
  );
}
