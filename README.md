# VANS Bookkeeping

Jekyll builds the HTML; Tailwind CSS compiles a local stylesheet with a theme based on `#0e74e9`. The custom domain remains `www.vansbookkeeping.com`.

## Company name

Change `title` in `_config.yml` to update the company name throughout the website, including the header, footer, page copy, metadata, and SVG logo title. Metadata uses `[company_name]` as a placeholder, resolved by the head template. Restart Jekyll after editing the config. Contact addresses, booking URLs, and the domain are configured separately.

## Local development

Install Ruby matching `.ruby-version`, Bundler, and Node matching `.nvmrc`. Work on `devel` or a feature branch:

```sh
git switch -c my-change
bundle install
npm ci
npm run dev
```

Visit http://localhost:4000. Jekyll and Tailwind watch for changes; the browser reloads automatically. Restart the command after changing `_config.yml`. Stop both watchers with Ctrl+C.

To run the same checks as CI:

```sh
npm test
npm run build
npm run check
```

Generated CSS and `_site` are ignored. Commit both dependency lockfiles when changing dependencies. Jekyll remains the site generator; GitHub does not need to build the output again.

## Content and design

The site targets Northern California small businesses with a blue brand theme. All five pages use `_layouts/default.html`; reusable cards, icons, calls to action, and the getting-started process live in `_includes`. Page sources live in `index.html` and `_pages/*.html`.

- Update services in `_data/services.yml`. The `home` flag selects the three homepage services; each `id` is also a linkable anchor on the services page.
- Update the process and shared homepage/FAQ-page answers in `_data/process.yml` and `_data/faq.yml`.
- Update phone, email, location, and the Calendly link once in `_config.yml` under `contact`.
- Edit theme tokens, shared components, and responsive layouts in `styles/app.css`; rebuild rather than editing generated CSS.
- Each page provides its own search description. Shared metadata adds canonical and social sharing tags.

The consultation photo has 640px and 1200px WebP versions with responsive image sizing. The logo in `assets/images/logo.svg` combines a white V with an open pale blue book on the brand-blue background; the navigation and favicon share this scalable asset. Original JPEGs remain in the repository but are excluded from the published build. Calendly opens through a direct booking link, so the contact page does not load a third-party scheduling script. FAQs use native HTML `details` elements and need no JavaScript.

`npm run check` validates generated pages, local links (including service anchors and responsive image candidates), page headings, descriptions, theme output, and deployment metadata.

## GitHub Pages setup and deployment

In the repository's **Settings → Pages → Build and deployment**, choose **GitHub Actions** as the source. Preserve the existing custom domain and HTTPS settings. Allow Actions to write `gh-pages` and create `site-v*` tags; if branch/tag rules restrict these operations, allow the workflow actor. The `github-pages` environment must permit deployments from `main`.

Pull requests targeting `main` run build, version tests, and generated-site checks with read-only permissions. Pushes to `main`, including merged PRs, run the deployment workflow. A manual run is also available on `main`. Feature branches do not deploy.

The deployment workflow reserves a version, builds and checks the site, replaces the contents of `gh-pages` (including removing stale files), and publishes the same build using the official Pages deployment action. The output branch retains commit history and contains `CNAME` and `.nojekyll`. Explicit deployment is necessary because pushing with `GITHUB_TOKEN` does not trigger a separate branch-based Pages build.

## Versions

The initial version is **v1.0.0**. Each deployment run that reaches version reservation creates a `site-v1.0.N` Git tag, starting with `site-v1.0.0`, then incrementing the largest reserved patch. Failed builds consume their reserved version; rerunning the build job reserves another. Rerunning only the deployment job republishes its existing artifact and version. Runs canceled before reservation do not consume a version. GitHub concurrency serializes active deployments and may replace pending runs with newer ones.

The version appears in the footer, HTML metadata, stylesheet cache key, and `/version.json`. Source/local builds retain the initial version in `_data/version.yml`; CI updates it only in its build workspace. No automated commits to `main` or recursive deploy triggers are needed. Do not delete or rewrite the `site-v*` tags, since they are the durable version counter. `package.json` tracks the initial project version rather than each deployment.

Deployment reference: [GitHub Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages). Styling reference: [Tailwind CLI](https://tailwindcss.com/docs/installation/tailwind-cli).
