"""NAICS codes mapped to the directory's friendly categories.

The longest matching prefix wins, so a six-digit exception (a residential
remodeler inside construction) can sit next to its two-digit sector. Labels are
plain words a visitor understands; they describe the kind of business, never
its quality.
"""

from __future__ import annotations

import sqlite3
from typing import Mapping, Optional, Tuple

CATEGORIES: Tuple[Tuple[str, str], ...] = (
    ("restaurants", "Restaurants & Food"),
    ("auto", "Auto"),
    ("health-dental", "Health & Dental"),
    ("beauty", "Beauty & Personal Care"),
    ("home-services", "Home Services"),
    ("retail", "Retail & Shopping"),
    ("professional", "Professional Services"),
    ("faith-community", "Faith & Community"),
    ("lodging-recreation", "Lodging, Arts & Recreation"),
    ("education-childcare", "Education & Childcare"),
    ("industrial", "Industrial, Wholesale & Transport"),
    ("other", "Other Services"),
)

CATEGORY_NAMES = dict(CATEGORIES)
FALLBACK = ("other", "Other services")

# prefix -> (category slug, label)
NAICS_MAP: Mapping[str, Tuple[str, str]] = {
    # 11 Agriculture, 21 Mining and oil and gas, 22 Utilities
    "11": ("industrial", "Agriculture and forestry"),
    "111": ("industrial", "Farm"),
    "112": ("industrial", "Ranch and livestock"),
    "113": ("industrial", "Timber and logging"),
    "1153": ("industrial", "Forestry support services"),
    "21": ("industrial", "Mining, oil, and gas"),
    "211": ("industrial", "Oil and gas extraction"),
    "213": ("industrial", "Oilfield services"),
    "22": ("industrial", "Utility"),
    # 23 Construction
    "23": ("industrial", "Construction"),
    "236": ("industrial", "Building construction"),
    "236115": ("home-services", "Home builder"),
    "236116": ("home-services", "Home builder"),
    "236118": ("home-services", "Residential remodeler"),
    "237": ("industrial", "Heavy and civil construction"),
    "238": ("home-services", "Specialty trade contractor"),
    "23811": ("home-services", "Foundation and concrete contractor"),
    "23813": ("home-services", "Framing contractor"),
    "23814": ("home-services", "Masonry contractor"),
    "23816": ("home-services", "Roofing contractor"),
    "23817": ("home-services", "Siding contractor"),
    "23821": ("home-services", "Electrical contractor"),
    "23822": ("home-services", "Plumbing, heating, and air conditioning contractor"),
    "23831": ("home-services", "Drywall and insulation contractor"),
    "23832": ("home-services", "Painting contractor"),
    "23833": ("home-services", "Flooring contractor"),
    "23834": ("home-services", "Tile and terrazzo contractor"),
    "23835": ("home-services", "Finish carpentry contractor"),
    "23891": ("home-services", "Site preparation contractor"),
    "23899": ("home-services", "Specialty trade contractor"),
    # 31-33 Manufacturing
    "31": ("industrial", "Manufacturing"),
    "32": ("industrial", "Manufacturing"),
    "33": ("industrial", "Manufacturing"),
    "311": ("industrial", "Food manufacturing"),
    "311811": ("restaurants", "Retail bakery"),
    "312": ("industrial", "Beverage manufacturing"),
    "3121": ("industrial", "Beverage manufacturing"),
    "321": ("industrial", "Wood products manufacturing"),
    "323": ("professional", "Printing"),
    "324": ("industrial", "Petroleum products manufacturing"),
    "325": ("industrial", "Chemical manufacturing"),
    "326": ("industrial", "Plastics and rubber manufacturing"),
    "327": ("industrial", "Stone, glass, and concrete products"),
    "331": ("industrial", "Metal manufacturing"),
    "332": ("industrial", "Fabricated metal products"),
    "3327": ("industrial", "Machine shop"),
    "333": ("industrial", "Machinery manufacturing"),
    "336": ("industrial", "Transportation equipment manufacturing"),
    "337": ("industrial", "Furniture manufacturing"),
    "339": ("industrial", "Miscellaneous manufacturing"),
    "339116": ("health-dental", "Dental laboratory"),
    # 42 Wholesale
    "42": ("industrial", "Wholesale"),
    "423": ("industrial", "Wholesale, durable goods"),
    "424": ("industrial", "Wholesale, nondurable goods"),
    "425": ("industrial", "Wholesale trade agent"),
    # 44-45 Retail
    "44": ("retail", "Retail store"),
    "45": ("retail", "Retail store"),
    "441": ("auto", "Auto dealer and parts"),
    "4411": ("auto", "Car dealer"),
    "44111": ("auto", "New car dealer"),
    "44112": ("auto", "Used car dealer"),
    "4412": ("auto", "RV, boat, and motorcycle dealer"),
    "4413": ("auto", "Auto parts and tire store"),
    "441330": ("auto", "Auto parts store"),
    "441340": ("auto", "Tire dealer"),
    "44132": ("auto", "Tire dealer"),
    "44131": ("auto", "Auto parts store"),
    "442": ("retail", "Furniture and home furnishings store"),
    "443": ("retail", "Electronics and appliance store"),
    "444": ("retail", "Building material and garden supply store"),
    "4442": ("retail", "Lawn and garden store"),
    "445": ("retail", "Grocery and food store"),
    "4451": ("retail", "Grocery store"),
    "445131": ("retail", "Convenience store"),
    "44512": ("retail", "Convenience store"),
    "4452": ("retail", "Specialty food store"),
    "4453": ("retail", "Beer, wine, and liquor store"),
    "445320": ("retail", "Beer, wine, and liquor store"),
    "446": ("health-dental", "Pharmacy and health store"),
    "44611": ("health-dental", "Pharmacy"),
    "44612": ("beauty", "Cosmetics and beauty supply store"),
    "44613": ("health-dental", "Optical goods store"),
    "447": ("auto", "Gas station"),
    "448": ("retail", "Clothing and accessories store"),
    "4483": ("retail", "Jewelry, luggage, and leather goods store"),
    "449": ("retail", "Furniture, electronics, and appliance store"),
    "451": ("retail", "Sporting goods, hobby, music, and book store"),
    "452": ("retail", "General merchandise store"),
    "453": ("retail", "Miscellaneous store"),
    "4531": ("retail", "Florist"),
    "45321": ("retail", "Office supply and stationery store"),
    "45322": ("retail", "Gift and novelty store"),
    "45331": ("retail", "Used merchandise store"),
    "45391": ("retail", "Pet and pet supply store"),
    "453991": ("retail", "Tobacco and vape store"),
    "454": ("retail", "Nonstore retailer"),
    "4541": ("retail", "Online and mail-order retailer"),
    "4543": ("retail", "Direct seller"),
    "454310": ("retail", "Fuel dealer"),
    "455": ("retail", "General merchandise store"),
    "456": ("health-dental", "Pharmacy and health store"),
    "456110": ("health-dental", "Pharmacy"),
    "456120": ("beauty", "Cosmetics and beauty supply store"),
    "456130": ("health-dental", "Optical goods store"),
    "457": ("auto", "Gas station and fuel dealer"),
    "457110": ("auto", "Gas station with convenience store"),
    "457120": ("auto", "Gas station"),
    "457210": ("retail", "Fuel dealer"),
    "458": ("retail", "Clothing, shoe, and jewelry store"),
    "459": ("retail", "Sporting goods, hobby, book, and specialty store"),
    "459310": ("retail", "Florist"),
    "459510": ("retail", "Used merchandise store"),
    "459910": ("retail", "Pet and pet supply store"),
    "459991": ("retail", "Tobacco and vape store"),
    # 48-49 Transportation and warehousing
    "48": ("industrial", "Transportation"),
    "49": ("industrial", "Warehousing and delivery"),
    "484": ("industrial", "Trucking"),
    "485": ("industrial", "Passenger transportation"),
    "4853": ("auto", "Taxi and limousine service"),
    "488": ("industrial", "Transportation support"),
    "48841": ("auto", "Towing"),
    "492": ("industrial", "Courier and delivery"),
    "493": ("industrial", "Warehousing and storage"),
    # 51 Information
    "51": ("professional", "Information and media"),
    "512": ("lodging-recreation", "Movie theater and media production"),
    "51213": ("lodging-recreation", "Movie theater"),
    "515": ("professional", "Radio and television"),
    "517": ("professional", "Telecommunications"),
    "518": ("professional", "Data processing and hosting"),
    "519": ("professional", "Information services"),
    # 52 Finance and insurance
    "52": ("professional", "Finance and insurance"),
    "522": ("professional", "Bank, credit union, or lender"),
    "5221": ("professional", "Bank or credit union"),
    "5222": ("professional", "Lender"),
    "5223": ("professional", "Loan broker and financial services"),
    "523": ("professional", "Investment services"),
    "524": ("professional", "Insurance"),
    "5242": ("professional", "Insurance agency"),
    # 53 Real estate and rental
    "53": ("professional", "Real estate and rental"),
    "531": ("professional", "Real estate"),
    "5311": ("professional", "Property rental and leasing"),
    "5312": ("professional", "Real estate agent or broker"),
    "5313": ("professional", "Property management and appraisal"),
    "53113": ("home-services", "Self-storage"),
    "532": ("retail", "Rental and leasing"),
    "5321": ("auto", "Car and truck rental"),
    "532111": ("auto", "Car rental"),
    "5322": ("retail", "Consumer goods rental"),
    "532282": ("lodging-recreation", "Video rental"),
    "5324": ("industrial", "Equipment rental and leasing"),
    # 54 Professional, scientific, technical
    "54": ("professional", "Professional services"),
    "5411": ("professional", "Legal services"),
    "5412": ("professional", "Accounting, tax, and bookkeeping"),
    "5413": ("professional", "Architecture and engineering"),
    "54137": ("professional", "Surveying and mapping"),
    "5414": ("professional", "Design services"),
    "5415": ("professional", "Computer and IT services"),
    "5416": ("professional", "Consulting"),
    "5417": ("professional", "Research and development"),
    "5418": ("professional", "Advertising and marketing"),
    "5419": ("professional", "Professional services"),
    "54192": ("professional", "Photography"),
    "54194": ("health-dental", "Veterinarian"),
    "541940": ("health-dental", "Veterinarian"),
    # 55 Management of companies
    "55": ("professional", "Company management"),
    # 56 Administrative and support, waste
    "56": ("professional", "Business support services"),
    "5613": ("professional", "Staffing agency"),
    "5614": ("professional", "Business support services"),
    "5615": ("lodging-recreation", "Travel agency"),
    "5616": ("professional", "Security and investigation services"),
    "56162": ("home-services", "Security system and locksmith service"),
    "561622": ("home-services", "Locksmith"),
    "5617": ("home-services", "Services to buildings and homes"),
    "56171": ("home-services", "Pest control"),
    "56172": ("home-services", "Cleaning and janitorial service"),
    "56173": ("home-services", "Landscaping and lawn care"),
    "56174": ("home-services", "Carpet and upholstery cleaning"),
    "56179": ("home-services", "Building and home services"),
    "562": ("industrial", "Waste management"),
    "56299": ("home-services", "Septic and waste services"),
    # 61 Educational services
    "61": ("education-childcare", "School or training"),
    "6111": ("education-childcare", "School"),
    "6112": ("education-childcare", "College"),
    "6113": ("education-childcare", "College or university"),
    "6114": ("education-childcare", "Business and computer training"),
    "6115": ("education-childcare", "Technical and trade school"),
    "6116": ("education-childcare", "Lessons and instruction"),
    "61162": ("lodging-recreation", "Sports and recreation instruction"),
    "61169": ("education-childcare", "Lessons and tutoring"),
    "61171": ("education-childcare", "Educational support services"),
    # 62 Health care and social assistance
    "62": ("health-dental", "Health care"),
    "6211": ("health-dental", "Physician office"),
    "6212": ("health-dental", "Dentist office"),
    "621210": ("health-dental", "Dentist office"),
    "6213": ("health-dental", "Other health practitioner"),
    "62131": ("health-dental", "Chiropractor"),
    "62132": ("health-dental", "Optometrist"),
    "62133": ("health-dental", "Mental health practitioner"),
    "62134": ("health-dental", "Physical, occupational, and speech therapy"),
    "62139": ("health-dental", "Health practitioner"),
    "6214": ("health-dental", "Outpatient care center"),
    "6215": ("health-dental", "Medical and diagnostic laboratory"),
    "6216": ("health-dental", "Home health care"),
    "6219": ("health-dental", "Ambulance and other health services"),
    "622": ("health-dental", "Hospital"),
    "623": ("health-dental", "Nursing and residential care"),
    "624": ("faith-community", "Social and community services"),
    "6241": ("faith-community", "Individual and family services"),
    "6242": ("faith-community", "Food bank and emergency relief"),
    "6243": ("faith-community", "Vocational rehabilitation"),
    "6244": ("education-childcare", "Child care"),
    # 71 Arts, entertainment, recreation
    "71": ("lodging-recreation", "Arts, entertainment, and recreation"),
    "711": ("lodging-recreation", "Performing arts and sports"),
    "712": ("lodging-recreation", "Museum or historical site"),
    "713": ("lodging-recreation", "Amusement and recreation"),
    "71394": ("lodging-recreation", "Fitness and recreation center"),
    "71395": ("lodging-recreation", "Bowling center"),
    "71391": ("lodging-recreation", "Golf course"),
    "71312": ("lodging-recreation", "Arcade"),
    # 72 Accommodation and food services
    "72": ("restaurants", "Food service"),
    "721": ("lodging-recreation", "Hotels and lodging"),
    "72111": ("lodging-recreation", "Hotel or motel"),
    "7212": ("lodging-recreation", "RV park and campground"),
    "722": ("restaurants", "Restaurant"),
    "7223": ("restaurants", "Catering and food service"),
    "72231": ("restaurants", "Food service contractor"),
    "72232": ("restaurants", "Caterer"),
    "72233": ("restaurants", "Food truck"),
    "7224": ("restaurants", "Bar"),
    "7225": ("restaurants", "Restaurant"),
    "722511": ("restaurants", "Full-service restaurant"),
    "722513": ("restaurants", "Fast food and counter-service restaurant"),
    "722514": ("restaurants", "Cafeteria or buffet"),
    "722515": ("restaurants", "Coffee shop, snack bar, or dessert shop"),
    # 81 Other services
    "81": ("other", "Other services"),
    "811": ("home-services", "Repair and maintenance"),
    "8111": ("auto", "Automotive repair and maintenance"),
    "81111": ("auto", "Auto repair shop"),
    "81112": ("auto", "Auto body and glass repair"),
    "811121": ("auto", "Auto body and paint shop"),
    "811122": ("auto", "Auto glass shop"),
    "81119": ("auto", "Auto maintenance"),
    "811191": ("auto", "Oil change and lube shop"),
    "811192": ("auto", "Car wash"),
    "811198": ("auto", "Auto service"),
    "8112": ("home-services", "Electronics repair"),
    "8113": ("industrial", "Machinery and equipment repair"),
    "8114": ("home-services", "Home and personal goods repair"),
    "81141": ("home-services", "Appliance and household repair"),
    "81142": ("home-services", "Furniture repair and upholstery"),
    "81143": ("retail", "Shoe and leather repair"),
    "812": ("other", "Personal services"),
    "8121": ("beauty", "Personal care"),
    "812111": ("beauty", "Barber shop"),
    "812112": ("beauty", "Hair, nail, and beauty salon"),
    "812113": ("beauty", "Nail salon"),
    "812191": ("beauty", "Day spa"),
    "812199": ("beauty", "Personal care service"),
    "8122": ("other", "Funeral home and cemetery"),
    "8123": ("home-services", "Dry cleaning and laundry"),
    "81231": ("home-services", "Laundromat"),
    "81232": ("home-services", "Dry cleaner"),
    "8129": ("other", "Other personal services"),
    "81291": ("retail", "Pet care"),
    "81292": ("professional", "Photofinishing"),
    "81293": ("auto", "Parking lot or garage"),
    "813": ("faith-community", "Religious, civic, or community organization"),
    "8131": ("faith-community", "Religious organization"),
    "8132": ("faith-community", "Charitable foundation"),
    "8133": ("faith-community", "Social advocacy organization"),
    "8134": ("faith-community", "Civic and social organization"),
    "8139": ("faith-community", "Business, professional, or membership organization"),
    "814": ("other", "Private household"),
    # 92 Public administration
    "92": ("other", "Public administration"),
}

# OSM tag hints, used only when a record has no NAICS code.
_OSM_AMENITY = {
    "restaurant": ("restaurants", "Restaurant"),
    "fast_food": ("restaurants", "Fast food and counter-service restaurant"),
    "cafe": ("restaurants", "Coffee shop, snack bar, or dessert shop"),
    "bar": ("restaurants", "Bar"),
    "pub": ("restaurants", "Bar"),
    "biergarten": ("restaurants", "Bar"),
    "ice_cream": ("restaurants", "Coffee shop, snack bar, or dessert shop"),
    "food_court": ("restaurants", "Restaurant"),
    "dentist": ("health-dental", "Dentist office"),
    "doctors": ("health-dental", "Physician office"),
    "clinic": ("health-dental", "Outpatient care center"),
    "hospital": ("health-dental", "Hospital"),
    "pharmacy": ("health-dental", "Pharmacy"),
    "veterinary": ("health-dental", "Veterinarian"),
    "place_of_worship": ("faith-community", "Religious organization"),
    "childcare": ("education-childcare", "Child care"),
    "kindergarten": ("education-childcare", "Child care"),
    "driving_school": ("education-childcare", "Lessons and instruction"),
    "bank": ("professional", "Bank or credit union"),
    "fuel": ("auto", "Gas station"),
    "car_wash": ("auto", "Car wash"),
    "car_rental": ("auto", "Car rental"),
    "cinema": ("lodging-recreation", "Movie theater"),
    "theatre": ("lodging-recreation", "Performing arts"),
    "nightclub": ("lodging-recreation", "Nightclub"),
    "dojo": ("lodging-recreation", "Sports and recreation instruction"),
}
_OSM_SHOP = {
    "car_repair": ("auto", "Auto repair shop"),
    "tyres": ("auto", "Tire dealer"),
    "car": ("auto", "Car dealer"),
    "car_parts": ("auto", "Auto parts store"),
    "motorcycle": ("auto", "RV, boat, and motorcycle dealer"),
    "hairdresser": ("beauty", "Hair, nail, and beauty salon"),
    "beauty": ("beauty", "Personal care service"),
    "cosmetics": ("beauty", "Cosmetics and beauty supply store"),
    "massage": ("beauty", "Personal care service"),
    "tattoo": ("beauty", "Personal care service"),
    "optician": ("health-dental", "Optical goods store"),
    "chemist": ("health-dental", "Pharmacy and health store"),
    "medical_supply": ("health-dental", "Pharmacy and health store"),
    "hearing_aids": ("health-dental", "Health practitioner"),
    "dry_cleaning": ("home-services", "Dry cleaner"),
    "laundry": ("home-services", "Laundromat"),
    "funeral_directors": ("other", "Funeral home and cemetery"),
    "pet_grooming": ("retail", "Pet care"),
    "bakery": ("restaurants", "Retail bakery"),
}
_OSM_TOURISM = {
    "hotel": ("lodging-recreation", "Hotel or motel"),
    "motel": ("lodging-recreation", "Hotel or motel"),
    "guest_house": ("lodging-recreation", "Hotels and lodging"),
}
_OSM_LEISURE = {
    "fitness_centre": ("lodging-recreation", "Fitness and recreation center"),
    "sports_centre": ("lodging-recreation", "Fitness and recreation center"),
    "bowling_alley": ("lodging-recreation", "Bowling center"),
}


def _digits(naics: Optional[str]) -> str:
    return "".join(ch for ch in str(naics or "") if ch.isdigit())


def categorize(naics: Optional[str], osm_tags: Optional[Mapping[str, str]] = None) -> Tuple[str, str]:
    """(category slug, label). NAICS first; OSM tags only when NAICS is absent."""
    code = _digits(naics)
    if code:
        for size in range(len(code), 1, -1):
            hit = NAICS_MAP.get(code[:size])
            if hit:
                return hit
        return FALLBACK
    tags = osm_tags or {}
    if tags.get("amenity") in _OSM_AMENITY:
        return _OSM_AMENITY[tags["amenity"]]
    if tags.get("healthcare"):
        return ("health-dental", "Health care")
    if tags.get("shop") in _OSM_SHOP:
        return _OSM_SHOP[tags["shop"]]
    if tags.get("tourism") in _OSM_TOURISM:
        return _OSM_TOURISM[tags["tourism"]]
    if tags.get("leisure") in _OSM_LEISURE:
        return _OSM_LEISURE[tags["leisure"]]
    if tags.get("craft"):
        return ("home-services", "Trade and craft")
    if tags.get("office"):
        return ("professional", "Professional services")
    if tags.get("shop"):
        return ("retail", "Retail store")
    taxonomy = (tags.get("taxonomy") or "").lower()
    if taxonomy:
        if "dent" in taxonomy:
            return ("health-dental", "Dentist office")
        return ("health-dental", "Health care")
    return FALLBACK


def seed(conn: sqlite3.Connection) -> None:
    """Write both lookup tables. Idempotent."""
    for order, (slug, name) in enumerate(CATEGORIES):
        conn.execute(
            "INSERT INTO categories(slug, name, sort_order) VALUES (?,?,?)"
            " ON CONFLICT(slug) DO UPDATE SET name=excluded.name, sort_order=excluded.sort_order",
            (slug, name, order),
        )
    for prefix, (slug, label) in NAICS_MAP.items():
        conn.execute(
            "INSERT INTO category_naics(prefix, slug, label) VALUES (?,?,?)"
            " ON CONFLICT(prefix) DO UPDATE SET slug=excluded.slug, label=excluded.label",
            (prefix, slug, label),
        )
