import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), 'uploads')
os.makedirs(UPLOAD_DIR, exist_ok=True)

WIDTH, HEIGHT = 600, 600

def create_base_skin(tone=(240, 208, 185)):
    img = Image.new('RGB', (WIDTH, HEIGHT), tone)
    draw = ImageDraw.Draw(img)
    # Add subtle skin gradient and texture
    for y in range(0, HEIGHT, 4):
        alpha = int((y / HEIGHT) * 15)
        draw.line([(0, y), (WIDTH, y)], fill=(tone[0] - alpha, tone[1] - alpha, tone[2] - alpha), width=4)
    return img, draw

def add_header(draw, title, subtitle, badge_color=(16, 185, 129), badge_text="ROUTINE"):
    # Semi-transparent dark banner at bottom
    draw.rectangle([(0, HEIGHT - 80), (WIDTH, HEIGHT)], fill=(15, 23, 42))
    # Badge
    draw.rounded_rectangle([(20, HEIGHT - 65), (140, HEIGHT - 35)], radius=6, fill=badge_color)
    draw.text((32, HEIGHT - 57), badge_text, fill=(255, 255, 255))
    # Title and subtitle
    draw.text((155, HEIGHT - 65), title, fill=(255, 255, 255))
    draw.text((155, HEIGHT - 45), subtitle, fill=(148, 163, 184))

def add_ruler(draw):
    # Surgical reference paper ruler at top left
    draw.rectangle([(20, 20), (180, 50)], fill=(255, 255, 255), outline=(100, 116, 139), width=2)
    draw.text((25, 25), "0 cm", fill=(51, 65, 85))
    draw.text((70, 25), "1", fill=(51, 65, 85))
    draw.text((115, 25), "2", fill=(51, 65, 85))
    draw.text((155, 25), "3 cm", fill=(51, 65, 85))
    for x in range(30, 170, 10):
        h = 45 if (x % 30 == 0) else 38
        draw.line([(x, 30), (x, h)], fill=(51, 65, 85), width=1)

# 1. Sarah Jenkins - Day 1: Fresh Incision with Sutures
def gen_sarah_day1():
    img, draw = create_base_skin((238, 205, 180))
    add_ruler(draw)
    # Surgical incision line
    draw.line([(300, 120), (300, 460)], fill=(185, 28, 28), width=5)
    draw.line([(299, 125), (299, 455)], fill=(127, 29, 29), width=2)
    # 7 Sutures
    for y in range(160, 430, 40):
        # Cross thread
        draw.line([(270, y - 5), (330, y + 5)], fill=(30, 41, 59), width=3)
        # Knot on left
        draw.ellipse([(265, y - 9), (275, y - 1)], fill=(15, 23, 42))
        # Puncture dots
        draw.ellipse([(268, y - 7), (272, y - 3)], fill=(153, 27, 27))
        draw.ellipse([(328, y + 3), (332, y + 7)], fill=(153, 27, 27))
    add_header(draw, "Sarah Jenkins (MRN-2026-001) - Day 1", "Clean margins, baseline surgical incision, sutures approximated", (16, 185, 129), "ROUTINE")
    return img

# 2. Sarah Jenkins - Day 3: Healing Well
def gen_sarah_day3():
    img, draw = create_base_skin((238, 205, 180))
    add_ruler(draw)
    # Light pink healing incision
    draw.line([(300, 120), (300, 460)], fill=(244, 114, 182), width=4)
    draw.line([(300, 130), (300, 450)], fill=(225, 29, 72), width=2)
    for y in range(160, 430, 40):
        draw.line([(270, y - 5), (330, y + 5)], fill=(51, 65, 85), width=2)
        draw.ellipse([(266, y - 8), (274, y)], fill=(30, 41, 59))
    add_header(draw, "Sarah Jenkins (MRN-2026-001) - Day 3", "Incision closed and pink, minimal edema, no discharge", (16, 185, 129), "ROUTINE")
    return img

# 3. Sarah Jenkins - Day 7: Fully Granulated
def gen_sarah_day7():
    img, draw = create_base_skin((238, 205, 180))
    add_ruler(draw)
    # Pale scar line, well closed
    draw.line([(300, 120), (300, 460)], fill=(251, 207, 232), width=3)
    draw.line([(300, 130), (300, 450)], fill=(219, 39, 119), width=1)
    # Suture removal marks
    for y in range(160, 430, 40):
        draw.ellipse([(268, y - 6), (272, y - 2)], fill=(244, 114, 182))
        draw.ellipse([(328, y + 4), (332, y + 8)], fill=(244, 114, 182))
    add_header(draw, "Sarah Jenkins (MRN-2026-001) - Day 7", "Fully granulated incision, no pain, approved for staple removal", (16, 185, 129), "HEALED")
    return img

# 4. David Rodriguez - Day 1: Baseline Open Appendectomy
def gen_david_day1():
    img, draw = create_base_skin((220, 180, 150))
    add_ruler(draw)
    # Oblique McBurney incision line
    draw.line([(200, 360), (420, 200)], fill=(185, 28, 28), width=5)
    # 6 Staples
    for step in range(6):
        t = 0.15 + step * 0.14
        x = int(200 + t * (420 - 200))
        y = int(360 + t * (200 - 360))
        draw.line([(x - 12, y - 16), (x + 12, y + 16)], fill=(148, 163, 184), width=4)
    add_header(draw, "David Rodriguez (MRN-2026-002) - Day 1", "Open Appendectomy baseline, staples intact, pain controlled", (16, 185, 129), "BASELINE")
    return img

# 5. David Rodriguez - Day 3: Spreading Redness Halo
def gen_david_day3():
    img, draw = create_base_skin((220, 180, 150))
    add_ruler(draw)
    # Redness halo / erythema zone
    draw.ellipse([(140, 140), (480, 420)], fill=(248, 113, 113, 100), outline=(239, 68, 68), width=3)
    # Incision line
    draw.line([(200, 360), (420, 200)], fill=(185, 28, 28), width=6)
    for step in range(6):
        t = 0.15 + step * 0.14
        x = int(200 + t * (420 - 200))
        y = int(360 + t * (200 - 360))
        draw.line([(x - 12, y - 16), (x + 12, y + 16)], fill=(148, 163, 184), width=4)
    add_header(draw, "David Rodriguez (MRN-2026-002) - Day 3", "Periwound erythema spreading > 2cm from margin", (245, 158, 11), "MONITOR")
    return img

# 6. David Rodriguez - Day 7: Severe Infection (SSI) with Purulent Drainage
def gen_david_day7():
    img, draw = create_base_skin((220, 180, 150))
    add_ruler(draw)
    # Large intense erythema halo
    draw.ellipse([(100, 100), (520, 480)], fill=(239, 68, 68), outline=(185, 28, 28), width=5)
    # Inner swollen zone
    draw.ellipse([(160, 160), (460, 400)], fill=(220, 38, 38))
    # Dehiscent dark incision line
    draw.line([(200, 360), (420, 200)], fill=(127, 29, 29), width=8)
    # Purulent yellowish exudate pool
    draw.ellipse([(260, 280), (340, 330)], fill=(254, 240, 138), outline=(234, 179, 8), width=3)
    draw.ellipse([(290, 290), (360, 350)], fill=(253, 224, 71))
    for step in range(6):
        t = 0.15 + step * 0.14
        x = int(200 + t * (420 - 200))
        y = int(360 + t * (200 - 360))
        draw.line([(x - 12, y - 16), (x + 12, y + 16)], fill=(100, 116, 139), width=3)
    add_header(draw, "David Rodriguez (MRN-2026-002) - Day 7", "HIGH RISK: Purulent exudate, spreading erythema, fever 38.9°C", (225, 29, 72), "HIGH RISK")
    return img

# 7. Elena Rostova - Day 1: Hernia Repair Baseline
def gen_elena_day1():
    img, draw = create_base_skin((242, 215, 195))
    add_ruler(draw)
    # Small curved umbilical incision
    draw.arc([(260, 240), (340, 320)], start=30, end=150, fill=(185, 28, 28), width=5)
    draw.line([(280, 290), (320, 290)], fill=(30, 41, 59), width=3)
    add_header(draw, "Elena Rostova (MRN-2026-003) - Day 1", "Umbilical laparoscopic hernia site, sterile strip applied", (16, 185, 129), "ROUTINE")
    return img

# 8. Elena Rostova - Day 3: Blurry Photo Retake Required
def gen_elena_day3_blurry():
    img = gen_elena_day1()
    # Apply severe blur and dark filter
    img = img.filter(ImageFilter.GaussianBlur(radius=15))
    draw = ImageDraw.Draw(img)
    # Warning watermark
    draw.rectangle([(80, 230), (520, 330)], fill=(15, 23, 42, 220), outline=(245, 158, 11), width=3)
    draw.text((120, 255), "QUALITY AUDIT: BLUR DETECTED", fill=(245, 158, 11))
    draw.text((120, 285), "Laplacian variance < 100. Retake requested.", fill=(255, 255, 255))
    add_header(draw, "Elena Rostova (MRN-2026-003) - Day 3", "Unreadable capture - motion blur & inadequate lighting", (245, 158, 11), "RETAKE")
    return img

# 9. Elena Rostova - Day 4: Daylight Retake
def gen_elena_day4_retake():
    img, draw = create_base_skin((242, 215, 195))
    add_ruler(draw)
    # Bright sharp umbilical incision
    draw.arc([(260, 240), (340, 320)], start=30, end=150, fill=(225, 29, 72), width=4)
    draw.line([(280, 290), (320, 290)], fill=(71, 85, 105), width=2)
    add_header(draw, "Elena Rostova (MRN-2026-003) - Day 4", "Retake in direct daylight accepted. Healing appropriately.", (16, 185, 129), "ACCEPTED")
    return img

generators = {
    'demo_sarah_day1.png': gen_sarah_day1,
    'demo_sarah_day3.png': gen_sarah_day3,
    'demo_sarah_day7.png': gen_sarah_day7,
    'demo_david_day1.png': gen_david_day1,
    'demo_david_day3.png': gen_david_day3,
    'demo_david_day7.png': gen_david_day7,
    'demo_elena_day1.png': gen_elena_day1,
    'demo_elena_day3_blurry.png': gen_elena_day3_blurry,
    'demo_elena_day4_retake.png': gen_elena_day4_retake,
}

print("Generating high-resolution clinical wound demonstration images...")
for filename, gen_fn in generators.items():
    filepath = os.path.join(UPLOAD_DIR, filename)
    image = gen_fn()
    image.save(filepath, 'PNG')
    print(f"Generated: {filepath} ({image.size[0]}x{image.size[1]})")

print("\nAll 9 clinical wound demonstration images successfully generated in backend/uploads!")
