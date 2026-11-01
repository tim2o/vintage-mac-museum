// A stamp that changes on every build. It is added to the CSS and script URLs so that a browser
// never pairs a new page with an old, cached script or stylesheet.
module.exports = Date.now().toString(36);
