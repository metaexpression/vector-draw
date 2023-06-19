console.log('static analysis module loaded')

const curveDisplacement = (curve) => {
  let sum = 0
  for (let i = 0; i < curve.length - 1; i++) {
    let [x1, y1] = curve[i]
    let [x2, y2] = curve[i + 1]
    sum += distance(x1, y1, x2, y2)
  }
  return sum
}

// TODO: this needs to be optimized out, too many lookups
const getSlopeAtDisplacement = (curve, slopes, dx) => {
  let sum = 0
  for (let i = 0; i < curve.length - 1; i++) {
    let [x1, y1] = curve[i]
    let [x2, y2] = curve[i + 1]
    let d = distance(x1, y1, x2, y2)
    if (sum + d >= dx) {
      return slopes[i]
    }
    sum += d
  }
  return slopes[slopes.length - 1]
}

const smoothingWindow = 10
const smoothingIncrement = 2

const slopeAnalysis = (freehand) => {
  let curve = freehand.sample

  let slopes = []
  let totalLength = curveDisplacement(curve)
  freehand.totalLength = totalLength
  console.log(`total length: ${totalLength}`)
  let pointAverages = new Array(floor(totalLength/smoothingIncrement))

  // calculate basic angles
  for (let i = 0; i < curve.length - 1; i++) {
    let [x1, y1] = curve[i]
    let [x2, y2] = curve[i + 1]
    let deltaY = y2 - y1
    let deltaX = x2 - x1
    let t = Math.atan2(deltaY, deltaX)
    slopes.push(normalizeAngle(t))
  }

  // interpolated slope averages
  for (let i = 0; i < smoothingWindow; i += smoothingIncrement) {
    for (let displacement = i; displacement < totalLength; displacement += smoothingWindow) {
      let s = getSlopeAtDisplacement(curve, slopes, displacement)
      let p = floor(displacement/smoothingIncrement)
      if (pointAverages[p] === undefined) {
        pointAverages[p] = s
      } else {
        let s2 = pointAverages[p]
        pointAverages[p] = averageAngles(s, s2)
      }
    }
  }

  let breakpoints = getBreakpoints(curve, slopes)

  return {angles: slopes, breakpoints}
}

const minimumCurveSize = PI / 8
const cornerThreshold = 0.8
const nodeProximityFactor = 1/10

// find breakpoints where:
//   the line curves enough it can't be represented by a single node
//   places where the line curves suddenly
//   peaks/valleys where the line changes direction
// merge nearby points at the end
// use this to mark cusp nodes???
const getBreakpoints = (curve, angles) => {
  let breakpoints = []
  let curves = []

  let lastAngle = angles[0]
  let curvature = 0
  let magnitude = 0
  let lastDirection = 0
  let lastPeak = 0

  const resetCurveData = () => {
    curvature = 0
    magnitude = 0
    lastDirection = 0
    lastPeak = 0
  }

  angles.forEach((angle, i) => {
    let delta = angularDelta(lastAngle, angle)
    let currentDirection = delta > 0 ? 1 : -1
    let currentPoint = curve[i] // not really, but this is easier

    // corner detection
    if (delta > cornerThreshold) {
      breakpoints.push({origin: currentPoint, angle})
      resetCurveData()
      lastAngle = angle
      return null
    }

    if (currentDirection === lastDirection) {
      // same curve
      curvature += delta
      magnitude++
    } else {
      // different curve, maybe
      if (delta < minimumCurveSize) {
        // discard the current point
        return null
      }
      // yup, different curve

    }

    lastAngle = angle
  })

  // merge close points?
  breakpoints.forEach(i => {

  })

  if (breakpoints.length === 0) {
    let i = round(angles.length / 2)
    breakpoints.push({origin: curve[i], angle: angles[i]})
  }

  return breakpoints
}
