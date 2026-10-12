# Mock-up sources

These are the source files of the SUPER1 mock-up canvas (Claude Design), 52 boards on 8 pages. Pete has the live, clickable canvas; it is private to his account.

- `*.dc.html`: one file per board. The masters hold the logic and every state: `App` (member app), `Desk`, `Coach`, `Owner`, `Admin`, `Join`. The numbered boards (`M03-Home`, `D07-NewMember`…) are thin wrappers that open a master at one screen (`start="home"`). Markup uses `{{holes}}`, `<sc-if>`, `<sc-for>` and `<dc-import>`. Read the inline styles and the `renderVals()` data as the spec for layout, copy and sample data.
- `s1.css`: tokens and helper classes (motion keyframes, tab bar, chips). `ds/super1/components/bundle.css`: the component kit (buttons, pills, rows, sheets…).
- `canvas.json`: pages, board order, sizes and titles.
- `blob-map.json`: maps the image URLs in the boards (`/_blob/<id>`) to files in `design/brand` and `design/photos`.

**To see a board, open `design/screens/<board>.png`.** For the rendered DOM and CSS, open `design/screens/<board>.html` in a browser. These show the first screen of each board with motion paused; the masters' other screens are reached through the numbered boards.

| Page | Boards |
|---|---|
| 1 · Map & connections | Main, Connections |
| 2 · Motion | Motion (the 9 motion moments with timings) |
| 3 · Customer sign-up | QRStand, Join, Invite |
| 4 · Member app | App, M01–M13 |
| 5 · Front desk | Desk, D01–D10 |
| 6 · Coach portal | Coach, C01–C07 |
| 7 · Andy (owner) | Owner, O01–O05 |
| 8 · Pete (admin) | Admin, A01–A06 |

`design/tools/` has the small renderer that produced `design/screens/` (`node design/tools/render.mjs design`, needs `playwright-core` and the Inter and Noto Sans Thai fontsource packages).
