<p align="center"><a href="https://mint-leaf.thebalanceffxiv.com/"><img src="https://raw.githubusercontent.com/hintxiv/mint-leaf/main/public/favicon.ico" height="150" width="130" alt="logo"></a></p>

<h1 align="center">Mint Leaf</h1>

A tool for creating FFXIV rotation infographics.

Use **Rows** to choose how many rows the infographic uses (default: 1).
Rows balance their visual widths and keep each GCD with its following weaves; prepull actions stay on the first row.
**Row spacing** sets the empty gap between rows in canvas pixels (default: 128; 0 is allowed).
Buff lines continue across row breaks with consistent vertical ordering.

## Getting Started

**Requirements**

* [git](https://git-scm.com/)
* [node.js](https://nodejs.org/en/)
* [yarn](https://yarnpkg.com/)

Install dependencies and run the development server:

```bash
yarn install
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the result.
