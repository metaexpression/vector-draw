console.log('vector-draw :: 0.1 [dev]')

const includeJS = (path) => {
  const script = document.createElement('script');
  script.src = path;
  script.type = 'text/javascript';
  document.querySelector('head').appendChild(script);
}

includeJS('util.js')
includeJS('vectors.js')
includeJS('metaheuristic.js')
includeJS('static-analysis.js')

var drawInput = []
var isDrawing = false

var canvas;
var ctx;

const lastPoint = () => drawInput[drawInput.length - 1]

const drawCurve = (start, left, right, end) => {
  ctx.strokeStyle = '#333';
  ctx.beginPath()
  ctx.moveTo(start[0], start[1])
  ctx.bezierCurveTo(left[0], left[1], right[0], right[1], end[0], end[1])
  ctx.stroke()
}

const drawHandle = (point, color) => {
  ctx.strokeStyle = color;
  ctx.strokeRect(point[0] - 2, point[1] - 2, 4, 4);
}

const drawHandleCircle = (point, color) => {
  ctx.strokeStyle = color;
  ctx.beginPath()
  ctx.arc(point[0], point[1], 3, 0, 2 * Math.PI);
  ctx.stroke()
}

const drawSquareShade = (x, y, size, amount) => {
  ctx.fillStyle = `rgb(${amount*255}, 128, 128)`;
  ctx.fillRect(x, y, size, size)
}

const drawInlineSVG = (svgElement) => {
  var svgURL = new XMLSerializer().serializeToString(svgElement)
  var img = new Image()
  img.onload = () => {
    ctx.drawImage(this, 0, 0)
  }
  img.src = 'data:image/svg+xml; charset=utf8, ' + encodeURIComponent(svgURL)
}

const drawPoint = (x1, y1) => {
  ctx.fillRect(x1, y1, 2, 2)
}

const drawLine = (x1, y1, x2, y2) => {
  ctx.beginPath();
  ctx.strokeStyle = '#ccc';
  ctx.lineWidth = 1;
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.closePath();
}

const canvasMouseDown = e => {
  isDrawing = true
  drawInput.push([e.offsetX, e.offsetY])
}

const canvasMovement = e => {
  if (isDrawing) {
    let [lastX, lastY] = lastPoint()
    drawLine(lastX, lastY, e.offsetX, e.offsetY)
    drawInput.push([e.offsetX, e.offsetY])
  }
}

const canvasMouseUp = e => {
  if (isDrawing) {
    let [lastX, lastY] = lastPoint()
    drawLine(lastX, lastY, e.offsetX, e.offsetY)
    isDrawing = false;
    handleLineData(drawInput)
    drawInput = []
  }
}

// TODO: cheerfully ignore any freehand lines with less than two sampled points
const handleLineData = (data) => {
  let freehand = {data}
  freehand.sample = minimumDistanceSample(data)
  freehand.distanceMap = makeDistanceMap(freehand.sample)
  freehand.analysis = slopeAnalysis(freehand)

  // console.log(freehand)

  // visualize distancemap

  // for (let x of freehand.distanceMap.keys()) {
  //   let innerMap = freehand.distanceMap.get(x)
  //   for (let y of innerMap.keys()) {
  //     let entry = innerMap.get(y)
  //     let amount = entry.distance / 20
  //     amount = amount > 1 ? 1 : amount
  //     drawSquareShade(x * bucketSize, y * bucketSize, bucketSize, amount)
  //   }
  // }

  let curve = fitCurve(freehand)

  console.log(freehand)

  curve.draw()
}

window.onload = (e) => {
  canvas = document.getElementById("canvas")
  ctx = canvas.getContext("2d")
  canvas.addEventListener('mousedown', canvasMouseDown)
  canvas.addEventListener('mousemove', canvasMovement)
  canvas.addEventListener('mouseup', canvasMouseUp)
}
