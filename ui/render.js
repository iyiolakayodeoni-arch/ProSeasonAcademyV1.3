const { Resvg } = require('@resvg/resvg-js');
const fs = require('fs');
const path = require('path');

function render(svgFile, pngFile, width) {
  const svg = fs.readFileSync(path.join(__dirname, svgFile));
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: width },
    background: '#0a0f0a',
    font: { loadSystemFonts: true, defaultFontFamily: 'monospace' },
  });
  const png = resvg.render().asPng();
  fs.writeFileSync(path.join(__dirname, pngFile), png);
  console.log(`wrote ${pngFile} (${png.length} bytes)`);
}

render('new-ui-journey.svg', 'new-ui-journey.png', 1170);
