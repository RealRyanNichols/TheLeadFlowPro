/** Curated public founder evidence. A dead historical video is never exposed as a working player. */
export const RYAN_PROOF = {
  warehouseImage: "/images/ryan-wholesale-universe-owner.jpg",
  foundedYear: "2015",
  wholesaleSource: "https://amzsummits.com/sessions/sourcing-scaling-the-wholesale-dream/",
  ellen: {
    dateLabel: "September 2018",
    title: "Ryan’s appearance on The Ellen Show",
    context: "Recognized for his volunteer rescue work during Hurricane Florence.",
    coverageUrl: "https://www.kltv.com/2018/09/28/man-who-rescued-people-animals-hurricane-honored-ellen/",
    // The original Ellen/Facebook publication is unavailable. Await a verified original.
    video: null as null | { src: string; poster: string; duration: string },
  },
} as const;
