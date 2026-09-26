"""Service tags from a controlled vocabulary.

The directory never copies a business's words. It shows short, plain tags
("oil change", "teeth whitening") chosen from the list below, and only when
the business names that service in its own headings, menus, or short list
items. Paragraphs and sentences are never read for tags.
"""

from __future__ import annotations

import re
from typing import Dict, Iterable, List, Pattern, Tuple

from .html import Page

MAX_TAGS = 12
MAX_TEXT_LEN = 60
MAX_WORDS = 8

SHARED: Tuple[str, ...] = (
    "free estimates", "financing", "emergency service", "24-hour service", "online booking",
    "walk-ins welcome", "appointments", "delivery", "curbside pickup", "gift cards",
)

VOCABULARY: Dict[str, Tuple[str, ...]] = {
    "auto": (
        "oil change", "brake repair", "tire rotation", "tires", "tire repair", "wheel alignment",
        "engine repair", "transmission repair", "transmission service", "ac repair", "state inspection",
        "vehicle inspection", "diagnostics", "check engine light", "battery replacement",
        "suspension repair", "steering repair", "shocks and struts", "exhaust repair", "mufflers",
        "radiator repair", "cooling system service", "fleet service", "auto body repair", "collision repair",
        "paint and body", "dent repair", "paintless dent repair", "windshield replacement", "auto glass",
        "window tinting", "detailing", "car wash", "towing", "roadside assistance", "used cars",
        "new cars", "auto parts", "preventive maintenance", "tune-up", "timing belt", "electrical repair",
        "diesel repair", "truck repair", "emissions testing", "wheels", "lift kits",
        "headlight restoration", "fuel injection service",
    ),
    "restaurants": (
        "breakfast", "brunch", "lunch", "dinner", "catering", "takeout", "drive-thru", "dine-in",
        "happy hour", "private dining", "private events", "kids menu", "gluten-free options",
        "vegetarian options", "tacos", "burgers", "pizza", "barbecue", "bbq", "steaks", "seafood",
        "sandwiches", "salads", "wings", "donuts", "coffee", "espresso", "desserts", "bakery",
        "pastries", "ice cream", "smoothies", "tex-mex", "mexican food", "chinese food", "sushi",
        "vegan options", "craft beer", "cocktails", "wine", "full bar", "patio seating",
        "outdoor seating", "live music", "buffet", "meal prep", "food truck", "family meals",
        "daily specials", "lunch specials",
    ),
    "health-dental": (
        "general dentistry", "cosmetic dentistry", "family dentistry", "pediatric dentistry",
        "teeth whitening", "dental implants", "dentures", "crowns", "bridges", "root canals",
        "fillings", "dental cleanings", "clear aligners", "orthodontics", "braces", "extractions",
        "wisdom teeth", "oral surgery", "periodontics", "gum disease treatment", "sedation dentistry",
        "emergency dental care", "veneers", "primary care", "family medicine", "urgent care",
        "pediatrics", "physical exams", "sports physicals", "vaccinations", "immunizations",
        "lab testing", "telehealth", "chiropractic care", "physical therapy", "eye exams",
        "contact lenses", "eyeglasses", "hearing tests", "hearing aids", "counseling",
        "weight loss", "allergy testing", "dermatology", "prescriptions", "veterinary care",
        "pet vaccinations", "spay and neuter", "new patients welcome",
    ),
    "beauty": (
        "haircuts", "men's haircuts", "kids haircuts", "hair color", "highlights", "balayage",
        "blowouts", "hair extensions", "keratin treatments", "perms", "braids", "locs", "fades",
        "beard trim", "hot towel shave", "manicures", "pedicures", "gel nails", "acrylic nails",
        "dip powder", "nail art", "waxing", "eyebrow threading", "eyebrow waxing", "lash extensions",
        "lash lift", "brow lamination", "facials", "microdermabrasion", "chemical peels",
        "microblading", "makeup", "bridal makeup", "spray tan", "tanning", "massage",
        "massage therapy", "body wraps", "tattoos", "piercings", "laser hair removal",
        "dermal fillers", "skin care", "day spa",
    ),
    "home-services": (
        "plumbing", "drain cleaning", "water heater repair", "water heater installation",
        "leak detection", "sewer line repair", "hvac", "air conditioning", "ac repair", "heating",
        "furnace repair", "heat pumps", "duct cleaning", "electrical repair", "panel upgrades",
        "generators", "lighting installation", "roofing", "roof repair", "roof replacement",
        "gutters", "siding", "window replacement", "garage doors", "interior painting",
        "exterior painting", "drywall", "flooring", "tile", "carpet cleaning", "remodeling",
        "kitchen remodeling", "bathroom remodeling", "cabinets", "countertops", "concrete",
        "foundation repair", "fencing", "decks", "landscaping", "lawn care", "tree service",
        "tree trimming", "irrigation", "pest control", "termite control", "pool service",
        "pressure washing", "house cleaning", "move-out cleaning", "handyman services",
        "appliance repair", "locksmith", "security systems", "septic services", "dry cleaning",
        "alterations", "self-storage", "moving services",
    ),
    "retail": (
        "clothing", "shoes", "boots", "jewelry", "engagement rings", "watches", "gifts", "home decor",
        "furniture", "mattresses", "appliances", "electronics", "cell phones", "phone repair",
        "computers", "books", "toys", "sporting goods", "hunting gear", "fishing gear",
        "outdoor gear", "western wear", "women's clothing", "men's clothing", "kids clothing",
        "accessories", "handbags", "flowers", "floral arrangements", "wedding flowers", "balloons",
        "party supplies", "craft supplies", "fabric", "hardware", "lumber", "paint", "garden center",
        "plants", "pet supplies", "pet food", "groceries", "produce", "meat market", "beer and wine",
        "consignment", "antiques", "custom framing", "embroidery", "screen printing", "uniforms",
        "eyewear", "special orders", "layaway", "gift wrapping",
    ),
    "professional": (
        "tax preparation", "bookkeeping", "payroll", "accounting", "audits", "business consulting",
        "estate planning", "notary services", "insurance", "auto insurance", "home insurance",
        "life insurance", "health insurance", "commercial insurance", "real estate",
        "property management", "home loans", "mortgages", "personal loans", "business loans",
        "checking accounts", "savings accounts", "online banking", "financial planning",
        "retirement planning", "investments", "marketing", "web design", "graphic design",
        "printing", "signs", "photography", "videography", "it support", "computer repair",
        "managed it services", "staffing", "courier services", "surveying", "engineering",
        "architecture", "appraisals", "home inspections", "title insurance", "shipping",
        "copy services",
    ),
    "faith-community": (
        "worship services", "sunday school", "bible study", "youth ministry", "children's ministry",
        "small groups", "prayer meetings", "vacation bible school", "choir", "worship music",
        "missions", "outreach", "food pantry", "clothing closet", "counseling", "support groups",
        "recovery groups", "community events", "volunteer opportunities", "weddings", "funerals",
        "baptisms", "senior ministry", "men's ministry", "women's ministry", "online services",
        "live stream", "donations", "after-school programs", "food bank", "shelter",
    ),
    "lodging-recreation": (
        "free breakfast", "free wi-fi", "pool", "outdoor pool", "indoor pool", "fitness center",
        "pet friendly", "free parking", "meeting rooms", "event space", "extended stay", "suites",
        "rv sites", "full hookups", "camping", "cabins", "bowling", "arcade", "laser tag",
        "escape room", "mini golf", "golf", "driving range", "trampoline park", "birthday parties",
        "group rates", "movies", "live music", "concerts", "theater", "museum", "exhibits",
        "guided tours", "art classes", "fitness classes", "personal training", "yoga", "pilates",
        "martial arts", "karate", "dance classes", "swim lessons", "gymnastics", "batting cages",
        "shuttle service", "banquet hall", "wedding venue",
    ),
    "education-childcare": (
        "infant care", "toddler care", "preschool", "pre-k", "after-school care", "before-school care",
        "summer camp", "daycare", "child care", "drop-in care", "tutoring", "test prep",
        "reading tutoring", "math tutoring", "homeschool support", "music lessons", "piano lessons",
        "guitar lessons", "voice lessons", "dance lessons", "art lessons", "driver education",
        "cdl training", "welding classes", "cosmetology school", "cpr training", "first aid training",
        "esl classes", "ged prep", "computer classes", "private school", "montessori",
        "stem programs", "meals provided", "now enrolling", "speech therapy",
    ),
    "industrial": (
        "welding", "fabrication", "machining", "cnc machining", "metal fabrication", "sandblasting",
        "powder coating", "trucking", "freight", "hauling", "heavy hauling", "flatbed", "logistics",
        "warehousing", "distribution", "wholesale", "oilfield services", "pipe supply", "valves",
        "pumps", "compressors", "hydraulics", "hydraulic repair", "industrial supplies",
        "safety supplies", "equipment rental", "crane services", "excavation", "dirt work",
        "land clearing", "demolition", "paving", "asphalt", "concrete", "aggregates", "scrap metal",
        "recycling", "waste disposal", "roll-off dumpsters", "dumpster rental", "forklift repair",
        "engine rebuilding", "electrical contracting", "industrial cleaning", "environmental services",
        "testing and inspection", "trailer sales", "trailer repair", "custom manufacturing",
        "packaging",
    ),
    "other": (
        "funeral services", "cremation", "memorial services", "pre-planning", "laundromat",
        "wash and fold", "alterations", "tailoring", "pet grooming", "pet boarding", "dog training",
        "notary services", "shipping", "key cutting", "shoe repair",
    ),
}


def _word_pattern(word: str) -> str:
    if word.endswith("ies") and len(word) > 4:
        return re.escape(word[:-3]) + "(?:y|ies)"
    if word.endswith("s") and not word.endswith("ss") and len(word) > 3:
        return re.escape(word[:-1]) + "(?:s|es)?"
    if word.endswith("y") and len(word) > 3 and word[-2] not in "aeiou":
        return re.escape(word[:-1]) + "(?:y|ies)"
    if word[-1:].isalpha():
        return re.escape(word) + "(?:s|es)?"
    return re.escape(word)


def phrase_pattern(phrase: str) -> Pattern[str]:
    """Word-boundary, case-insensitive, plural-tolerant pattern for one tag."""
    parts = [p for p in re.split(r"(\s+|-)", phrase.lower()) if p]
    last_word = max(i for i, p in enumerate(parts) if not p.isspace() and p != "-")
    out = []
    for i, part in enumerate(parts):
        if part.isspace():
            out.append(r"[\s\-]+")
        elif part == "-":
            out.append(r"[\s\-]?")
        else:
            piece = _word_pattern(part) if i == last_word else re.escape(part)
            out.append(piece.replace("'", "['\u2019]?"))
    return re.compile(r"(?<![\w])" + "".join(out) + r"(?![\w])", re.I)


_COMPILED: Dict[str, List[Tuple[str, Pattern[str]]]] = {}


def _patterns(category: str) -> Tuple[List[Tuple[str, Pattern[str]]], List[Tuple[str, Pattern[str]]]]:
    if category not in _COMPILED:
        _COMPILED[category] = [(tag, phrase_pattern(tag)) for tag in VOCABULARY.get(category, ())]
    if "__shared__" not in _COMPILED:
        _COMPILED["__shared__"] = [(tag, phrase_pattern(tag)) for tag in SHARED]
    return _COMPILED[category], _COMPILED["__shared__"]


def _candidates(page: Page) -> List[str]:
    texts: Iterable[str] = [t for _, t in page.headings] + list(page.nav_texts) + list(page.list_items)
    out: List[str] = []
    for text in texts:
        text = (text or "").strip()
        if not text or len(text) > MAX_TEXT_LEN:
            continue
        if len(text.split()) > MAX_WORDS or re.search(r"[.!?]$", text):
            continue  # a sentence, not a menu item or heading
        out.append(text.replace("&", " and "))
    return out


# A clause that says the business does NOT offer something: "No delivery",
# "Takeout only, no delivery", "We don't offer financing", "All services except
# towing", "Delivery not available".
_NEGATION_RE = re.compile(
    r"(?<![\w])(?:no|not|never|without|except|excluding|none|unavailable|nor)(?![\w])"
    r"|n['\u2019]t(?![\w])|(?<![\w])do\s+not(?![\w])|(?<![\w])no\s+longer(?![\w])",
    re.I,
)
# Clause breaks inside one heading or list item. A hyphen inside a word
# ("walk-ins", "dine-in") is not a break; a spaced dash is.
_CLAUSE_SPLIT_RE = re.compile(r"\s+[-\u2013\u2014|/\u2022]\s+|[,;:()\[\]]|\s+but\s+", re.I)
# A following clause that only denies the item: "Delivery: No", "Delivery - not available".
_DENIAL_CLAUSE_RE = re.compile(
    r"^\s*(?:no|none|n/a|unavailable|not\s+(?:available|offered|accepted|provided)|"
    r"no\s+longer(?:\s+\w+)?|(?:currently\s+)?not\s+(?:available|offered))\s*$",
    re.I,
)


def _affirmed(pattern: Pattern[str], text: str) -> bool:
    """True when ``text`` names the phrase without negating it."""
    clauses = [c for c in _CLAUSE_SPLIT_RE.split(text) if c is not None]
    for i, clause in enumerate(clauses):
        for m in pattern.finditer(clause):
            if _NEGATION_RE.search(clause):
                break  # "no delivery", "delivery not available", "only takeout, no ..." in one clause
            following = clauses[i + 1] if i + 1 < len(clauses) else ""
            if following and _DENIAL_CLAUSE_RE.match(following):
                break
            return True
    return False


def service_tags(page: Page, category: str) -> List[str]:
    """Sorted unique vocabulary tags named in headings, nav, or short list items (max 12).

    A heading or item that negates the phrase ("No delivery", "We don't offer
    financing", "Takeout only - no delivery") never produces that tag.
    """
    own, shared = _patterns(category)
    texts = _candidates(page)
    specific = sorted({tag for tag, pat in own if any(_affirmed(pat, t) for t in texts)})
    common = sorted({tag for tag, pat in shared if any(_affirmed(pat, t) for t in texts)} - set(specific))
    return sorted((specific + common)[:MAX_TAGS])
