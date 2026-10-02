// Create a new machine page: npm run new -- "Macintosh Plus" 1986
const fs = require("fs");
const path = require("path");

const [title, year = ""] = process.argv.slice(2);
if (!title) {
  console.error('Usage: npm run new -- "Macintosh Plus" 1986');
  process.exit(1);
}

const slug = title
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "");

const file = path.join("src", "machines", `${slug}.md`);
const mediaDir = path.join("src", "assets", "machines", slug);

if (fs.existsSync(file)) {
  console.error(`${file} already exists.`);
  process.exit(1);
}

const body = `---
title: ${title}
year: ${year}
family:
glyph: compact
model:
status:
summary:
specs:
  Processor:
  Memory:
  Storage:
  Display:
  System software:
photos:
  # - file: ${slug}-front.jpg
  #   caption: Front, with the screen on
videos:
  # - file: ${slug}-boot.mp4
  #   title: Cold boot to the desktop
  #   description: Startup chime, then Finder.
---
Write about this machine here.
`;

fs.mkdirSync(mediaDir, { recursive: true });
fs.writeFileSync(file, body);
console.log(`Created ${file}`);
console.log(`Put photos and videos in ${mediaDir}`);
