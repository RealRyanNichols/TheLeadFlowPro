import { Instagram, Music2, Facebook, Youtube, Twitter, Linkedin, Globe } from "lucide-react";

const MAP: Record<string, { Icon: any; bg: string }> = {
  instagram: { Icon: Instagram, bg: "from-pink-500 to-orange-500" },
  tiktok:    { Icon: Music2,    bg: "from-black to-cyan-400"   },
  facebook:  { Icon: Facebook,  bg: "from-blue-600 to-blue-800" },
  youtube:   { Icon: Youtube,   bg: "from-red-500 to-red-700"   },
  x:         { Icon: Twitter,   bg: "from-ink-700 to-black"     },
  linkedin:  { Icon: Linkedin,  bg: "from-blue-500 to-blue-800" },
  website:   { Icon: Globe,     bg: "from-cyan-500 to-brand-600"}
};

export function SocialIcon({ platform, className = "h-5 w-5" }: { platform: string; className?: string }) {
  const { Icon } = MAP[platform] ?? MAP.website;
  return <Icon className={className} />;
}

export function socialBg(platform: string) {
  return (MAP[platform] ?? MAP.website).bg;
}
