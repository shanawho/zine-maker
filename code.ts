// This plugin will open a window to prompt the user to enter a number, and
// it will then create that many rectangles on the screen.

// This file holds the main code for the plugins. It has access to the *document*.
// You can access browser APIs in the <script> tag inside "ui.html" which has a
// full browser environment (see documentation).

figma.showUI(
  __html__,
  { width: 240, height: 300}
)


// This shows the HTML page in "ui.html".
// figma.showUI(__html__);

// let dimensions = new Map<"l"

// var pageDimensions: { [name : string]: [number, number]} = {} as any;
// pageDimensions[this.id] = this;


let figmaPage = figma.currentPage;
let paperSize = [];
let numZinePages = 16;

let margin = 50; // margin between spreads and pages laid out

// letter size paper, with 4 zine pages per sheet
// multiply by 72 for ppi
let paper = {
  width: 8.5 * 72,
  height: 11 * 72
}

let zinePage = {
  width: paper.width/2,
  height: paper.height/2
}

var zinePageComponents : Array<ComponentNode> = [];

const loadFonts = async () => {
  console.log("hi");
  await figma.loadFontAsync({ family: "Inter", style: "Regular" });
  console.log("hi2");
}

let createFrame = function(x: number, y: number, width: number, height: number): FrameNode {
  // takes in width and height in inches
  var frame = figma.createFrame();
  frame.resize(width, height);
  frame.x = x;
  frame.y = y;
  
  frame.fills = [{type: 'SOLID', color: {r: 1, g: 1, b: 1}}];

  return frame;
}

let addPageNumber = function(pageNum: number, comp: ComponentNode) {
  // add a page number for visual confirmation
  let textLayer = figma.createText();
  console.log("addPageNum", pageNum);
  textLayer.characters = (pageNum+1).toString();
  comp.appendChild(textLayer);
}

let createZinePageComponent = function(x: number, y: number, pageNum: number) : ComponentNode {
  let comp = figma.createComponent();
  comp.resize(zinePage.width, zinePage.height);
  comp.name = "Page " + (pageNum+1).toString();
  comp.x = x;
  comp.y = y;

  //addPageNumber(pageNum, comp);

  zinePageComponents.push(comp);

  comp.fills = [{type: 'SOLID', color: {r: 1, g: 1, b: 1}}];
  return comp;
}

let createSpread = function(x: number, y: number) : FrameNode {
  let spread = createFrame(x, y, paper.width, zinePage.height);
  spread.name = "Spread";
  figmaPage.appendChild(spread);
  return spread;
}

let createDesignLayout = function(numPages: number): Boolean {



  // Create components for each zine page, laid out in how you would consume the zine itself.
  // Front and Back cover components live solo
  var initialX = 0;
  var x = zinePage.width; // start it so the front cover is right aligned
  var y = 0;

  var currSpread = null;
  for (var i = 0; i<numPages; i++) {
    let newSpread = (i % 2 == 1) ? true : false;

    if (i==0) {
      let frontCover = createZinePageComponent(x, y, i);
      figmaPage.appendChild(frontCover)
      
      x = initialX; // reset X to be left-aligned
    } else if (i > 0 && i <numPages-1) {
      //Not the front or back cover
      // In-between pages are laid out as "spreads" that contain two components each
      var zinePageX = 0;
      if (newSpread) {
        currSpread = createSpread(x, y);
      } else {
        zinePageX = zinePage.width;
      }
      let zinePageComponent = createZinePageComponent(zinePageX, 0, i);
      currSpread.appendChild(zinePageComponent);
    } else {
      // back cover: i == numPages-1
      let backCover = createZinePageComponent(x, y, i);
      figmaPage.appendChild(backCover);
    }
    // increment y so the next spread is underneath it

    if (!newSpread) {
      y = y + zinePage.height + margin; 
    }
  }

  createPrintLayout(numPages);
  return true;
}

let makeInstanceOfComponent = function (i : number): InstanceNode {
  //decrement by 1 since zinePageComponents is 0-indexed
  let inst = zinePageComponents[i-1].createInstance();
  return inst;
}

let setZinePages = function (sheet: FrameNode, tl: InstanceNode, tr: InstanceNode, bl: InstanceNode, br: InstanceNode): FrameNode {
  sheet.appendChild(tl);
  
  tr.x = zinePage.width;
  sheet.appendChild(tr);

  bl.y = zinePage.height;
  sheet.appendChild(bl);

  br.x = zinePage.width;
  br.y = zinePage.height;
  sheet.appendChild(br);

  return sheet;
}

let addInstancesToSheets = function(sheetFront: FrameNode, sheetBack: FrameNode, numZinePages: number, sheetNum: number): Boolean {
  // z is an increment for each sheet.
  // For each additional sheet, we add 8 zine pages (4 front and 4 back)
  // The zine page numbers for those on the new sheet get incremented by 4
  var z = sheetNum*4; 

  // Set pages so they look like:
  // Front:              Back:
  //  _______ _______    _______ _______
  // |       |       |  |       |       |
  // |  n-z  |  1+z  |  |  2+z  | n-1-z |
  // |       |       |  |       |       |
  // |———————|———————|  |———————|———————|
  // |       |       |  |       |       |
  // | n-2-z |  3+z  |  |  4+z  |  3+z  |
  // |       |       |  |       |       |
  //  ——————— ———————    ——————— ———————
  //
  // 3 initial shorthand used: 
  // "f" = front / "b" = back
  // "t" = top   / "b" = bottom
  // "l" = left  / "r" = right

  var ftl = makeInstanceOfComponent(numZinePages-z)
  var ftr = makeInstanceOfComponent(1+z)
  var fbl = makeInstanceOfComponent(numZinePages-2-z)
  var fbr = makeInstanceOfComponent(3+z)
  setZinePages(sheetFront, ftl, ftr, fbl, fbr)


  var btl = makeInstanceOfComponent(2+z)
  var btr = makeInstanceOfComponent(numZinePages-1-z)
  var bbl = makeInstanceOfComponent(4+z)
  var bbr = makeInstanceOfComponent(numZinePages-3-z)

  setZinePages(sheetBack, btl, btr, bbl, bbr)

  return true;
}

let createPrintLayout = function(numZinePages : number): Boolean {
    // CREATE PRINTED LAYOUT
    let printPages = numZinePages/4; // number of sides of paper
    let sheets = numZinePages/8;
    var initialX = paper.width + margin*4;
    var x = initialX;
    var y = 0;

    var name = "";
    var sheetNum = 0;

    interface PrintPage {
      front: FrameNode, 
      back: FrameNode
    }
    var allPages : Array<PrintPage> = [];


    // create parent frames
    for (var i=0; i<sheets; i++) {
      var sheetFront = createFrame(x, y, paper.width, paper.height);
      sheetFront.name = (sheetNum+1).toString() + " - Front";
      figmaPage.appendChild(sheetFront);

      x += paper.width + margin;

      var sheetBack = createFrame(x, y, paper.width, paper.height);
      sheetBack.name = (sheetNum+1).toString() + " - Back";
      figmaPage.appendChild(sheetBack);

      allPages.push({front : sheetFront, back : sheetBack});

      addInstancesToSheets(sheetFront, sheetBack, numZinePages, sheetNum);

      x = initialX;
      y += paper.height + margin;
      sheetNum++;
    }

    return true;
}


// Calls to "parent.postMessage" from within the HTML page will trigger this
// callback. The callback will be passed the "pluginMessage" property of the
// posted message.
figma.ui.onmessage = msg => {
  // One way of distinguishing between different types of messages sent from
  // your HTML page is to use an object with a "type" property like this.
  if (msg.type === 'create-design-layout') {
    console.log(msg.count);

    numZinePages = msg.count * 8;
    createDesignLayout(numZinePages);

  } else if (msg.type === 'create-print-layout') {
    createPrintLayout(numZinePages);
  }

  // Make sure to close the plugin when you're done. Otherwise the plugin will
  // keep running, which shows the cancel button at the bottom of the screen.
  figma.closePlugin();
};
