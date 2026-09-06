<p align="center"><a href="https://mint-leaf.thebalanceffxiv.com/"><img src="https://raw.githubusercontent.com/hintxiv/mint-leaf/main/public/favicon.ico" height="150" width="130" alt="logo"></a></p>

<h1 align="center">Mint Leaf</h1>

A tool for creating FFXIV rotation infographics.

## Getting Started

**Requirements**

* [git](https://git-scm.com/)
* [node.js](https://nodejs.org/en/)
* [yarn](https://yarnpkg.com/)

Copy `.env.example` to `.env.local` and set `AUTH_SECRET` to the output of:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

Discord sign-in also requires `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, and a JSON array of allowed Discord user IDs in `DISCORD_WHITELISTED_USERS`.
Restart the development server after changing environment variables.

Install dependencies and run the development server:

```bash
yarn install
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the result.
