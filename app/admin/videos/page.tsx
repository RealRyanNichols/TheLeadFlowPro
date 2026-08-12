import VideoStudio from "./VideoStudio";

export const metadata = { title: "AI Video Studio | The LeadFlow Pro" };

export default function AdminVideos() {
  return (
    <div>
      <p className="mb-6 text-[var(--muted)]">
        Prompt in, video out. Write the script, pick an avatar and a voice, and
        HeyGen renders a talking-head tutorial or explainer you can post
        anywhere. Ads, course lessons, client explainers — no camera, no
        editing bay.
      </p>
      <VideoStudio />
    </div>
  );
}
