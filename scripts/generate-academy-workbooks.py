from __future__ import annotations

import json
import os
import sys
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    KeepTogether,
    NextPageTemplate,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "tmp" / "academy-workbook-data.json"
OUTPUT_DIR = ROOT / "public" / "downloads" / "operator-academy"

PALETTES = [
    ("#071B2F", "#0B63CE", "#20D5C7"),
    ("#171226", "#7C3AED", "#F0ABFC"),
    ("#102416", "#178A52", "#C6F36A"),
    ("#231B0D", "#BC6F18", "#FFD66B"),
    ("#20121D", "#C23B75", "#FFB4D2"),
    ("#071F24", "#087E8B", "#5CE1E6"),
    ("#13172B", "#445EE2", "#A9B8FF"),
    ("#25140F", "#D04B24", "#FFC2A8"),
    ("#121D28", "#0E88C7", "#8AD9FF"),
    ("#111827", "#334155", "#FBBF24"),
]


def safe_text(value: object) -> str:
    return str(value or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def register_fonts() -> tuple[str, str]:
    candidates = [
        (Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"), Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf")),
        (Path("/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf"), Path("/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf")),
    ]
    for regular, bold in candidates:
        if regular.exists() and bold.exists():
            pdfmetrics.registerFont(TTFont("AcademyBody", str(regular)))
            pdfmetrics.registerFont(TTFont("AcademyBold", str(bold)))
            return "AcademyBody", "AcademyBold"
    return "Helvetica", "Helvetica-Bold"


BODY_FONT, BOLD_FONT = register_fonts()


class AcademyDoc(BaseDocTemplate):
    def __init__(self, filename: str, course: dict, palette: tuple[str, str, str]):
        super().__init__(
            filename,
            pagesize=letter,
            leftMargin=0.72 * inch,
            rightMargin=0.72 * inch,
            topMargin=0.68 * inch,
            bottomMargin=0.66 * inch,
            title=f"{course['shortTitle']} Workbook",
            author="The LeadFlow Pro and Longview Training Center LLC",
            subject="Operator Academy course workbook",
        )
        self.course = course
        self.dark, self.mid, self.accent = [colors.HexColor(value) for value in palette]
        frame = Frame(self.leftMargin, self.bottomMargin, self.width, self.height, id="normal")
        self.addPageTemplates([
            PageTemplate(id="cover", frames=[frame], onPage=self.draw_cover_page),
            PageTemplate(id="body", frames=[frame], onPage=self.draw_body_page),
        ])

    def draw_cover_page(self, canvas, doc):
        canvas.saveState()
        canvas.setFillColor(self.dark)
        canvas.rect(0, 0, letter[0], letter[1], fill=1, stroke=0)
        canvas.setFillColor(self.mid)
        canvas.circle(letter[0] - 35, letter[1] - 55, 160, fill=1, stroke=0)
        canvas.setFillColor(self.accent)
        canvas.rect(0, 0, letter[0], 16, fill=1, stroke=0)
        canvas.restoreState()

    def draw_body_page(self, canvas, doc):
        canvas.saveState()
        canvas.setStrokeColor(colors.HexColor("#D6DEE8"))
        canvas.line(self.leftMargin, letter[1] - 34, letter[0] - self.rightMargin, letter[1] - 34)
        canvas.setFont(BOLD_FONT, 8)
        canvas.setFillColor(self.mid)
        canvas.drawString(self.leftMargin, letter[1] - 26, f"{self.course['code']}  |  {self.course['shortTitle']}")
        canvas.setFont(BODY_FONT, 8)
        canvas.setFillColor(colors.HexColor("#667789"))
        canvas.drawRightString(letter[0] - self.rightMargin, 24, f"Operator Academy  |  {doc.page}")
        canvas.restoreState()


def styles_for(palette: tuple[str, str, str]):
    dark, mid, accent = [colors.HexColor(value) for value in palette]
    styles = getSampleStyleSheet()
    return {
        "cover_kicker": ParagraphStyle("cover_kicker", parent=styles["Normal"], fontName=BOLD_FONT, fontSize=10, leading=14, textColor=accent, spaceAfter=18, uppercase=True),
        "cover_title": ParagraphStyle("cover_title", parent=styles["Title"], fontName=BOLD_FONT, fontSize=34, leading=36, textColor=colors.white, alignment=TA_LEFT, spaceAfter=18),
        "cover_body": ParagraphStyle("cover_body", parent=styles["BodyText"], fontName=BODY_FONT, fontSize=12, leading=19, textColor=colors.HexColor("#DCEAF6"), spaceAfter=16),
        "h1": ParagraphStyle("h1", parent=styles["Heading1"], fontName=BOLD_FONT, fontSize=24, leading=28, textColor=dark, spaceBefore=6, spaceAfter=14),
        "h2": ParagraphStyle("h2", parent=styles["Heading2"], fontName=BOLD_FONT, fontSize=15, leading=19, textColor=mid, spaceBefore=15, spaceAfter=7),
        "h3": ParagraphStyle("h3", parent=styles["Heading3"], fontName=BOLD_FONT, fontSize=10, leading=14, textColor=dark, spaceBefore=9, spaceAfter=4, uppercase=True),
        "body": ParagraphStyle("body", parent=styles["BodyText"], fontName=BODY_FONT, fontSize=9.3, leading=14, textColor=colors.HexColor("#27384A"), spaceAfter=8),
        "small": ParagraphStyle("small", parent=styles["BodyText"], fontName=BODY_FONT, fontSize=7.5, leading=11, textColor=colors.HexColor("#607184"), spaceAfter=5),
        "prompt": ParagraphStyle("prompt", parent=styles["Code"], fontName=BODY_FONT, fontSize=8.2, leading=12, textColor=colors.HexColor("#102235"), backColor=colors.HexColor("#EEF4FA"), borderColor=colors.HexColor("#C7D5E4"), borderWidth=0.6, borderPadding=10, spaceAfter=10),
        "line": ParagraphStyle("line", parent=styles["BodyText"], fontName=BODY_FONT, fontSize=9, leading=15, textColor=colors.HexColor("#94A3B8"), spaceAfter=2),
    }


def checkbox(text: str, style) -> Paragraph:
    return Paragraph(f"&#9633;&nbsp;&nbsp;{safe_text(text)}", style)


def build_workbook(course: dict, index: int) -> Path:
    palette = PALETTES[index % len(PALETTES)]
    dark, mid, accent = [colors.HexColor(value) for value in palette]
    style = styles_for(palette)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    output = OUTPUT_DIR / f"{course['slug']}-workbook.pdf"
    doc = AcademyDoc(str(output), course, palette)
    story = []
    story += [Spacer(1, 0.65 * inch), Paragraph(f"{safe_text(course['code'])} &nbsp; OPERATOR ACADEMY", style["cover_kicker"]), Paragraph(f"{safe_text(course['shortTitle'])}<br/><font size='20'>Operator Workbook</font>", style["cover_title"]), Paragraph(safe_text(course["description"]), style["cover_body"]), Spacer(1, 0.2 * inch)]
    cover_table = Table([
        [Paragraph("LEARN", style["small"]), Paragraph("PRACTICE", style["small"]), Paragraph("CHECK", style["small"]), Paragraph("BUILD", style["small"])],
        [Paragraph(str(len(course["lessons"])), style["h1"]), Paragraph("Every lesson", style["body"]), Paragraph("80% pass", style["body"]), Paragraph("Capstone", style["body"])],
    ], colWidths=[doc.width / 4] * 4)
    cover_table.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), colors.Color(1,1,1,alpha=.08)), ("BOX", (0,0), (-1,-1), .8, colors.Color(1,1,1,alpha=.25)), ("INNERGRID", (0,0), (-1,-1), .5, colors.Color(1,1,1,alpha=.16)), ("TEXTCOLOR", (0,0), (-1,-1), colors.white), ("VALIGN", (0,0), (-1,-1), "MIDDLE"), ("LEFTPADDING", (0,0), (-1,-1), 10), ("RIGHTPADDING", (0,0), (-1,-1), 10), ("TOPPADDING", (0,0), (-1,-1), 10), ("BOTTOMPADDING", (0,0), (-1,-1), 10)]))
    story += [cover_table, Spacer(1, 1.2 * inch), Paragraph("The LeadFlow Pro  |  Longview Training Center LLC", style["cover_body"]), NextPageTemplate("body"), PageBreak()]

    story += [Paragraph("How to use this workbook", style["h1"]), Paragraph("This workbook is the working layer of the course. Use it while watching or reading the lesson, then complete the practice before marking the lesson done. Keep source material, first drafts, revisions, and review evidence together.", style["body"])]
    for item in ["Read or watch the lesson in order.", "Replace every bracketed prompt field with approved facts.", "Save the first result before revising.", "Run the pass standard and fix material defects.", "Submit designated builds for review.", "Pass the lesson checks and final at 80 percent or higher."]:
        story.append(checkbox(item, style["body"]))
    story += [Paragraph("Completion standard", style["h2"]), Paragraph("Watching does not equal completion. Completion requires every lesson, every assignment, every lesson check, the final assessment, and approval of designated deliverables. Completion letters are private course records. They are not degrees, professional licenses, accreditation, state or federal certification, promises of employment, or guarantees of business results.", style["body"])]
    roadmap = [[Paragraph("#", style["h3"]), Paragraph("Lesson", style["h3"]), Paragraph("Evidence", style["h3"])]]
    for lesson_index, lesson in enumerate(course["lessons"], 1):
        roadmap.append([Paragraph(str(lesson_index), style["body"]), Paragraph(safe_text(lesson["title"]), style["body"]), Paragraph("Assignment saved" + (" + review" if lesson.get("deliverable") else ""), style["small"])])
    table = Table(roadmap, colWidths=[0.4 * inch, 3.4 * inch, 2.25 * inch], repeatRows=1)
    table.setStyle(TableStyle([("BACKGROUND", (0,0), (-1,0), colors.HexColor("#EAF1F8")), ("GRID", (0,0), (-1,-1), .5, colors.HexColor("#CCD7E3")), ("VALIGN", (0,0), (-1,-1), "TOP"), ("LEFTPADDING", (0,0), (-1,-1), 7), ("RIGHTPADDING", (0,0), (-1,-1), 7), ("TOPPADDING", (0,0), (-1,-1), 6), ("BOTTOMPADDING", (0,0), (-1,-1), 6)]))
    story += [KeepTogether([Paragraph("Course roadmap", style["h2"]), table]), PageBreak()]

    for lesson_index, lesson in enumerate(course["lessons"], 1):
        story += [Paragraph(f"LESSON {lesson_index:02d}", style["h3"]), Paragraph(safe_text(lesson["title"]), style["h1"]), Paragraph("Result", style["h2"]), Paragraph(safe_text(lesson["outcome"]), style["body"]), Paragraph("Operator method", style["h2"])]
        for method_step in lesson.get("method", []):
            story.append(checkbox(method_step, style["body"]))
        story += [Paragraph("Exact working prompt", style["h2"]), Paragraph(safe_text(lesson["prompt"]).replace("\n", "<br/>"), style["prompt"]), Paragraph("Practice record", style["h2"]), Paragraph("Input or source used:", style["h3"])]
        for _ in range(3):
            story.append(Paragraph("________________________________________________________________________________", style["line"]))
        story += [Paragraph("What changed between the first and final result?", style["h3"])]
        for _ in range(3):
            story.append(Paragraph("________________________________________________________________________________", style["line"]))
        story += [Paragraph("Assignment", style["h2"]), Paragraph(safe_text(lesson["assignment"]), style["body"]), checkbox("Source material saved", style["body"]), checkbox("First result saved", style["body"]), checkbox("Final result saved", style["body"]), checkbox("Review completed", style["body"]), Paragraph("Pass standard", style["h2"]), Paragraph(safe_text(lesson["reviewCriteria"]), style["body"]), Paragraph("Reviewer or self-review notes", style["h2"])]
        for _ in range(6):
            story.append(Paragraph("________________________________________________________________________________", style["line"]))
        if lesson_index != len(course["lessons"]):
            story.append(PageBreak())

    story += [PageBreak(), Paragraph("Final assessment and capstone", style["h1"]), Paragraph("Before opening the final, confirm that every lesson artifact is saved and every designated build has a viewable submission link. The final assessment requires at least 80 percent. Retakes are allowed.", style["body"]), Paragraph("Capstone evidence checklist", style["h2"])]
    for item in ["Approved brief and intended result", "Source or evidence register", "Working prompt or operating template", "First result and final result", "Quality-control record", "Privacy, security, and approval review", "Repeatable runbook", "Viewable capstone link", "One measurable result or decision metric"]:
        story.append(checkbox(item, style["body"]))
    story += [Paragraph("Capstone link", style["h2"]), Paragraph("________________________________________________________________________________", style["line"]), Paragraph("What I built and why it matters", style["h2"])]
    for _ in range(8):
        story.append(Paragraph("________________________________________________________________________________", style["line"]))
    story += [Paragraph("Private course record disclaimer", style["h2"]), Paragraph("This workbook and any completion letter document participation in a private LeadFlow Pro course operated by Longview Training Center LLC. They do not create a degree, professional license, accreditation, government certification, promise of employment, or guarantee of business results.", style["small"])]
    doc.build(story)
    return output


def main() -> int:
    if not DATA_PATH.exists():
        raise FileNotFoundError(f"Missing {DATA_PATH}")
    courses = json.loads(DATA_PATH.read_text())
    outputs = [build_workbook(course, index) for index, course in enumerate(courses)]
    print(f"Wrote {len(outputs)} workbooks to {OUTPUT_DIR}")
    for output in outputs:
        print(output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
