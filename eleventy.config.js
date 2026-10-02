// Eleventy configuration.
// PATH_PREFIX lets the same build work at a domain root (Netlify, custom domain)
// or under a repo subpath (GitHub Pages project site, e.g. /vintage-mac-museum/).
module.exports = function (eleventyConfig) {
  // Everything in src/assets (CSS, photos, videos) is copied to the site as-is.
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });

  // All machines, oldest first.
  eleventyConfig.addCollection("machines", (api) =>
    api
      .getFilteredByGlob("src/machines/*.md")
      .sort((a, b) => (a.data.year || 0) - (b.data.year || 0))
  );

  return {
    dir: {
      input: "src",
      includes: "_includes",
      data: "_data",
      output: "_site",
    },
    pathPrefix: process.env.PATH_PREFIX || "/",
    markdownTemplateEngine: "njk",
  };
};
