# Changelog

## 0.1.0 — 2026-10-11

Initial experimental release of Data Griddle - a React data grid. Public APIs.

- Virtualized rows and center columns, with left and right frozen columns.
- Cell navigation, range selection, checkbox row selection and stable-ID imperative focus.
- Built-in and custom editors, synchronous validation and asynchronous commit handlers.
- Mouse and touch resizing and within-zone reordering, including a floating header preview.
- Touch hold-and-drag selection and double-tap editing.
- Custom cell/header/checkbox rendering, CSS theme variables, controlled and uncontrolled state.
- Initial loading, retained-data refresh and empty-result presentation.

Requires matching React/React DOM `^18.3.1 || ^19.2.6` and an explicit import of
`data-griddle/styles.css`. Documentation is provided in the README and repository guides.

### Known limitations

- Automated packed-consumer verification covers desktop Chromium, Vite and both Next.js routers;
  it does not establish a full browser, physical-device or screen-reader support matrix.
- Some iPhone Safari gestures have maintainer confirmation; Android, mobile IME, zoom,
  forced colors and assistive-technology coverage remain incomplete.
- Keyboard column resizing/reordering and pen drag gestures are outside this release's scope.
- Applications must adapt frozen columns to narrow layouts and provide any nonvirtualized table view.
- No grid-level sorting, filtering or clipboard API; applications own their data and persistence.

See [verification evidence](./docs/PACKAGE_VERIFICATION.md),
[accessibility limitations](./docs/ACCESSIBILITY.md) and the [release checklist](./docs/RELEASING.md).
