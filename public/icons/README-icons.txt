TalentNest HR — PWA Icon Files
==============================

This directory requires two PNG icon files for PWA support:

1. icon-192.png  — 192x192 pixels
2. icon-512.png  — 512x512 pixels

How to generate them:
- Export the logo.svg at 192x192 and 512x512 using Inkscape, Figma, or any SVG tool
- Alternatively use an online tool like https://realfavicongenerator.net/
- Place both files in this directory (public/icons/)

Note: The manifest.json references these files. Without them, PWA install
will still work but may show a missing-icon warning in Chrome DevTools.
The /logo.svg is already referenced as a fallback for any-size icon.
