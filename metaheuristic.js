console.log('metaheuristic curve fitting module loaded')

class HeuristicCurveAgent {
  constructor(freehand) {
    let freehandData = freehand.sample
    let analysis = freehand.analysis

    this.freehandData = freehandData
    this.analysis = analysis
    this.firstPoint = freehandData[0]
    this.lastPoint = freehandData[freehandData.length - 1]

    this.curvePoints = []
    this.analysis.breakpoints.forEach(({origin, angle}) => {
      this.curvePoints.push({
        center: origin,
        angle: normalizeAngle(spread(angle, 0.3)), // radiens
        leftPoint: round(random(10, 50)),
        rightPoint: round(random(10, 50)),
      })
    })
  }

  complexityFactor(low, high) {
    return lerp(low, high, freehandData.length / 100)
  }

  calculateControlPositions(c) {
    const {center, angle, leftPoint, rightPoint} = c
    const complimentAngle = angle + PI
    const dx1 = cos(complimentAngle) * leftPoint
    const dy1 = sin(complimentAngle) * leftPoint
    const dx2 = cos(angle) * rightPoint
    const dy2 = sin(angle) * rightPoint
    const [cx, cy] = center
    return [[cx + dx1, cy + dy1], [cx + dx2, cy + dy2]]
  }

  // each cubic bezier segment has a start point, end point, and two control points
  getSegments() {
    let segments = []
    const first = this.firstPoint
    const last = this.lastPoint
    this.curvePoints.forEach((cp, i) => {
      let [left, right] = this.calculateControlPositions(cp)
      if (i === 0 && i === this.curvePoints.length - 1) {
        // only one curve point
        segments.push({start: first, end: cp.center, left: first, right: left})
        segments.push({start: cp.center, end: last, left: right, right: last})
      } else if (i === 0) {
        // first point
        segments.push({start: first, end: cp.center, left: first, right: left, nextCurve: right})
      } else if (i === this.curvePoints.length - 1) {
        // last point
        let previousSegment = segments[segments.length - 1]
        segments.push({start: previousSegment.end, end: cp.center, left: previousSegment.nextCurve, right: left})
        segments.push({start: cp.center, end: last, left: right, right: last})
      } else {
        let previousSegment = segments[segments.length - 1]
        segments.push({start: previousSegment.end, end: cp.center, left: previousSegment.nextCurve, right: left, nextCurve: right})
      }
    })
    return segments
  }

  getSample() {
    let segments = this.getSegments()
    let sample = []
    segments.forEach(s => sample = sample.concat(
      cubicBezierSample(s.start[0], s.start[1], s.left[0], s.left[1], s.right[0], s.right[1], s.end[0], s.end[1])))
    return sample
  }

  getInternalFitness() {

  }

  // TODO: replace the JSON method with a recursive copy (instanceof Object)
  clone() {
    let n = Object.assign(Object.create(HeuristicCurveAgent.prototype), this)
    n.curvePoints = JSON.parse(JSON.stringify(this.curvePoints))
    n.mutate()
    return n
  }

  draw() {
    let segments = this.getSegments()
    segments.forEach(({start, end, left, right}) => drawCurve(start, left, right, end))
    this.curvePoints.forEach((cp) => {
      let [l, r] = this.calculateControlPositions(cp)
      drawHandle(cp.center, '#1b9aea')
      drawHandleCircle(l, '#781bea')
      drawHandleCircle(r, '#1bea84')
    })
  }

  mutate() {
    range(0, random(3, 6)).forEach(() => {

      // move a curve point
      if (random(0, 1) < 0.25) {
        let cp = this.curvePoints[round(random(0, this.curvePoints.length - 1))]
        let mp = [spread(cp.center[0], 5), spread(cp.center[1], 5)]
        cp.center = mp
      }

      // rotate a curve point's angle
      if (random(0, 1) < 0.35) {
        let cp = this.curvePoints[round(random(0, this.curvePoints.length - 1))]
        let na = normalizeAngle(spread(cp.angle, PI / 4))
        cp.angle = na
      }

      // move a control point
      if (random(0, 1) < 0.25) {
        let cp = this.curvePoints[round(random(0, this.curvePoints.length - 1))]
        if (random(0, 1) < 0.5) {
          cp.leftPoint = abs(spread(cp.leftPoint, 10))
        } else {
          cp.rightPoint = abs(spread(cp.rightPoint, 10))
        }
      }

    })
  }
}


const distanceToFitness = (distance, totalLength) =>
  (distance / pow(totalLength, 2)) * 1000

const fitCurve = (freehand) => {
  let population = []
  let generations = 50
  let popCount = 20
  let currentBest = null
  let stagcount = 0

  range(0, popCount).forEach(i => population.push(new HeuristicCurveAgent(freehand)))
  currentBest = population[0]
  range(0, generations).forEach(i => {

    // calculate each agent's fitness
    population.forEach(agent => {
      let sample = agent.getSample()
      let distance = optimizedCurveDistance(freehand, sample)
      agent.fitness = distance
    })

    stagcount++

    // minimize
    population.forEach(agent => {
      if (agent.fitness < currentBest.fitness) {
        stagcount = 0
        //agent.draw()
        currentBest = agent
      }
    })

    // repopulate
    population = []
    range(0, popCount).forEach(i => population.push(currentBest.clone()))

  })

  // stats
  console.log(`stagnant: ${stagcount}`)
  console.log(`fit factor: ${(currentBest.fitness / pow(freehand.totalLength, 2)) * 2000}`)

  return currentBest
}

const testData = [
  [
    520,
    153
  ],
  [
    510,
    151
  ],
  [
    491,
    148
  ],
  [
    466,
    147
  ],
  [
    445,
    146
  ],
  [
    428,
    146
  ],
  [
    418,
    146
  ],
  [
    412,
    149
  ],
  [
    409,
    156
  ]
]
