import {
  type Tool,
  num,
  str,
  list,
  money,
  count,
  clean,
  telDigits,
  prettyPhone,
  normUrl,
  slugify,
} from "./types";

/* Generators. Put your details in, get something you can copy, paste, print or download. */

export const GENERATOR_TOOLS: Tool[] = [
  {
    slug: "qr-code-maker",
    name: "QR Code Maker",
    emoji: "🔳",
    category: "Generators",
    tagline: "Any link, printable in ten seconds",
    description:
      "Make a QR code for your website, booking page, menu, review link, payment page or anything else. Free, no watermark, no account.",
    who: "Anybody who prints anything: signs, trucks, flyers, menus, invoices, business cards.",
    problem:
      "QR code sites make you sign up, then hold your code hostage behind a subscription that can turn it off.",
    payoff: "A code you save once and print forever.",
    steps: [
      "Paste the link you want the code to open.",
      "Right-click or long-press the code and save the image.",
      "Print it at least one inch across. Bigger for anything read from a distance.",
      "Scan it yourself before you print a thousand of them.",
    ],
    faqs: [
      { q: "Will this code expire?", a: "No. It points straight at your link. There is no redirect in the middle that anyone can shut off. If your link stays alive, the code works forever." },
      { q: "How big should I print it?", a: "One inch minimum for something held in a hand. For a truck or a yard sign, a rough rule is one inch of code for every ten feet of scanning distance." },
    ],
    featured: true,
    embedHeight: 720,
    fields: [
      { id: "url", label: "Link the code should open", type: "text", def: "", placeholder: "yourbusiness.com/book" },
      { id: "label", label: "Text under the code", type: "text", def: "", placeholder: "Scan to book" },
      { id: "size", label: "Image size in pixels", type: "slider", min: 200, max: 1000, step: 20, def: 400 },
    ],
    run: (v) => {
      const url = normUrl(str(v, "url"));
      if (!url) return { note: "Paste a link above and your QR code appears here, ready to save." };
      return {
        qr: { data: url, caption: str(v, "label").trim() || "Scan me", size: num(v, "size") },
        output: { title: "The link this code opens", text: url, filename: "qr-link.txt", mono: true },
        verdict: { tone: "good", text: "Scan it with your own phone before you print it. Every time. It takes five seconds and it has saved a lot of people a reprint bill." },
      };
    },
  },

  {
    slug: "wifi-qr-code",
    name: "Wi-Fi QR Code Generator",
    short: "Wi-Fi QR",
    emoji: "📶",
    category: "Generators",
    tagline: "Stop reading your password out loud",
    description:
      "Print one card for the lobby. Customers scan it and join your guest network without anybody spelling a password.",
    who: "Waiting rooms, shops, restaurants, salons, offices, short-term rentals.",
    problem:
      "The password is on a sticky note behind the counter and somebody asks for it forty times a week.",
    payoff: "A scan-to-join card you print once.",
    steps: [
      "Enter the network name exactly as it appears, capitals matter.",
      "Enter the password and pick the security type.",
      "Save the code, print it, frame it, put it on the counter.",
    ],
    embedHeight: 760,
    fields: [
      { id: "ssid", label: "Network name (SSID)", type: "text", def: "", placeholder: "Shop-Guest" },
      { id: "password", label: "Password", type: "text", def: "", placeholder: "the guest password" },
      { id: "security", label: "Security type", type: "select", def: "WPA", options: [
        { value: "WPA", label: "WPA / WPA2 / WPA3 (almost always this)" },
        { value: "WEP", label: "WEP (old)" },
        { value: "nopass", label: "No password, open network" },
      ] },
      { id: "hidden", label: "Is the network hidden?", type: "select", def: "false", options: [
        { value: "false", label: "No, it broadcasts normally" },
        { value: "true", label: "Yes, it is hidden" },
      ] },
    ],
    run: (v) => {
      const ssid = str(v, "ssid").trim();
      const pass = str(v, "password");
      const sec = str(v, "security", "WPA");
      const hidden = str(v, "hidden") === "true";
      if (!ssid) return { note: "Enter your network name above to build the card." };
      const esc = (s: string) => s.replace(/([\\;,:"])/g, "\\$1");
      const payload =
        sec === "nopass"
          ? `WIFI:T:nopass;S:${esc(ssid)};${hidden ? "H:true;" : ""};`
          : `WIFI:T:${sec};S:${esc(ssid)};P:${esc(pass)};${hidden ? "H:true;" : ""};`;

      return {
        qr: { data: payload, caption: `Scan to join ${ssid}` },
        output: {
          title: "Print this card",
          text: `GUEST WI-FI\n\nNetwork: ${ssid}\n${sec === "nopass" ? "No password needed" : `Password: ${pass}`}\n\nScan the code above with your camera to join automatically.`,
          filename: "wifi-card.txt",
        },
        note: "Put your guest network on this card, not the one your point of sale and cameras run on. Most routers let you turn on a separate guest network in about two minutes.",
      };
    },
  },

  {
    slug: "digital-business-card",
    name: "Digital Business Card Maker",
    short: "Digital Card",
    emoji: "📇",
    category: "Generators",
    tagline: "They scan it, you are in their phone",
    description:
      "Build a contact card file and a QR code. One scan drops your name, number, email and website straight into their contacts. No app, no subscription.",
    who: "Anybody who hands out cards and watches them go in the trash.",
    problem:
      "Paper cards get lost. Typing your number into a stranger's phone is awkward and half the time they spell your name wrong.",
    payoff: "A .vcf file and a QR code you can put on your phone lock screen, your truck, your email, or the back of a real card.",
    steps: [
      "Fill in your details.",
      "Download the contact file and save the QR image.",
      "Put the QR on your phone's lock screen for instant handoff, and on the back of your printed cards.",
    ],
    featured: true,
    embedHeight: 900,
    fields: [
      { id: "name", label: "Your name", type: "text", def: "", placeholder: "Ryan Nichols" },
      { id: "title", label: "Title", type: "text", def: "", placeholder: "Owner" },
      { id: "company", label: "Business name", type: "text", def: "", placeholder: "The LeadFlow Pro" },
      { id: "phone", label: "Phone", type: "text", def: "", placeholder: "(903) 500-8898" },
      { id: "email", label: "Email", type: "text", def: "", placeholder: "you@yourbusiness.com" },
      { id: "website", label: "Website", type: "text", def: "", placeholder: "yourbusiness.com" },
      { id: "address", label: "Address", type: "text", def: "", placeholder: "City, State" },
      { id: "note", label: "What you do, one line", type: "text", def: "", placeholder: "Websites and lead systems for East Texas businesses" },
    ],
    run: (v) => {
      const name = str(v, "name").trim();
      const title = str(v, "title").trim();
      const company = str(v, "company").trim();
      const phone = str(v, "phone").trim();
      const email = str(v, "email").trim();
      const website = normUrl(str(v, "website"));
      const address = str(v, "address").trim();
      const note = str(v, "note").trim();
      if (!name) return { note: "Put your name in above and your card builds itself." };

      const parts = name.split(" ");
      const last = parts.length > 1 ? parts[parts.length - 1] : "";
      const first = parts.slice(0, parts.length > 1 ? -1 : 1).join(" ");

      const vcf = [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `N:${last};${first};;;`,
        `FN:${name}`,
        company ? `ORG:${company}` : "",
        title ? `TITLE:${title}` : "",
        phone ? `TEL;TYPE=CELL:${telDigits(phone) || phone}` : "",
        email ? `EMAIL;TYPE=WORK:${email}` : "",
        website ? `URL:${website}` : "",
        address ? `ADR;TYPE=WORK:;;${address};;;;` : "",
        note ? `NOTE:${note}` : "",
        "END:VCARD",
      ]
        .filter(Boolean)
        .join("\n");

      return {
        qr: { data: vcf, caption: `Scan to save ${name}` },
        output: {
          title: "Your contact card file",
          text: vcf,
          filename: `${slugify(name) || "contact"}.vcf`,
          mono: true,
        },
        verdict: { tone: "good", text: "Screenshot the QR code and set it as your phone's lock screen. Now you hand out your contact info by holding up your phone." },
        note: "Download saves a .vcf file. Email it to yourself, or AirDrop it, and it opens straight into contacts on any phone.",
      };
    },
  },

  {
    slug: "click-to-call-button",
    name: "Click-to-Call Button Builder",
    short: "Call Button",
    emoji: "☎️",
    category: "Generators",
    tagline: "One tap to your phone, on any website",
    description:
      "Generates the HTML for a tap-to-call button you can paste into any website. Works on WordPress, Wix, Squarespace, Shopify, GoDaddy, anywhere.",
    who: "Any business whose website makes people copy a phone number by hand.",
    problem:
      "A phone number that is just text on a page is a phone number nobody dials from a phone.",
    payoff: "Paste-ready code for a real button, plus a plain link version.",
    steps: [
      "Enter your number and what the button should say.",
      "Copy the code.",
      "Paste it into an HTML or embed block on your site.",
    ],
    embedHeight: 780,
    fields: [
      { id: "phone", label: "Your phone number", type: "text", def: "", placeholder: "(903) 500-8898" },
      { id: "label", label: "Button text", type: "text", def: "Call Now", placeholder: "Call Now" },
      { id: "color", label: "Button color", type: "select", def: "#2f6fff", options: [
        { value: "#2f6fff", label: "Blue" },
        { value: "#16a34a", label: "Green" },
        { value: "#dc2626", label: "Red" },
        { value: "#ea580c", label: "Orange" },
        { value: "#0f172a", label: "Near black" },
      ] },
      { id: "size", label: "Size", type: "select", def: "large", options: [
        { value: "normal", label: "Normal" },
        { value: "large", label: "Large" },
        { value: "full", label: "Full width" },
      ] },
    ],
    run: (v) => {
      const phone = str(v, "phone").trim();
      const tel = telDigits(phone);
      const label = str(v, "label").trim() || "Call Now";
      const color = str(v, "color", "#2f6fff");
      const size = str(v, "size", "large");
      if (!tel) return { note: "Enter a phone number above and the button code appears here." };

      const pad = size === "normal" ? "12px 22px" : size === "large" ? "16px 30px" : "18px 30px";
      const fs = size === "normal" ? "16px" : "18px";
      const width = size === "full" ? "display:block;width:100%;text-align:center;" : "display:inline-block;";

      const html = `<a href="tel:${tel}" style="${width}background:${color};color:#fff;font-weight:700;font-size:${fs};padding:${pad};border-radius:10px;text-decoration:none;font-family:system-ui,-apple-system,sans-serif;">📞 ${label}: ${prettyPhone(phone)}</a>`;

      return {
        output: { title: "Paste this into your website", text: html, filename: "call-button.html", mono: true },
        table: {
          title: "Other versions you might want",
          headers: ["Use it for", "Code"],
          rows: [
            ["Plain text link", `<a href="tel:${tel}">${prettyPhone(phone)}</a>`],
            ["Text me instead", `<a href="sms:${tel}">Text ${prettyPhone(phone)}</a>`],
            ["Email signature", `<a href="tel:${tel}">📞 ${prettyPhone(phone)}</a>`],
          ],
        },
        verdict: { tone: "good", text: "Put this in your header so it is visible on every page without scrolling. That one change moves more calls than a redesign." },
      };
    },
  },

  {
    slug: "sms-link-generator",
    name: "Text Message Link Generator",
    short: "Text Link",
    emoji: "💬",
    category: "Generators",
    tagline: "A link that opens a text, already written",
    description:
      "Make a link that opens the customer's messaging app with your number filled in and the message pre-written. Perfect for buttons, QR codes and ads.",
    who: "Anyone whose customers would rather text than call, which is most of them.",
    problem:
      "Texting you means saving your number, opening messages, and typing. Most people will not bother.",
    payoff: "A one-tap link that starts the conversation with the message already typed.",
    steps: [
      "Enter your number and the message you want pre-filled.",
      "Copy the link, or grab the button code, or make it a QR.",
      "Put it on your site, your ads, your yard signs and your invoices.",
    ],
    embedHeight: 800,
    fields: [
      { id: "phone", label: "Your business number", type: "text", def: "", placeholder: "(903) 500-8898" },
      { id: "message", label: "Message it should pre-fill", type: "textarea", def: "Hi, I need a quote for", rows: 3 },
      { id: "label", label: "Button text", type: "text", def: "Text Us", placeholder: "Text Us" },
    ],
    run: (v) => {
      const phone = str(v, "phone").trim();
      const tel = telDigits(phone);
      const msg = str(v, "message");
      const label = str(v, "label").trim() || "Text Us";
      if (!tel) return { note: "Enter your number above to build the link." };

      // iOS wants &body=, Android historically wanted ?body=. This form works on both modern platforms.
      const link = `sms:${tel}?&body=${encodeURIComponent(msg)}`;
      const html = `<a href="${link}" style="display:inline-block;background:#16a34a;color:#fff;font-weight:700;font-size:18px;padding:16px 30px;border-radius:10px;text-decoration:none;font-family:system-ui,sans-serif;">💬 ${label}</a>`;

      return {
        qr: { data: link, caption: "Scan to text us" },
        output: { title: "Your text link", text: link, filename: "text-link.txt", mono: true },
        table: {
          title: "Ready to paste",
          headers: ["Where", "Code"],
          rows: [
            ["Website button", html],
            ["Plain link", link],
            ["Yard sign", "Print the QR code above. People scan it and the text is already written."],
          ],
        },
        note: "Check that your business line can actually receive texts. Plenty of landlines and VOIP numbers cannot until you turn it on.",
      };
    },
  },

  {
    slug: "utm-link-builder",
    name: "UTM Link Builder",
    emoji: "🔗",
    category: "Generators",
    tagline: "Know which ad actually worked",
    description:
      "Tag your links so your analytics can tell you which post, ad, flyer or email brought the customer. Free, and it takes ten seconds.",
    who: "Anybody spending money or time on more than one marketing channel.",
    problem:
      "You run four things at once and have no idea which one produced the call. So you keep paying for all four.",
    payoff: "Tagged links that show up by name in your analytics.",
    steps: [
      "Paste the page you are sending people to.",
      "Fill in the source, medium and campaign.",
      "Use the tagged link everywhere instead of the plain one.",
    ],
    faqs: [
      { q: "What do source, medium and campaign mean?", a: "Source is where it came from: facebook, google, flyer. Medium is the type: cpc, email, print, social. Campaign is the specific push: spring-special, roof-promo. Keep them lowercase and consistent." },
    ],
    embedHeight: 820,
    fields: [
      { id: "url", label: "Page you are linking to", type: "text", def: "", placeholder: "yourbusiness.com/offer" },
      { id: "source", label: "Source (where it came from)", type: "text", def: "facebook", placeholder: "facebook" },
      { id: "medium", label: "Medium (what kind)", type: "select", def: "cpc", options: [
        { value: "cpc", label: "cpc — paid ad" },
        { value: "social", label: "social — organic post" },
        { value: "email", label: "email" },
        { value: "sms", label: "sms — text message" },
        { value: "print", label: "print — flyer, sign, mailer" },
        { value: "qr", label: "qr — QR code" },
        { value: "referral", label: "referral — partner or link" },
      ] },
      { id: "campaign", label: "Campaign name", type: "text", def: "", placeholder: "spring-special" },
      { id: "content", label: "Which version (optional)", type: "text", def: "", placeholder: "video-a" },
    ],
    run: (v) => {
      const base = normUrl(str(v, "url"));
      if (!base) return { note: "Paste a link above to build your tagged version." };
      const p = new URLSearchParams();
      const source = slugify(str(v, "source"));
      const medium = slugify(str(v, "medium"));
      const campaign = slugify(str(v, "campaign"));
      const content = slugify(str(v, "content"));
      if (source) p.set("utm_source", source);
      if (medium) p.set("utm_medium", medium);
      if (campaign) p.set("utm_campaign", campaign);
      if (content) p.set("utm_content", content);
      const joiner = base.includes("?") ? "&" : "?";
      const link = p.toString() ? `${base}${joiner}${p.toString()}` : base;

      return {
        qr: { data: link, caption: "Scan to test it" },
        output: { title: "Your tagged link", text: link, filename: "tagged-link.txt", mono: true },
        verdict: {
          tone: "good",
          text: "Tag every link you ever put in front of a customer. In three months your analytics will tell you exactly what to cut and what to double.",
        },
        note: "Keep your naming consistent. facebook and Facebook show up as two different sources and it makes a mess of your reports.",
      };
    },
  },

  {
    slug: "email-signature-generator",
    name: "Email Signature Generator",
    short: "Email Signature",
    emoji: "🖋️",
    category: "Generators",
    tagline: "Every email you send is an ad",
    description:
      "A clean, professional signature with a tappable phone number, your review link and your booking link. Paste it into Gmail or Outlook.",
    who: "Anybody who sends email from their business, which is everybody.",
    problem:
      "Most small business signatures are a name in Comic Sans or nothing at all. It is free advertising space being wasted a hundred times a week.",
    payoff: "A signature that makes it one tap to call, book or review you.",
    steps: [
      "Fill in your details.",
      "Copy the code.",
      "Gmail: Settings, See all settings, Signature, paste. Outlook: File, Options, Mail, Signatures.",
    ],
    embedHeight: 900,
    fields: [
      { id: "name", label: "Your name", type: "text", def: "", placeholder: "Ryan Nichols" },
      { id: "title", label: "Title", type: "text", def: "", placeholder: "Owner" },
      { id: "company", label: "Business", type: "text", def: "", placeholder: "The LeadFlow Pro" },
      { id: "phone", label: "Phone", type: "text", def: "", placeholder: "(903) 500-8898" },
      { id: "email", label: "Email", type: "text", def: "", placeholder: "you@yourbusiness.com" },
      { id: "website", label: "Website", type: "text", def: "", placeholder: "yourbusiness.com" },
      { id: "cta", label: "Call to action line", type: "text", def: "", placeholder: "Free estimates. Text anytime." },
      { id: "reviewLink", label: "Review link (optional)", type: "text", def: "", placeholder: "your Google review link" },
      { id: "color", label: "Accent color", type: "select", def: "#2f6fff", options: [
        { value: "#2f6fff", label: "Blue" },
        { value: "#16a34a", label: "Green" },
        { value: "#b91c1c", label: "Red" },
        { value: "#0f172a", label: "Near black" },
      ] },
    ],
    run: (v) => {
      const name = str(v, "name").trim();
      if (!name) return { note: "Enter your name above and the signature builds itself." };
      const title = str(v, "title").trim();
      const company = str(v, "company").trim();
      const phone = str(v, "phone").trim();
      const tel = telDigits(phone);
      const email = str(v, "email").trim();
      const website = normUrl(str(v, "website"));
      const cta = str(v, "cta").trim();
      const review = normUrl(str(v, "reviewLink"));
      const color = str(v, "color", "#2f6fff");

      const html = `<table style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:14px;color:#0f172a;border-collapse:collapse"><tr><td style="border-left:3px solid ${color};padding-left:14px">
<div style="font-weight:700;font-size:16px">${name}</div>
${title || company ? `<div style="color:#475569">${[title, company].filter(Boolean).join(" · ")}</div>` : ""}
<div style="height:8px"></div>
${phone ? `<div><a href="tel:${tel}" style="color:${color};text-decoration:none;font-weight:600">📞 ${prettyPhone(phone)}</a></div>` : ""}
${email ? `<div><a href="mailto:${email}" style="color:#334155;text-decoration:none">✉️ ${email}</a></div>` : ""}
${website ? `<div><a href="${website}" style="color:#334155;text-decoration:none">🌐 ${website.replace(/^https?:\/\//, "")}</a></div>` : ""}
${cta ? `<div style="height:8px"></div><div style="color:#475569;font-style:italic">${cta}</div>` : ""}
${review ? `<div style="height:6px"></div><div><a href="${review}" style="color:${color};font-weight:600;text-decoration:none">⭐ Leave us a review</a></div>` : ""}
</td></tr></table>`;

      return {
        output: { title: "Your signature code", text: html, filename: "email-signature.html", mono: true },
        note: "In Gmail, paste into the signature box directly. If it pastes as raw code, save the file, open it in a browser, then copy what you see and paste that.",
        verdict: { tone: "good", text: "A tappable phone number in every email you send is the cheapest lead source you have." },
      };
    },
  },

  {
    slug: "missed-call-textback-script",
    name: "Missed Call Text-Back Script Writer",
    short: "Text-Back Script",
    emoji: "📲",
    category: "Generators",
    tagline: "The text that saves the call you missed",
    description:
      "Write the automatic text that goes out the second you miss a call. Get the after-hours version and the follow-up sequence too.",
    who: "Any business where the phone rings while your hands are full.",
    problem:
      "A missed call with no response is a customer calling your competitor within ninety seconds.",
    payoff: "Ready-to-paste scripts for your phone system or texting platform.",
    steps: [
      "Fill in your business details.",
      "Copy the scripts.",
      "Paste them into your phone system, texting app or auto-responder.",
    ],
    embedHeight: 860,
    fields: [
      { id: "business", label: "Business name", type: "text", def: "", placeholder: "Piney Woods Plumbing" },
      { id: "firstName", label: "Who is texting", type: "text", def: "", placeholder: "Ryan" },
      { id: "bookLink", label: "Booking or quote link (optional)", type: "text", def: "", placeholder: "yourbusiness.com/book" },
      { id: "tone", label: "Tone", type: "select", def: "friendly", options: [
        { value: "friendly", label: "Friendly and local" },
        { value: "direct", label: "Short and direct" },
        { value: "professional", label: "Professional" },
      ] },
      { id: "hours", label: "Your hours", type: "text", def: "", placeholder: "Mon-Fri 7-5" },
    ],
    run: (v) => {
      const biz = str(v, "business").trim() || "our shop";
      const first = str(v, "firstName").trim();
      const link = normUrl(str(v, "bookLink"));
      const tone = str(v, "tone", "friendly");
      const hours = str(v, "hours").trim();
      const sig = first ? ` - ${first}` : "";
      const linkLine = link ? `\n\nYou can also grab a time here: ${link}` : "";

      const instant =
        tone === "direct"
          ? `Sorry we missed you. This is ${biz}. What do you need and what part of town are you in? We will get right back.${sig}`
          : tone === "professional"
            ? `Hello, this is ${biz}. We are sorry we missed your call. Please reply with your name and what you need, and we will respond shortly.${linkLine}${sig}`
            : `Hey, this is ${biz}, sorry we missed you. We are probably on a job with our hands full. Text us back what you need and we will get you taken care of.${linkLine}${sig}`;

      const afterHours = `Thanks for reaching out to ${biz}. We are closed right now${hours ? ` (we are open ${hours})` : ""}, but we got your message and you are first up in the morning. Reply here with what you need so we can hit the ground running.${linkLine}${sig}`;

      const day2 = `Hey, ${first || biz} again. Just circling back on your call the other day. Still want me to take a look at it? Yes or no is fine, I would just rather not leave you hanging.`;

      const day5 = `Last one from me, I promise. If the timing is not right, no problem at all, keep my number. If you still need it handled, reply HERE and I will get you on the schedule.`;

      const text = `INSTANT MISSED CALL TEXT (fires within 60 seconds)\n\n${instant}\n\n\nAFTER HOURS VERSION\n\n${afterHours}\n\n\nFOLLOW UP, DAY 2\n\n${day2}\n\n\nFOLLOW UP, DAY 5\n\n${day5}\n\n\nSETUP NOTES\n- Fire the instant text within 60 seconds. Speed is the entire point.\n- Send from the same number people called, not a different one.\n- Somebody has to actually watch the replies.\n- Include your opt-out language if you are sending automated marketing texts.`;

      return {
        output: { title: "Your text-back scripts", text, filename: "missed-call-scripts.txt" },
        verdict: {
          tone: "good",
          text: "The instant text is the one that matters. Two minutes late and they already called somebody else.",
        },
        note: "Automated texting is regulated. Reply STOP handling, clear identification and consent rules apply to marketing messages. A direct reply to someone who just called you is a different thing than a blast, but know your rules.",
      };
    },
  },

  {
    slug: "review-request-script",
    name: "Review Request Script Writer",
    short: "Review Requests",
    emoji: "🙏",
    category: "Generators",
    tagline: "Ask in a way people actually answer",
    description:
      "Text, email and in-person scripts for asking for a review, plus the follow-up. Written to feel like a person, not a campaign.",
    who: "Any business that wants more reviews and hates asking.",
    problem:
      "Owners either never ask, or send something so corporate it gets ignored.",
    payoff: "Four scripts you can send today, timed to when people actually say yes.",
    steps: [
      "Fill in your details and paste your review link.",
      "Copy the scripts.",
      "Send the text the same day you finish, while they are still happy.",
    ],
    embedHeight: 840,
    fields: [
      { id: "business", label: "Business name", type: "text", def: "", placeholder: "Piney Woods Plumbing" },
      { id: "first", label: "Your first name", type: "text", def: "", placeholder: "Ryan" },
      { id: "link", label: "Your Google review link", type: "text", def: "", placeholder: "paste it from the Review Link tool" },
      { id: "job", label: "What you do for them", type: "text", def: "", placeholder: "the water heater" },
    ],
    run: (v) => {
      const biz = str(v, "business").trim() || "our shop";
      const first = str(v, "first").trim() || "the owner";
      const link = normUrl(str(v, "link"));
      const job = str(v, "job").trim() || "the work";
      const linkPart = link ? `\n${link}` : "\n[paste your review link here]";

      const text = `SAME DAY TEXT (send within 2 hours of finishing)

Hey, this is ${first} with ${biz}. Really appreciate you letting us handle ${job} today. If we did right by you, would you mind leaving a quick review? It genuinely helps a small shop like ours.${linkPart}

Takes about 30 seconds. Thanks either way.


EMAIL VERSION

Subject: Quick favor?

Hi there,

${first} here from ${biz}. Thanks again for trusting us with ${job}.

If you were happy with how it went, a short Google review would mean a lot. It is the main way people around here find us.

${link || "[your review link]"}

If anything was not right, reply to this email instead and tell me. I would rather hear it from you than read it later.

Thanks,
${first}
${biz}


IN PERSON SCRIPT

"Before I take off, can I ask you a favor? Reviews are pretty much how people find us. If you were happy with how it went, I am going to text you a link. Takes about thirty seconds. No pressure either way."

Then text the link before you pull out of the driveway.


FOLLOW UP, 3 DAYS LATER (only once, never twice)

Hey, ${first} with ${biz} again. Not trying to bug you. If you have got 30 seconds for that review it would help us out a bunch. If not, no worries at all, we appreciate the business either way.${linkPart}


TIMING RULES
- Send it the same day, while they still like you.
- Ask right after a win: job finished, problem solved, delivery landed.
- Ask everybody, not just the ones you think will say something nice.
- One follow-up. Never two.
- Never offer a discount or a gift for a review. It violates Google's policy and can get your reviews wiped.`;

      return {
        output: { title: "Your review request scripts", text, filename: "review-request-scripts.txt" },
        verdict: { tone: "good", text: "The whole game is timing. Same day, right after the win, with a link they can tap. That is it." },
      };
    },
  },

  {
    slug: "estimate-terms-generator",
    name: "Estimate Terms & Deposit Language",
    short: "Estimate Terms",
    emoji: "📄",
    category: "Generators",
    tagline: "The paragraph that prevents the argument",
    description:
      "Deposit, validity window, change orders, scope, payment terms. The language that goes at the bottom of every estimate so nobody is surprised later.",
    who: "Trades, contractors, remodelers, anybody sending written estimates.",
    problem:
      "Verbal agreements turn into disputes. The fix is one paragraph at the bottom of the estimate that everybody read before signing.",
    payoff: "Terms you can paste onto every estimate today.",
    steps: [
      "Set your deposit, validity window and payment terms.",
      "Copy the block.",
      "Paste it at the bottom of your estimate template.",
    ],
    embedHeight: 880,
    fields: [
      { id: "business", label: "Business name", type: "text", def: "", placeholder: "Piney Woods Plumbing" },
      { id: "deposit", label: "Deposit required", type: "slider", min: 0, max: 75, step: 5, def: 35, suffix: "%" },
      { id: "validDays", label: "Estimate good for", type: "slider", min: 7, max: 90, step: 1, def: 30, suffix: " days" },
      { id: "terms", label: "Payment due", type: "select", def: "completion", options: [
        { value: "completion", label: "On completion" },
        { value: "net15", label: "Net 15" },
        { value: "net30", label: "Net 30" },
        { value: "milestone", label: "By milestone" },
      ] },
      { id: "lateFee", label: "Late fee per month", type: "slider", min: 0, max: 5, step: 0.5, def: 1.5, suffix: "%" },
      { id: "warranty", label: "Warranty period", type: "text", def: "1 year on labor", placeholder: "1 year on labor" },
    ],
    run: (v) => {
      const biz = str(v, "business").trim() || "[Your Business]";
      const dep = num(v, "deposit");
      const valid = num(v, "validDays");
      const terms = str(v, "terms", "completion");
      const late = num(v, "lateFee");
      const warranty = str(v, "warranty").trim();

      const termsText =
        terms === "completion" ? "Balance is due upon completion of the work."
        : terms === "net15" ? "Balance is due within 15 days of the invoice date."
        : terms === "net30" ? "Balance is due within 30 days of the invoice date."
        : "Balance is billed by milestone as described in the scope above.";

      const text = `ESTIMATE TERMS

Scope. This estimate covers only the work described above. Anything not listed is not included.

Validity. This price is good for ${valid} days from the date of this estimate. Material prices move, and after ${valid} days we will need to re-quote.

${dep > 0 ? `Deposit. A ${dep}% deposit is required to schedule the work and order materials. The deposit is applied to the final balance.\n\n` : ""}Payment. ${termsText} We accept [list your payment methods].

Change orders. Any change to the scope will be documented in writing and priced before the work is performed. Verbal changes are not authorized.

Unforeseen conditions. If we open a wall, a floor, or a system and find a condition that could not reasonably have been seen at the time of this estimate, we will stop, document it, and provide a written price before continuing.

${late > 0 ? `Late payments. Balances unpaid past the due date accrue a service charge of ${late}% per month on the outstanding amount.\n\n` : ""}${warranty ? `Warranty. ${warranty}. Manufacturer warranties on materials pass through to you as written by the manufacturer.\n\n` : ""}Acceptance. Signing below or issuing a deposit constitutes acceptance of this estimate and these terms.

Customer signature: ____________________________  Date: ____________

${biz}`;

      return {
        output: { title: "Your estimate terms", text, filename: "estimate-terms.txt" },
        note: "This is a plain-English starting point, not legal advice and not a contract drafted for your state or trade. Have a local attorney review it before you rely on it, especially the deposit, lien and warranty language, which are regulated differently everywhere.",
        verdict: { tone: "good", text: "Ninety percent of job disputes come from scope and change orders. Those two paragraphs are the ones that save you." },
      };
    },
  },

  {
    slug: "late-payment-language",
    name: "Invoice & Late Payment Language",
    short: "Invoice Terms",
    emoji: "📑",
    category: "Generators",
    tagline: "Get paid without the awkward phone call",
    description:
      "Payment terms for your invoice plus the three reminder messages that collect most of what is late, without burning the relationship.",
    who: "Anybody who invoices and then waits.",
    problem:
      "Chasing money is the worst job in the business, so it gets put off, and the longer it waits the harder it gets.",
    payoff: "Terms plus a written reminder sequence you can automate.",
    steps: [
      "Set your terms and late fee.",
      "Paste the terms onto your invoice template.",
      "Schedule the three reminders. Do not send them by hand.",
    ],
    embedHeight: 880,
    fields: [
      { id: "business", label: "Business name", type: "text", def: "", placeholder: "Piney Woods Plumbing" },
      { id: "days", label: "Payment due in", type: "slider", min: 0, max: 60, step: 1, def: 15, suffix: " days" },
      { id: "lateFee", label: "Late fee per month", type: "slider", min: 0, max: 5, step: 0.5, def: 1.5, suffix: "%" },
      { id: "discount", label: "Early payment discount", type: "slider", min: 0, max: 10, step: 0.5, def: 2, suffix: "%" },
      { id: "discountDays", label: "Early discount if paid within", type: "slider", min: 1, max: 20, step: 1, def: 5, suffix: " days" },
      { id: "phone", label: "Your phone", type: "text", def: "", placeholder: "(903) 500-8898" },
    ],
    run: (v) => {
      const biz = str(v, "business").trim() || "[Your Business]";
      const days = num(v, "days");
      const late = num(v, "lateFee");
      const disc = num(v, "discount");
      const discDays = num(v, "discountDays");
      const phone = str(v, "phone").trim();
      const contact = phone ? `call or text ${prettyPhone(phone)}` : "give us a call";

      const text = `INVOICE TERMS (put this on every invoice)

Payment is due ${days === 0 ? "upon receipt" : `within ${days} days of the invoice date`}.
${disc > 0 ? `Pay within ${discDays} days and take ${disc}% off the total.\n` : ""}${late > 0 ? `Balances past due accrue ${late}% per month on the outstanding amount.\n` : ""}Questions about this invoice? ${contact} before the due date and we will get it sorted.


REMINDER 1 — three days before it is due (friendly, automatic)

Hi [Name], quick heads up that invoice #[number] for [amount] is due on [date]. Here is the link to pay: [link]. Thanks again for the business. - ${biz}


REMINDER 2 — the day after it is due (still friendly)

Hi [Name], invoice #[number] for [amount] came due yesterday. It happens, no problem. Here is the payment link: [link]. If something is holding it up, just tell me and we will work it out. - ${biz}


REMINDER 3 — day 10 past due (direct, still not hostile)

[Name], following up on invoice #[number] for [amount], now 10 days past due.${late > 0 ? ` A ${late}% service charge applies to balances past due.` : ""} Pay here: [link]. If you need a payment plan, ${contact} today and we will set one up. I would rather work with you than send this anywhere else.


REMINDER 4 — day 30 (last one before it escalates)

[Name], invoice #[number] for [amount] is 30 days past due and I have not heard back. I need this resolved this week. Pay here: [link], or ${contact} today to arrange terms. If I do not hear from you, I will have to send this to collections, and neither of us wants that.


WHAT ACTUALLY FIXES THIS
- Take a deposit before the work starts.
- Keep a card on file and charge it on completion.
- Send the invoice the same day, not on Friday afternoon.
- Automate all four reminders. Never send them by hand, you will not do it.`;

      return {
        output: { title: "Your invoice terms and reminder sequence", text, filename: "invoice-terms-and-reminders.txt" },
        note: "Late fee limits, interest caps and collections rules vary by state and by whether your customer is a business or a consumer. Check your state's rules or ask an attorney before you enforce a late fee.",
        verdict: { tone: "good", text: "Most late payments are not people refusing to pay. They are people who forgot. Automated reminders fix most of it without one uncomfortable conversation." },
      };
    },
  },

  {
    slug: "cancellation-policy-generator",
    name: "Cancellation & No-Show Policy Writer",
    short: "Cancellation Policy",
    emoji: "🚫",
    category: "Generators",
    tagline: "Protect the time you set aside",
    description:
      "A clear, fair cancellation and no-show policy you can post, put on your booking page, and text before every appointment.",
    who: "Salons, clinics, trades, consultants, anyone booking appointments.",
    problem:
      "Without a written policy, every no-show becomes a negotiation you lose.",
    payoff: "A policy in plain English, plus the confirmation text that makes it stick.",
    steps: [
      "Set your notice window and fee.",
      "Copy the policy onto your booking page and intake form.",
      "Send the confirmation text. That is what actually reduces no-shows.",
    ],
    embedHeight: 860,
    fields: [
      { id: "business", label: "Business name", type: "text", def: "", placeholder: "Your business" },
      { id: "notice", label: "Notice required to cancel", type: "slider", min: 2, max: 72, step: 1, def: 24, suffix: " hours" },
      { id: "feeType", label: "What happens if they do not", type: "select", def: "percent", options: [
        { value: "percent", label: "Percent of the service" },
        { value: "flat", label: "Flat fee" },
        { value: "deposit", label: "They forfeit the deposit" },
        { value: "none", label: "No fee, but tracked" },
      ] },
      { id: "feeAmount", label: "Fee amount", type: "money", def: 50 },
      { id: "feePercent", label: "Fee percent", type: "slider", min: 10, max: 100, step: 5, def: 50, suffix: "%" },
      { id: "grace", label: "How late before it is a no-show", type: "slider", min: 5, max: 60, step: 5, def: 15, suffix: " min" },
    ],
    run: (v) => {
      const biz = str(v, "business").trim() || "we";
      const notice = num(v, "notice");
      const feeType = str(v, "feeType", "percent");
      const flat = num(v, "feeAmount");
      const pctFee = num(v, "feePercent");
      const grace = num(v, "grace");

      const consequence =
        feeType === "percent" ? `a charge of ${pctFee}% of the scheduled service`
        : feeType === "flat" ? `a ${money(flat)} fee`
        : feeType === "deposit" ? "forfeiture of the deposit"
        : "a note on your account";

      const text = `CANCELLATION AND NO-SHOW POLICY

We hold your appointment time for you and turn away other work to do it. All we ask is notice.

Cancellations and reschedules. Please give us at least ${notice} hours notice to cancel or move an appointment. There is no charge when you do.

Late cancellations. Cancelling with less than ${notice} hours notice results in ${consequence}.

No-shows. If you have not arrived or contacted us within ${grace} minutes of your start time, it is a no-show, and results in ${consequence}.

Late arrivals. If you arrive late we will do as much as we can in the remaining time. The full charge still applies, and we may need to reschedule.

Emergencies. Life happens. If something real came up, tell us. We handle those case by case and we are reasonable people.

Repeat no-shows. After two no-shows, future appointments require prepayment.

${biz} — thank you for respecting our time. We will always respect yours.


CONFIRMATION TEXT (send at booking)

You are booked for [service] on [date] at [time]. Reply C to confirm. Need to change it? Just let us know at least ${notice} hours ahead and there is no charge. - ${biz}


REMINDER TEXT (send 24 hours before)

Reminder: [service] tomorrow at [time]. Reply C to confirm or R to reschedule. See you then. - ${biz}


REMINDER TEXT (send 2 hours before)

See you at [time] today for [service]. Address: [address]. Running late? Just text us. - ${biz}`;

      return {
        output: { title: "Your policy and reminder texts", text, filename: "cancellation-policy.txt" },
        note: "A policy only holds if people saw it before they booked. Put it on the booking page, in the confirmation, and on the intake form. Charging a card requires their agreement up front, and card-on-file rules vary. Check with your processor.",
        verdict: { tone: "good", text: "The reminders prevent more no-shows than the fee does. The fee is for the people the reminders do not reach." },
      };
    },
  },

  {
    slug: "localbusiness-schema-generator",
    name: "LocalBusiness Schema Generator",
    short: "Business Schema",
    emoji: "🏢",
    category: "Generators",
    tagline: "Tell Google exactly who you are",
    description:
      "Generates the structured data code that tells search engines your name, address, phone, hours, service area and rating. Paste it into your site's head.",
    who: "Any local business that wants search engines to read their details correctly.",
    problem:
      "Search engines guess at your hours, your service area and your phone number from whatever they scrape. Schema tells them instead of letting them guess.",
    payoff: "Valid JSON-LD you can paste into any website.",
    steps: [
      "Fill in your business details exactly as they appear on your Google Business Profile.",
      "Copy the code.",
      "Paste it into the head of your homepage. Any HTML or custom-code block works.",
      "Test it with Google's Rich Results Test.",
    ],
    embedHeight: 980,
    fields: [
      { id: "name", label: "Business name", type: "text", def: "", placeholder: "Piney Woods Plumbing" },
      { id: "type", label: "Business type", type: "select", def: "LocalBusiness", options: [
        { value: "LocalBusiness", label: "General local business" },
        { value: "HomeAndConstructionBusiness", label: "Home services / construction" },
        { value: "Plumber", label: "Plumber" },
        { value: "Electrician", label: "Electrician" },
        { value: "RoofingContractor", label: "Roofing" },
        { value: "HVACBusiness", label: "HVAC" },
        { value: "AutoRepair", label: "Auto repair" },
        { value: "Restaurant", label: "Restaurant" },
        { value: "HealthAndBeautyBusiness", label: "Salon / spa" },
        { value: "Dentist", label: "Dentist" },
        { value: "LegalService", label: "Legal" },
        { value: "ProfessionalService", label: "Professional service" },
      ] },
      { id: "url", label: "Website", type: "text", def: "", placeholder: "yourbusiness.com" },
      { id: "phone", label: "Phone", type: "text", def: "", placeholder: "(903) 500-8898" },
      { id: "street", label: "Street address", type: "text", def: "", placeholder: "2800 Gilmer Rd Suite 106" },
      { id: "city", label: "City", type: "text", def: "", placeholder: "Longview" },
      { id: "state", label: "State", type: "text", def: "", placeholder: "TX" },
      { id: "zip", label: "ZIP", type: "text", def: "", placeholder: "75604" },
      { id: "areas", label: "Towns you serve, comma separated", type: "text", def: "", placeholder: "Longview, Marshall, Kilgore, Tyler" },
      { id: "priceRange", label: "Price range", type: "select", def: "$$", options: [
        { value: "$", label: "$ — budget" },
        { value: "$$", label: "$$ — mid" },
        { value: "$$$", label: "$$$ — premium" },
      ] },
      { id: "hours", label: "Hours", type: "text", def: "Mo-Fr 08:00-17:00", placeholder: "Mo-Fr 08:00-17:00" },
    ],
    run: (v) => {
      const name = str(v, "name").trim();
      if (!name) return { note: "Put in your business name and the code builds itself." };
      const areas = str(v, "areas")
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean);

      const obj: Record<string, unknown> = {
        "@context": "https://schema.org",
        "@type": str(v, "type", "LocalBusiness"),
        name,
        url: normUrl(str(v, "url")) || undefined,
        telephone: str(v, "phone").trim() || undefined,
        priceRange: str(v, "priceRange", "$$"),
        address: {
          "@type": "PostalAddress",
          streetAddress: str(v, "street").trim() || undefined,
          addressLocality: str(v, "city").trim() || undefined,
          addressRegion: str(v, "state").trim() || undefined,
          postalCode: str(v, "zip").trim() || undefined,
          addressCountry: "US",
        },
        openingHours: str(v, "hours").trim() || undefined,
        areaServed: areas.length ? areas.map((a) => ({ "@type": "City", name: a })) : undefined,
      };

      const json = JSON.stringify(obj, (_k, val) => (val === undefined ? undefined : val), 2);
      const snippet = `<script type="application/ld+json">\n${json}\n</script>`;

      return {
        output: { title: "Paste this into the head of your homepage", text: snippet, filename: "localbusiness-schema.html", mono: true },
        note: "Your name, address and phone here must match your Google Business Profile exactly, character for character. Mismatches do more harm than having no schema at all. Test it with Google's Rich Results Test before you call it done.",
        verdict: { tone: "good", text: "This is free, takes five minutes, and most of your competitors have never heard of it." },
      };
    },
  },

  {
    slug: "faq-schema-generator",
    name: "FAQ Schema Generator",
    short: "FAQ Schema",
    emoji: "❓",
    category: "Generators",
    tagline: "Answer the questions people are already searching",
    description:
      "Turn your five most-asked questions into structured data that search engines and AI assistants can read and quote directly.",
    who: "Any business that answers the same five questions every day on the phone.",
    problem:
      "You answer 'do you charge for estimates' forty times a week. Putting it on your site in the right format means it gets answered before they call.",
    payoff: "Copy-paste FAQ schema plus the plain HTML version for the page.",
    steps: [
      "Write out your questions and answers, one per line, question first.",
      "Copy the code.",
      "Paste it into the page where the FAQs are actually shown.",
    ],
    embedHeight: 900,
    fields: [
      { id: "faqs", label: "One per line: Question | Answer", type: "textarea", rows: 8, def: "Do you charge for estimates? | No. Estimates are free and we usually get to you within 24 hours.\nWhat areas do you serve? | We cover Longview, Marshall, Kilgore, Gladewater and the surrounding area.\nAre you licensed and insured? | Yes. We are fully licensed and insured, and we will show you the paperwork any time you ask.\nHow fast can you get out here? | Same day for emergencies, usually next day for everything else.\nDo you offer payment plans? | Yes, on larger jobs. Just ask when we quote it.", help: "Put the question, then a pipe character, then the answer. One pair per line." },
    ],
    run: (v) => {
      const raw = str(v, "faqs");
      const pairs = raw
        .split("\n")
        .map((line) => line.split("|"))
        .filter((p) => p.length >= 2 && p[0].trim() && p[1].trim())
        .map((p) => ({ q: clean(p[0]), a: clean(p.slice(1).join("|")) }));

      if (!pairs.length) return { note: "Add at least one question and answer, separated by a | character." };

      const obj = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: pairs.map((p) => ({
          "@type": "Question",
          name: p.q,
          acceptedAnswer: { "@type": "Answer", text: p.a },
        })),
      };
      const snippet = `<script type="application/ld+json">\n${JSON.stringify(obj, null, 2)}\n</script>`;
      const html = pairs.map((p) => `<h3>${p.q}</h3>\n<p>${p.a}</p>`).join("\n\n");

      return {
        output: { title: "Your FAQ schema", text: `${snippet}\n\n<!-- Visible version for the page -->\n${html}`, filename: "faq-schema.html", mono: true },
        table: { title: `${count(pairs.length)} questions found`, headers: ["Question", "Answer"], rows: pairs.map((p) => [p.q, p.a]) },
        note: "The questions and answers in the schema must actually appear on the page for a visitor to see. Do not put schema on a page that does not show the same content.",
      };
    },
  },

  {
    slug: "meta-title-description-writer",
    name: "Page Title & Description Writer",
    short: "Titles & Descriptions",
    emoji: "🔖",
    category: "Generators",
    tagline: "The line Google shows before anybody clicks",
    description:
      "Write your page title and description with a live length meter, so they do not get cut off. Includes the local formula that works.",
    who: "Anyone whose page titles say Home, About and Services.",
    problem:
      "Your title tag is your billboard in the search results, and most small business sites have never touched it.",
    payoff: "Titles and descriptions that fit, say the service and name the town.",
    steps: [
      "Fill in your service, town and business name.",
      "Adjust until both meters are green.",
      "Paste into your page settings, usually called SEO title and meta description.",
    ],
    embedHeight: 860,
    fields: [
      { id: "service", label: "The service this page is about", type: "text", def: "", placeholder: "Water Heater Repair" },
      { id: "city", label: "Town or area", type: "text", def: "", placeholder: "Longview, TX" },
      { id: "business", label: "Business name", type: "text", def: "", placeholder: "Piney Woods Plumbing" },
      { id: "hook", label: "Your hook", type: "text", def: "", placeholder: "Same-day service, free estimates" },
      { id: "phone", label: "Phone (optional, for the description)", type: "text", def: "", placeholder: "(903) 500-8898" },
    ],
    run: (v) => {
      const service = str(v, "service").trim();
      const city = str(v, "city").trim();
      const biz = str(v, "business").trim();
      const hook = str(v, "hook").trim();
      const phone = str(v, "phone").trim();
      if (!service) return { note: "Enter the service this page is about to build your title." };

      const title = [service, city, biz].filter(Boolean).join(" | ");
      const desc = clean(
        `${hook || `Professional ${service.toLowerCase()}`}${city ? ` in ${city}` : ""}. ${biz ? `${biz} ` : ""}is licensed, insured and local.${phone ? ` Call ${prettyPhone(phone)} for a free estimate.` : " Call for a free estimate."}`,
      );

      const tLen = title.length;
      const dLen = desc.length;
      const tTone = tLen <= 60 ? "good" : tLen <= 70 ? "warn" : "bad";
      const dTone = dLen >= 120 && dLen <= 158 ? "good" : dLen < 120 ? "warn" : "bad";

      return {
        headline: { value: `${tLen} / 60`, label: "Title length", sub: tTone === "good" ? "Fits" : tTone === "warn" ? "Might get cut" : "Too long, it will be truncated", tone: tTone as "good" | "warn" | "bad" },
        stats: [
          { label: "Description length", value: `${dLen} / 158`, tone: dTone as "good" | "warn" | "bad" },
          { label: "Has the town", value: city ? "Yes" : "No", tone: city ? "good" : "bad" },
          { label: "Has the service", value: service ? "Yes" : "No", tone: "good" },
          { label: "Has a reason to call", value: hook || phone ? "Yes" : "No", tone: hook || phone ? "good" : "warn" },
        ],
        output: {
          title: "Paste these into your page settings",
          text: `TITLE TAG (${tLen} characters)\n${title}\n\nMETA DESCRIPTION (${dLen} characters)\n${desc}`,
          filename: "page-title-description.txt",
        },
        note: "One page per service per town. A single Services page trying to cover eight services in five towns ranks for none of them.",
      };
    },
  },

  {
    slug: "ad-character-counter",
    name: "Ad Copy Character Counter",
    short: "Ad Counter",
    emoji: "✍️",
    category: "Generators",
    tagline: "Write it once, fit it everywhere",
    description:
      "Paste your headline and body copy. See instantly whether it fits Google Ads, Facebook, Instagram, a Google Business post, a text message, or a bio.",
    who: "Anybody writing ads and getting the red 'too long' warning after the fact.",
    problem:
      "Every platform has a different limit and none of them tell you until you have already written it.",
    payoff: "One screen that shows what fits where.",
    steps: [
      "Paste your headline and your body copy.",
      "Check the table for where it fits.",
      "Trim until the important ones are green.",
    ],
    embedHeight: 820,
    fields: [
      { id: "headline", label: "Headline", type: "text", def: "", placeholder: "Same-Day Water Heater Repair" },
      { id: "body", label: "Body copy", type: "textarea", rows: 5, def: "", placeholder: "Licensed, insured, and local. Free estimates, no trip charge, and we answer the phone." },
    ],
    run: (v) => {
      const h = str(v, "headline");
      const b = str(v, "body");
      const hl = h.length;
      const bl = b.length;
      const limits: [string, number, number][] = [
        ["Google Ads headline", hl, 30],
        ["Google Ads description", bl, 90],
        ["Facebook / Instagram primary text (before See More)", bl, 125],
        ["Facebook headline", hl, 40],
        ["Google Business Profile post", bl, 1500],
        ["Text message, single segment", bl, 160],
        ["Meta description", bl, 158],
        ["Page title", hl, 60],
        ["X post", bl, 280],
        ["Instagram bio", bl, 150],
        ["Email subject line", hl, 50],
      ];

      return {
        headline: { value: `${hl}`, label: "Headline characters", sub: `${bl} characters of body copy`, tone: "neutral" },
        table: {
          title: "Where it fits",
          headers: ["Placement", "Limit", "Yours", "Fits?"],
          rows: limits.map(([label, len, max]) => [label, max, len, len === 0 ? "—" : len <= max ? "Yes" : `Over by ${len - max}`]),
        },
        note: "Front-load the important words. On most platforms the first 40 characters are the only ones people read on a phone.",
      };
    },
  },

  {
    slug: "google-maps-link-generator",
    name: "Directions Link Generator",
    short: "Directions Link",
    emoji: "🗺️",
    category: "Generators",
    tagline: "One tap and they are driving to you",
    description:
      "Make a link that opens turn-by-turn directions to your shop in whatever map app the customer already uses. Plus a QR code for print.",
    who: "Any business with a location people drive to.",
    problem:
      "Putting your address on the site as plain text means everybody has to copy it, open maps, and paste it. Half of them just do not come.",
    payoff: "A directions link and QR you can put on the site, the invoice and the door.",
    steps: [
      "Enter your full address.",
      "Copy the link or save the QR code.",
      "Put it on your contact page, appointment confirmations and printed material.",
    ],
    embedHeight: 720,
    fields: [
      { id: "address", label: "Your full address", type: "text", def: "", placeholder: "2800 Gilmer Rd Suite 106, Longview, TX 75604" },
      { id: "label", label: "Button text", type: "text", def: "Get Directions", placeholder: "Get Directions" },
    ],
    run: (v) => {
      const addr = clean(str(v, "address"));
      if (!addr) return { note: "Enter your address to build the link." };
      const enc = encodeURIComponent(addr);
      const link = `https://www.google.com/maps/dir/?api=1&destination=${enc}`;
      const label = str(v, "label").trim() || "Get Directions";
      const html = `<a href="${link}" target="_blank" rel="noopener" style="display:inline-block;background:#2f6fff;color:#fff;font-weight:700;padding:14px 26px;border-radius:10px;text-decoration:none;font-family:system-ui,sans-serif;">🗺️ ${label}</a>`;

      return {
        qr: { data: link, caption: "Scan for directions" },
        output: { title: "Your directions link", text: link, filename: "directions-link.txt", mono: true },
        table: {
          title: "Other versions",
          headers: ["Use", "Code or link"],
          rows: [
            ["Website button", html],
            ["Apple Maps", `https://maps.apple.com/?daddr=${enc}`],
            ["Just show the pin", `https://www.google.com/maps/search/?api=1&query=${enc}`],
          ],
        },
        note: "The Google link opens the default map app on most phones, so it works for iPhone and Android both.",
      };
    },
  },

  {
    slug: "add-to-calendar-link",
    name: "Add-to-Calendar Link Maker",
    short: "Calendar Link",
    emoji: "📅",
    category: "Generators",
    tagline: "Put your event on their calendar in one tap",
    description:
      "Generate an add-to-calendar link and a downloadable calendar file for an appointment, class, open house or event.",
    who: "Anyone running events, classes, open houses, or booking appointments people forget.",
    problem:
      "Telling somebody the date does not put it on their calendar. If it is not on their calendar, they are not coming.",
    payoff: "A link and a .ics file that adds the event with one tap.",
    steps: [
      "Enter the event details.",
      "Copy the Google Calendar link, or download the .ics for everything else.",
      "Put it in the confirmation email and the reminder text.",
    ],
    embedHeight: 900,
    fields: [
      { id: "title", label: "Event name", type: "text", def: "", placeholder: "Own Your Platform Workshop" },
      { id: "date", label: "Date (YYYY-MM-DD)", type: "text", def: "", placeholder: "2026-09-18" },
      { id: "start", label: "Start time (24 hour, HH:MM)", type: "text", def: "18:00", placeholder: "18:00" },
      { id: "end", label: "End time (24 hour, HH:MM)", type: "text", def: "20:00", placeholder: "20:00" },
      { id: "location", label: "Location", type: "text", def: "", placeholder: "The Coop, Longview TX" },
      { id: "details", label: "Details", type: "textarea", rows: 3, def: "", placeholder: "What to bring, what to expect, parking" },
    ],
    run: (v) => {
      const title = clean(str(v, "title"));
      const date = str(v, "date").trim();
      const start = str(v, "start").trim() || "18:00";
      const end = str(v, "end").trim() || "20:00";
      const location = clean(str(v, "location"));
      const details = clean(str(v, "details"));
      if (!title || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return { note: "Enter an event name and a date in YYYY-MM-DD format to build the links." };
      }

      const stamp = (t: string) => `${date.replace(/-/g, "")}T${t.replace(":", "")}00`;
      const s = stamp(start);
      const e = stamp(end);

      const gcal = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${s}/${e}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(location)}`;

      const ics = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//The LeadFlow Pro//Free Tools//EN",
        "BEGIN:VEVENT",
        `UID:${slugify(title)}-${s}@theleadflowpro.com`,
        `DTSTART:${s}`,
        `DTEND:${e}`,
        `SUMMARY:${title}`,
        location ? `LOCATION:${location}` : "",
        details ? `DESCRIPTION:${details}` : "",
        "END:VEVENT",
        "END:VCALENDAR",
      ]
        .filter(Boolean)
        .join("\n");

      return {
        qr: { data: gcal, caption: "Scan to add to calendar" },
        output: { title: "Calendar file (works with Apple, Outlook, everything)", text: ics, filename: `${slugify(title) || "event"}.ics`, mono: true },
        table: {
          title: "Your links",
          headers: ["Where", "Link"],
          rows: [
            ["Google Calendar", gcal],
            ["Outlook / Apple / everything else", "Download the .ics file above and attach it to your email"],
          ],
        },
        note: "Times are local to whoever opens it. For an event with people in different time zones, say the time zone in the event name.",
      };
    },
  },

  {
    slug: "voicemail-script-generator",
    name: "Business Voicemail Script Writer",
    short: "Voicemail Script",
    emoji: "📼",
    category: "Generators",
    tagline: "The greeting that does not lose the caller",
    description:
      "Your voicemail is talking to customers when you cannot. Write one that tells them what to do next instead of just beeping at them.",
    who: "Any business whose voicemail still says 'you have reached the voicemail of'.",
    problem:
      "A generic voicemail makes people hang up. A good one keeps them, tells them when you will call back, and gives them a faster option.",
    payoff: "Three scripts: normal hours, after hours, and out on a job.",
    steps: [
      "Fill in your details.",
      "Read it out loud once before you record it.",
      "Re-record it any time your hours or schedule change.",
    ],
    embedHeight: 820,
    fields: [
      { id: "business", label: "Business name", type: "text", def: "", placeholder: "Piney Woods Plumbing" },
      { id: "name", label: "Your name", type: "text", def: "", placeholder: "Ryan" },
      { id: "callback", label: "How fast you call back", type: "select", def: "sameday", options: [
        { value: "hour", label: "Within an hour" },
        { value: "sameday", label: "Same day" },
        { value: "nextday", label: "Next business day" },
      ] },
      { id: "textNumber", label: "Number they can text", type: "text", def: "", placeholder: "(903) 500-8898" },
      { id: "bookLink", label: "Booking link (say it slowly)", type: "text", def: "", placeholder: "yourbusiness.com/book" },
    ],
    run: (v) => {
      const biz = str(v, "business").trim() || "our shop";
      const name = str(v, "name").trim();
      const cb = str(v, "callback", "sameday");
      const textNum = str(v, "textNumber").trim();
      const link = str(v, "bookLink").trim();
      const cbText = cb === "hour" ? "within the hour" : cb === "sameday" ? "before the end of the day" : "first thing the next business day";
      const textLine = textNum ? ` If you would rather text, send a message to ${prettyPhone(textNum)} and we will get right back to you.` : "";
      const linkLine = link ? ` You can also book online at ${link.replace(/^https?:\/\//, "")}.` : "";

      const text = `MAIN GREETING

"Thanks for calling ${biz}${name ? `, this is ${name}` : ""}. We are either on a job or on another call right now. Leave your name, your number, and what you need, and we will call you back ${cbText}.${textLine}${linkLine} Thanks."


AFTER HOURS

"You have reached ${biz}. We are closed right now, but we check messages every morning. Leave your name, number, and what is going on, and you will be one of the first calls we make.${textLine} If this is an emergency, [say what they should do]. Thanks for calling."


ON A JOB / BUSY DAY

"${biz}${name ? `, ${name} here` : ""}. We are running jobs today so we are slow to the phone. Leave a message and we will call back ${cbText}.${textLine} Appreciate you."


RECORDING TIPS
- Stand up. You sound more awake.
- Say the phone number and any website slowly, twice.
- Keep it under 20 seconds. People hang up on long greetings.
- Re-record it when your hours or schedule change. An outdated greeting reads as a closed business.`;

      return {
        output: { title: "Your voicemail scripts", text, filename: "voicemail-scripts.txt" },
        verdict: { tone: "good", text: "Better than a perfect voicemail: an automatic text to everybody who hits it. Voicemail is the backup, not the plan." },
      };
    },
  },

  {
    slug: "job-post-writer",
    name: "Job Posting Writer",
    short: "Job Posting",
    emoji: "📋",
    category: "Generators",
    tagline: "Write a hiring ad people actually answer",
    description:
      "Most small business job posts read like a warning label. This writes one that sounds like the shop and gets replies from people worth hiring.",
    who: "Any owner trying to hire and getting nothing but no-shows.",
    problem:
      "Posts that lead with requirements and hide the pay get ignored by everybody except people with no other options.",
    payoff: "A posting you can put on Indeed, Facebook or your own site today.",
    steps: [
      "Fill in the role, pay range and what the job actually is.",
      "Copy it and post it.",
      "Put the pay in the post. Posts without pay get a fraction of the responses.",
    ],
    embedHeight: 940,
    fields: [
      { id: "business", label: "Business name", type: "text", def: "", placeholder: "Piney Woods Plumbing" },
      { id: "role", label: "Job title", type: "text", def: "", placeholder: "Service Plumber" },
      { id: "city", label: "Where", type: "text", def: "", placeholder: "Longview, TX" },
      { id: "payLow", label: "Pay range, low", type: "money", def: 22 },
      { id: "payHigh", label: "Pay range, high", type: "money", def: 32 },
      { id: "payType", label: "Pay type", type: "select", def: "hour", options: [
        { value: "hour", label: "Per hour" },
        { value: "year", label: "Per year" },
      ] },
      { id: "duties", label: "What they will actually do, one per line", type: "textarea", rows: 4, def: "", placeholder: "Service calls\nWater heater installs\nDrain work" },
      { id: "musts", label: "What they truly must have, one per line", type: "textarea", rows: 3, def: "", placeholder: "Clean driving record\n2 years experience" },
      { id: "perks", label: "What is good about working here, one per line", type: "textarea", rows: 3, def: "", placeholder: "Take-home truck\nPaid holidays\nNo weekends" },
      { id: "contact", label: "How to apply", type: "text", def: "", placeholder: "Text (903) 500-8898" },
    ],
    run: (v) => {
      const biz = str(v, "business").trim() || "[Your Business]";
      const role = str(v, "role").trim() || "[Job Title]";
      const city = str(v, "city").trim();
      const low = num(v, "payLow");
      const high = num(v, "payHigh");
      const payType = str(v, "payType", "hour");
      const payLine = payType === "hour" ? `$${low} to $${high} an hour, depending on what you bring` : `${money(low)} to ${money(high)} a year, depending on what you bring`;
      const lines = (id: string) => str(v, id).split("\n").map((s) => s.trim()).filter(Boolean);
      const duties = lines("duties");
      const musts = lines("musts");
      const perks = lines("perks");
      const contact = str(v, "contact").trim() || "[how to apply]";

      const text = `${role}${city ? ` — ${city}` : ""}
${biz}
${payLine}

WHAT THIS JOB IS
${duties.length ? duties.map((d) => `- ${d}`).join("\n") : "- [what they will actually be doing day to day]"}

WHAT YOU NEED
${musts.length ? musts.map((m) => `- ${m}`).join("\n") : "- [only the things that are genuinely required]"}

WHAT WE OFFER
${perks.length ? perks.map((p) => `- ${p}`).join("\n") : "- [pay, truck, tools, schedule, time off]"}

WHO WE ARE
${biz} is a ${city ? `${city} ` : ""}shop. We show up when we say we will, we do the work right, and we pay on time. We are not a big outfit and we do not act like one. If you do good work, you will be treated like it matters, because it does.

HOW TO APPLY
${contact}. Tell me what you have worked on and when you can start. I read every one of them.


POSTING NOTES
- Leave the pay range in. Posts with pay get far more responses than posts without.
- Post it on Indeed, your Facebook page, and local trade groups.
- Reply to everyone within 24 hours. Good people are gone in three days.
- Say what the job is before you say what you require. Requirements-first posts read as a warning.`;

      return {
        output: { title: "Your job posting", text, filename: `job-post-${slugify(role) || "role"}.txt` },
        note: "Keep hiring requirements job-related and consistent for everybody. Employment advertising is regulated. If you are unsure how to word a requirement, ask an employment attorney.",
        verdict: { tone: "good", text: "The two things that fix most hiring posts: put the pay in, and answer every applicant within a day." },
      };
    },
  },

  {
    slug: "google-post-writer",
    name: "Google Business Post Writer",
    short: "Google Posts",
    emoji: "📢",
    category: "Generators",
    tagline: "Free real estate most businesses never use",
    description:
      "Google Business Profile lets you post like social media, and almost nobody does it. Write a month of posts in five minutes.",
    who: "Any local business with a Google Business Profile, which should be all of them.",
    problem:
      "Your profile has not been touched in a year. Posting tells Google you are active and gives searchers something to look at.",
    payoff: "Four ready-to-post updates, sized for the platform.",
    steps: [
      "Fill in your business and what is going on this month.",
      "Copy the posts.",
      "Paste them into your Google Business Profile, one a week.",
    ],
    embedHeight: 880,
    fields: [
      { id: "business", label: "Business name", type: "text", def: "", placeholder: "Piney Woods Plumbing" },
      { id: "city", label: "Town", type: "text", def: "", placeholder: "Longview" },
      { id: "service", label: "Main service", type: "text", def: "", placeholder: "plumbing" },
      { id: "offer", label: "Any current offer", type: "text", def: "", placeholder: "Free estimates in September" },
      { id: "season", label: "What season it is", type: "select", def: "summer", options: [
        { value: "spring", label: "Spring" },
        { value: "summer", label: "Summer" },
        { value: "fall", label: "Fall" },
        { value: "winter", label: "Winter" },
      ] },
      { id: "phone", label: "Phone", type: "text", def: "", placeholder: "(903) 500-8898" },
    ],
    run: (v) => {
      const biz = str(v, "business").trim() || "our shop";
      const city = str(v, "city").trim() || "town";
      const service = str(v, "service").trim() || "the work";
      const offer = str(v, "offer").trim();
      const season = str(v, "season", "summer");
      const phone = str(v, "phone").trim();
      const call = phone ? ` Call or text ${prettyPhone(phone)}.` : "";
      const seasonLine: Record<string, string> = {
        spring: "Spring is when the problems you ignored all winter finally show up.",
        summer: "Summer runs everything harder, and heat finds the weak spot first.",
        fall: "Fall is the cheap time to fix what winter is going to break.",
        winter: "Winter does not care that you meant to get to it.",
      };

      const posts = [
        `Serving ${city} and everywhere around it. If you need ${service}, we answer the phone and we show up when we say we will.${call}`,
        `${seasonLine[season]} If something has been nagging at you, get it looked at before it turns into the expensive version.${call}`,
        offer ? `${offer}. That is it, no fine print. ${biz}, right here in ${city}.${call}` : `Free estimates, no trip charge, straight answers. That is how we have always done it at ${biz}.${call}`,
        `Another one finished in ${city} this week. Thanks for trusting us with it. If you need ${service}, we are local, licensed and easy to get a hold of.${call}`,
      ];

      const text = posts.map((p, i) => `POST ${i + 1} (${p.length} characters)\n\n${p}`).join("\n\n\n");

      return {
        output: { title: "Four posts. One a week.", text, filename: "google-business-posts.txt" },
        table: {
          title: "Posting checklist",
          headers: ["Do this", "Why"],
          rows: [
            ["Post at least twice a month", "Google reads activity as a live business"],
            ["Add a real photo every time", "Photos get looked at, text does not"],
            ["Use the Call or Book button", "It turns a viewer into a lead"],
            ["Never repost the same text", "Write four, rotate, then write four more"],
          ],
        },
        note: "Google Business posts expire, most after about a week. That is the point. Post regularly rather than perfectly.",
      };
    },
  },

  {
    slug: "robots-txt-generator",
    name: "Robots.txt Generator",
    short: "Robots.txt",
    emoji: "🕷️",
    category: "Generators",
    tagline: "Tell search engines what to read",
    description:
      "A correct robots.txt for a normal small business website, plus a sitemap line. One wrong character in this file can hide your whole site from Google.",
    who: "Anyone running their own site who wants the basics right.",
    problem:
      "A stray Disallow: / can remove your entire site from search results, and nobody notices for months.",
    payoff: "A safe, correct file you can paste and forget.",
    steps: [
      "Enter your domain.",
      "Pick what you want blocked, if anything.",
      "Save the file as robots.txt at the root of your site.",
    ],
    embedHeight: 760,
    fields: [
      { id: "domain", label: "Your domain", type: "text", def: "", placeholder: "yourbusiness.com" },
      { id: "mode", label: "What do you want", type: "select", def: "open", options: [
        { value: "open", label: "Let search engines read everything (almost always right)" },
        { value: "block-admin", label: "Read everything except admin and cart pages" },
        { value: "closed", label: "Block everything (staging sites only)" },
      ] },
      { id: "extra", label: "Extra paths to block, one per line", type: "textarea", rows: 3, def: "", placeholder: "/thank-you\n/internal" },
    ],
    run: (v) => {
      const domain = normUrl(str(v, "domain"));
      const mode = str(v, "mode", "open");
      const extra = str(v, "extra").split("\n").map((s) => s.trim()).filter(Boolean);

      let body: string;
      if (mode === "closed") {
        body = "User-agent: *\nDisallow: /";
      } else {
        const blocks = mode === "block-admin" ? ["/admin", "/cart", "/checkout", "/wp-admin/", "/login"] : [];
        const all = [...blocks, ...extra.map((e) => (e.startsWith("/") ? e : `/${e}`))];
        body = ["User-agent: *", ...(all.length ? all.map((b) => `Disallow: ${b}`) : ["Disallow:"])].join("\n");
      }

      const text = `${body}${domain ? `\n\nSitemap: ${domain.replace(/\/$/, "")}/sitemap.xml` : ""}`;

      return {
        output: { title: "Save this as robots.txt at the root of your site", text, filename: "robots.txt", mono: true },
        verdict: {
          tone: mode === "closed" ? "bad" : "good",
          text:
            mode === "closed"
              ? "This blocks your entire site from search engines. Only use it on a staging site, and never forget to change it before you go live. This exact mistake has cost real businesses real money."
              : "Check yoursite.com/robots.txt after you upload it. If you see this text, you did it right.",
        },
        note: "Robots.txt controls crawling, not privacy. Anything you truly need private has to be behind a login, not a Disallow line.",
      };
    },
  },
];
