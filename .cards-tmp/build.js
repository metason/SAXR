const fs = require('fs');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  BorderStyle, WidthType, ShadingType, HeightRule, VerticalAlign
} = require('docx');

const COL_W = 5593;            // 2 columns, A4 0.25" margins
const ROW_H = 2900;            // EXACT thin uniform cards, ~5 rows / page
const cut = { style: BorderStyle.DASHED, size: 6, color: 'E8821E' };
const cardBorders = { top: cut, bottom: cut, left: cut, right: cut };

const header = (t) => new Paragraph({ spacing: { after: 50 }, children: [new TextRun({ text: t, bold: true, size: 19 })] });
const body   = (t) => new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: t, size: 18 })] });
const label  = (t) => new Paragraph({ spacing: { before: 20, after: 10 }, children: [new TextRun({ text: t, bold: true, size: 16, color: '555555' })] });
const demo   = (t) => new Paragraph({
  spacing: { before: 20, after: 40 }, shading: { type: ShadingType.CLEAR, fill: 'FFF1CC' },
  children: [new TextRun({ text: 'DEMO: ', bold: true, size: 16 }), new TextRun({ text: t, italics: true, size: 16 })],
});

const cards = [];

cards.push([
  header('CARD 1 - Web3D'),
  body(`The Web3D frontend, my half. A browser-based 3D viewer for SAXR: no install, opens from a URL. It reads the same datareps.json as Unity and ARchi, another consumer of the shared contract. Built with Next.js and React Three Fiber; next slides cover why R3F and how data becomes a scene.`),
]);

cards.push([
  header('CARD 2 - Data Flow / Rendering Pipeline'),
  body(`How a file becomes pixels. datareps.json is an array of arrays: parseViz splits stage and scenes, sceneMerge combines stage with the active scene, classifyRep routes each item to a shape (DataRepMesh) or panel (PanelPlane). The scene is one declarative R3F component tree, so a DataRep change just re-renders a component. Y-up, no axis swap; Unity is left-handed and negates Z.`),
]);

cards.push([
  header('CARD 3 - Rendering Stack (R3F vs Babylon vs Three.js)'),
  body(`Why React Three Fiber. Vanilla Three.js means two mental models, declarative React plus imperative 3D, synced by hand. Babylon.js doesn't integrate React state natively. R3F makes the scene graph a React component tree with native state, and performance is identical, same WebGL. I picked it for the React fit, not speed.`),
]);

cards.push([
  header('CARD 4 - Editor Validation (AJV vs Monaco)'),
  body(`Why AJV, not Monaco's built-in checker. Monaco can validate a schema, but only in the browser. The config must be re-validated on the server, the trust boundary, and Monaco can't run there, AJV can. Same AJV, same schema, both sides. AJV also supports my 2020-12 schema and gives token-precise errors. (Live demo a few slides on.)`),
]);

cards.push([
  header('CARD 5 - Shape System'),
  body(`Turns each data point into 3D geometry. A registry maps the type string to the component that draws it, so adding a shape is one component plus one registry line, the dispatcher never changes. That's the Strategy pattern, open for extension. Four strategies: scaled primitive, composite, procedural (arc), external PLY mesh, plus line. The same dispatch recurs in Python and Unity.`),
]);

cards.push([
  header('CARD 6 - Panels & Back-face Culling   (demo)'),
  body(`Walls are axis panels, flat Matplotlib images on textured quads, placed by type string. Every frame each wall checks if it faces the camera with a dot product, so the box opens toward you.`),
  demo(`orbit, near walls cull out, data stays visible, far walls are the backdrop.`),
  body(`Details: unlit material (already shaded), pre-allocated vectors (no GC), gray fallback for a missing texture.`),
]);

cards.push([
  header('CARD 7 - Arrangement Modes'),
  body(`How multiple scenes are laid out in time and space. Temporal shows one at a time: animated auto-plays, narrative is click-paced, the only difference is one boolean. Spatial is comparative, scenes on a grid, picked by an inverse map (next slide). LOD is a planned fourth mode. One shared map, domainLabelForScene, keeps every label consistent.`),
]);

cards.push([
  header('CARD 8 - Bijective Mapping   (demo: the grid)'),
  body(`The map between data values and scene indices. Forward turns an index into a value; inverse turns a value into an index with a round. They must be exact inverses, or you click 2016, round to the wrong index, and see the wrong scene while the label still says 2016, a silent bug.`),
  demo(`comparative mode, pick scenes, drag the spacing sliders, the grid re-lays out. Columns default to the square root of the count.`),
]);

cards.push([
  header('CARD 9 - Live Editing   (read + freestyle demo)'),
  label('READ (open):'),
  body(`The editor is the core of my work. Unlike Unity and ARchi which only display data, the web frontend produces it: edit the config and re-run the pipeline in the browser. It validates live on two levels, with a real trust boundary on the server.`),
  demo(`freestyle the live demo: syntax error, schema error, showcase animation, run.`),
  label('READ (close):'),
  body(`The browser check is just UX, bypassable; the server re-validates with the same AJV before writing or spawning Python. That's the trust boundary.`),
]);


cards.push([
  header('CARD 10 - Outlook'),
  body(`Looking ahead, the future work falls into three groups. Deployment: getting the web frontend running without the local server, and packaging the Unity build as a standalone Quest app. Hardening the contract: generating the types from the schema instead of hand-writing them, and having the frontends validate the data on load, not just the pipeline. And finishing the features the schema already reserves: the LOD arrangement, per-session editing copies so the browser editor doesn't overwrite the shared sample, and some further refactoring.`),
]);

cards.push([
  header('CARD 11 - Conclusion'),
  body(`To conclude: the core of this project was turning an implicit convention into an enforced contract. Before, the DataRep format was defined three times by hand and could silently drift. Now there's one schema, validated before anything is written, that every consumer agrees on. That took SAXR from two consumers to four, the existing Blender export and ARchi VR, plus the two we built, Web3D, which runs in any browser with no install, and Unity for desktop and VR. And the real lesson is that one contract let us build both new frontends independently and in parallel, in different languages, with no integration failures. A contract is much cheaper to establish before the consumers exist than after.`),
]);

const cell = (children) => new TableCell({
  width: { size: COL_W, type: WidthType.DXA },
  borders: cardBorders,
  margins: { top: 80, bottom: 80, left: 100, right: 100 },
  verticalAlign: VerticalAlign.TOP,
  children: children && children.length ? children : [new Paragraph({ children: [new TextRun({ text: '' })] })],
});

const rows = [];
for (let i = 0; i < cards.length; i += 2) {
  rows.push(new TableRow({
    height: { value: ROW_H, rule: HeightRule.EXACT },
    cantSplit: true,
    children: [cell(cards[i]), cell(cards[i + 1])],
  }));
}

const grid = new Table({
  width: { size: COL_W * 2, type: WidthType.DXA },
  columnWidths: [COL_W, COL_W],
  rows,
});

const doc = new Document({
  styles: { default: { document: { run: { font: 'Calibri', size: 18 } } } },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 360, right: 360, bottom: 360, left: 360 } } },
    children: [grid],
  }],
});

Packer.toBuffer(doc).then((buf) => {
  const out = 'C:/Users/afran/SAXR/.cards-tmp/SAXR_Cards_new.docx';
  fs.writeFileSync(out, buf);
  console.log('wrote ' + out + ' (' + buf.length + ' bytes)');
});
