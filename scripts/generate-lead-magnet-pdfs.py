#!/usr/bin/env python3
"""Generate lead magnet PDFs for TRG resource pages."""
from pathlib import Path
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

ROOT = Path(__file__).resolve().parent.parent / "public" / "resources" / "downloads"

PDFS = {
    "google-review-response-templates.pdf": {
        "title": "Google Review Response Templates",
        "subtitle": "Toronto Restaurant Growth — torontorestaurantgrowth.ca",
        "sections": [
            (
                "5-star with comment",
                "Thank you for the kind words, [Name]. We're glad [specific detail they mentioned] "
                "made your visit memorable. Hope to see you back soon.",
            ),
            (
                "4-star with minor issue",
                "Thanks for the feedback, [Name]. We're glad you enjoyed [dish/experience]. "
                "Sorry we missed the mark on [issue] — we'd love to make it right. "
                "Email hello@torontorestaurantgrowth.ca or ask for a manager on your next visit.",
            ),
            (
                "1–2 star food complaint",
                "We're sorry your experience didn't meet our standard, [Name]. "
                "This isn't the experience we aim for. Please contact us at [phone/email] "
                "so we can understand what happened and make it right.",
            ),
            (
                "Review with no text",
                "Thank you for rating us, [Name]. We appreciate you taking the time — "
                "hope to welcome you again soon.",
            ),
            (
                "Suspected fake review",
                "Flag via Google Business Profile if the review violates policy. "
                "Public response: 'We take feedback seriously but cannot find a record of this visit. "
                "Please contact us directly so we can investigate.'",
            ),
        ],
    },
    "restaurant-seo-checklist.pdf": {
        "title": "Restaurant SEO Checklist (20 items)",
        "subtitle": "Toronto Restaurant Growth — local search hygiene",
        "sections": [
            ("GBP", "1. Profile claimed & verified\n2. Name matches signage\n3. Primary category correct\n4. Secondary categories filled\n5. Hours + holiday hours accurate"),
            ("Content", "6. 10+ photos uploaded\n7. Menu on GBP\n8. Weekly GBP posts\n9. Q&A populated\n10. Halal attribute if applicable"),
            ("Web & citations", "11. Mobile-friendly site\n12. NAP consistent everywhere\n13. Listed on Yelp, YellowPages\n14. LocalBusiness schema\n15. Menu page (not PDF-only)"),
            ("Reviews", "16. Respond to all reviews\n17. Steady new review velocity\n18. Table-side or follow-up asks\n19. Neighbourhood landing page\n20. Title tags with cuisine + city"),
        ],
    },
    "restaurant-grand-opening-timeline.pdf": {
        "title": "90-Day Grand Opening Timeline",
        "subtitle": "Toronto Restaurant Growth — launch marketing",
        "sections": [
            ("90 days before", "Register domain\nCreate Google Business Profile\nOpen TikTok + Instagram\nBook food photography\nStart teaser content"),
            ("60 days before", "Website live (coming soon OK)\nFirst social teasers\nSubmit to OpenTable, Yelp, YellowPages\nOutreach to local micro-influencers"),
            ("30 days before", "Opening event on Google/Facebook\nPress/local blog outreach\nReview seeding plan\nStaff trained on review asks"),
            ("Opening week", "Daily social coverage\nRespond to every review within 24h\nGoogle Ads if budget allows\nCapture content for future posts"),
        ],
    },
}


def write_pdf(path: Path, spec: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(path), pagesize=letter)
    width, height = letter
    y = height - 72

    c.setFont("Helvetica-Bold", 16)
    c.drawString(72, y, spec["title"])
    y -= 24
    c.setFont("Helvetica", 10)
    c.drawString(72, y, spec["subtitle"])
    y -= 36

    for heading, body in spec["sections"]:
        if y < 120:
            c.showPage()
            y = height - 72
        c.setFont("Helvetica-Bold", 12)
        c.drawString(72, y, heading)
        y -= 18
        c.setFont("Helvetica", 10)
        for line in body.split("\n"):
            if y < 72:
                c.showPage()
                y = height - 72
            c.drawString(84, y, line[:90])
            y -= 14
        y -= 12

    c.save()


def main() -> None:
    for filename, spec in PDFS.items():
        out = ROOT / filename
        write_pdf(out, spec)
        print(f"Wrote {out}")


if __name__ == "__main__":
    main()
