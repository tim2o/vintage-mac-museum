# The Macintosh Shelf

A static website for a personal collection of vintage Macintosh computers. Each machine gets a page with specs, photos, and videos. It is built with [Eleventy](https://www.11ty.dev/).

The machines included are placeholders for the machines in the collection. Fill each one in as you document it.

## Quick start

You need Node.js 18 or newer.

```
npm install
npm start
```

Open the address it prints (usually http://localhost:8080). The page reloads when you save a file.

## Add a machine

```
npm run new -- "Macintosh Plus" 1986
```

This creates `src/machines/macintosh-plus.md` and a media folder at `src/assets/machines/macintosh-plus/`. Fill in the specs, drop in your photos and videos, and list them in the file's front matter. `SHOT-LIST.md` explains what to shoot and how to prepare the files.

Each machine starts as a placeholder marked "Not yet documented". A machine is checked off on the collection page's Checklist as soon as its front matter lists at least one photo. When every machine has a photo, the Checklist disappears on its own.

To remove a machine, delete its `.md` file.

## The look

The site is styled after Mac OS 7.5. Every page is a desktop: the collection is a Finder-style icon view, each machine's specs sit in a Get Info window, and videos play in QuickTime-style windows. The icons are simple pixel drawings made for this site.

Each machine can pick an icon with `glyph:` in its front matter: `compact`, `desktop`, or `imac`. Once a machine has a photo, the photo replaces the icon on the collection page.

## Project layout

```
src/
  index.njk            Collection page
  about.md             About page
  machines/            One .md file per machine
  assets/css/          Styling
  assets/machines/     Photos and videos, one folder per machine
  _includes/           Page layouts and the pixel icons (icons.njk)
  _data/site.json      Site title and tagline
```

Change the site name and tagline in `src/_data/site.json`.

## Publish

### GitHub Pages

1. Create a GitHub repository and push this project to the `main` branch.
2. In the repository, go to Settings, then Pages, and set the source to **GitHub Actions**.
3. Every push to `main` builds and publishes the site. The workflow is in `.github/workflows/deploy.yml`.

The site is served at `https://<your-username>.github.io/<repo-name>/`. If you use a custom domain instead, change `PATH_PREFIX` in the workflow to `/`.

### Netlify

Connect the repository in Netlify. The settings in `netlify.toml` are picked up automatically (build command `npm run build`, publish folder `_site`).

## Notes on media size

GitHub rejects files over 100 MB and asks that repositories stay under about 1 GB. Compress videos before adding them (commands are in `SHOT-LIST.md`), or host long videos on YouTube and reference them with `youtube:` in the front matter.
