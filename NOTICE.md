# Third-party notices

Life of a Photon — its source code, the text of its dossier and its documentation — is released under the MIT License (see [LICENSE](LICENSE)). It includes or builds on the following work of others, which keeps its own terms.

## 3D models

The files in `public/models` come from asset kits published by Kenney (<https://kenney.nl>) under Creative Commons Zero, CC0 1.0: _City Kit (Commercial)_, _City Kit (Suburban)_, _City Kit (Roads)_ and further kits by the same author for the vehicles, the trees and the street furniture.

They were identified by the object names stored inside the files (for example `building-skyscraper-a`, `building-type-a`, `detail-awning-wide`, `sign-highway-detailed`, `light-curved-double`), by their exporter and by their palette textures. The files were renamed when they were added to this repository; their contents are unchanged. CC0 asks for no attribution. It is given here because the scene consists of these models.

## Data

- **CIE 1931 standard colorimetric observer** (`src/physics/cie1931.ts`): the colour-matching functions at 5 nm intervals as published by the International Commission on Illumination (CIE 015, _Colorimetry_).
- **Physical constants and reference values** (`src/physics/constants.ts`): the exact SI defining constants, IAU nominal solar values and the other values named there, each with its source.
- **Bibliography** (`src/dossier/references.ts`): the metadata of every entry was checked against Crossref or the publisher's record.

## Fonts

Inter, JetBrains Mono and Source Serif 4, each under the SIL Open Font License 1.1. They are fetched at build time through `next/font` and served by the site itself.

## Software

The application depends on Next.js, React, three.js, React Three Fiber, drei and KaTeX (MIT) and lucide-react (ISC). Development uses TypeScript (Apache-2.0) and Tailwind CSS, Vitest, ESLint and Prettier (MIT). Their licence texts are distributed with the packages; `package.json` and `package-lock.json` list the exact versions.
