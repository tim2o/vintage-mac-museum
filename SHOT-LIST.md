# Shooting guide and shot list

A repeatable routine, so every machine ends up with the same set of media and the site looks consistent.

## Gear

- A phone camera is enough. Use the rear camera, not the front one.
- A small tripod or a stack of books to hold the phone steady.
- Soft, even light: a window with indirect daylight, or two lamps bounced off a white wall. Avoid a direct flash.
- A plain backdrop (white sheet, grey poster board) behind each machine.
- A microfiber cloth and a soft brush to clean the case and screen first.

## Photographing a CRT screen

CRT screens flicker at their refresh rate, which shows up as dark bands in photos and videos.

- Photos: turn off flash, and use a slower shutter (1/30 s or slower) so the whole screen draws during the exposure. Resting the phone on a tripod or table helps. Many phone cameras do this on their own in dim rooms.
- Video: record at 30 fps and tap the screen to lock exposure. If bands appear, try 24 fps or 60 fps and see which looks best on that machine.
- Cut room lights that reflect on the glass. Dim the room slightly so the screen is the brightest thing in the frame.
- Turn the machine's brightness and contrast to a comfortable middle.

## Safety

- Do not open a compact Macintosh or any CRT machine just to take photos. The CRT can hold a dangerous charge long after it is unplugged. Only open a machine if you know the discharge procedure.
- Machines that have sat for decades can fail on power-up (old capacitors, failing power supplies). If a machine smells hot or smokes, unplug it.

## Photo shot list (per machine)

Shoot at the phone's highest resolution. Name files as `<slug>-<shot>.jpg`, where the slug matches the machine page name (for example `macintosh-se30`).

| Shot | File name | Notes |
|------|-----------|-------|
| Front, straight on, powered off | `<slug>-front.jpg` | This becomes the cover photo. Fill the frame, keep the camera level with the screen. |
| Three-quarter view, left | `<slug>-left.jpg` | Shows depth and the side of the case. |
| Three-quarter view, right | `<slug>-right.jpg` | |
| Rear and ports | `<slug>-rear.jpg` | Ports, vents, and the back label if present. |
| Model and serial label | `<slug>-label.jpg` | Sharp and readable. Lets you confirm the exact model. |
| Drive slot or media close-up | `<slug>-drive.jpg` | Floppy, CD, or SCSI details. |
| Screen on, at the desktop | `<slug>-desktop.jpg` | Photograph the real screen, not a screenshot. |
| About This Macintosh window | `<slug>-about.jpg` | Shows the installed system version and RAM. |
| Accessories | `<slug>-extras.jpg` | Keyboard, mouse, boxes, manuals, if you have them. |

Cover photo first: the first photo listed in a machine's front matter is the one used on the collection page.

## Video shot list (per machine)

Keep each clip short (under two minutes) so the files stay small.

1. **Cold boot** (`<slug>-boot.mp4`): start with the machine off, press power, and record through the startup chime, the startup screen, and the first view of the desktop. Capture the sound.
2. **Desktop tour** (`<slug>-desktop.mp4`): open the About window, then the Control Panels or System Folder, and show the disk contents.
3. **Software demo** (`<slug>-software.mp4`): run one or two programs or games that suit the era. Say what they are in the video description on the page.
4. **Optional**: a floppy or hard-drive seek, to capture the sounds that go with that machine.

Tip: record from a fixed position so clips from the same machine match. Shoot horizontally, never vertically.

## Capturing specs while you are there

For each machine, write down:

- Model name and number, from the label
- Serial number
- Processor and speed
- RAM installed
- Storage (drive type and size)
- Display size and resolution
- System software version installed
- Date you got it, and where from
- What works and what does not

Type these into the machine's `.md` file in `src/machines/`. The `specs:` section can hold any labels you like; each line becomes a row on the page.

## Preparing files for the web

Phone photos and videos are too large for a fast website. Shrink them before adding them.

Photos (macOS built-in tool, resizes to at most 2000 px on the longest side):

```
sips -Z 2000 *.jpg
```

Videos (needs ffmpeg; makes a 720p MP4 that plays in every browser):

```
ffmpeg -i input.mov -vf "scale=-2:720" -c:v libx264 -crf 24 -preset slow -c:a aac -b:a 128k -movflags +faststart output.mp4
```

Aim for photos under 500 KB and each video under about 30 MB. GitHub limits any single file to 100 MB.

## Where the files go

```
src/assets/machines/<slug>/
  <slug>-front.jpg
  <slug>-boot.mp4
  ...
```

Then list them in the machine's front matter:

```yaml
photos:
  - file: macintosh-se30-front.jpg
    caption: Front, powered off
videos:
  - file: macintosh-se30-boot.mp4
    title: Cold boot to the desktop
    description: Startup chime, then the Finder.
```

For longer videos, upload to YouTube and use `youtube: <video id>` instead of `file:`.
