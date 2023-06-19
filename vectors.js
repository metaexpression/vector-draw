console.log('vector manipulation module loaded')

const distance = (x1, y1, x2, y2) =>
  sqrt(abs(pow(x2 - x1, 2)) + abs(pow(y2 - y1, 2)))

// cubic bezier interpolation
const cubicBezier = (x0, y0, x1, y1, x2, y2, x3, y3) => {
  const y = (t) =>
    pow(1 - t, 3) * y0 +
    3 * pow(1 - t, 2) * t * y1 +
    3 * (1 - t) * pow(t, 2) * y2 +
    pow(t, 3) * y3;

  const x = (t) =>
    pow(1 - t, 3) * x0 +
    3 * pow(1 - t, 2) * t * x1 +
    3 * (1 - t) * pow(t, 2) * x2 +
    pow(t, 3) * x3;

  const res = [];

  for (let t = 0; t <= 1; t = t + 1 / 100) {
    const valX = x(t);
    const valY = y(t);
    res.push([valX, valY]);
  }

  res.push([x3, y3])

  return res;
};

const minimumDistanceFactor = 6 // px

// minimum distance adjustment for performance
// start, left, right, end
// this is the second big performance bottleneck
const cubicBezierSample = (x0, y0, x1, y1, x2, y2, x3, y3) => {
  const y = (t) =>
    pow(1 - t, 3) * y0 +
    3 * pow(1 - t, 2) * t * y1 +
    3 * (1 - t) * pow(t, 2) * y2 +
    pow(t, 3) * y3;

  const x = (t) =>
    pow(1 - t, 3) * x0 +
    3 * pow(1 - t, 2) * t * x1 +
    3 * (1 - t) * pow(t, 2) * x2 +
    pow(t, 3) * x3;

  const res = [];

  res.push([x(0), y(0)])

  for (let t = 0; t <= 1; t = t + 1 / 50) {
    let [lx, ly] = res[res.length - 1]
    let nx = x(t);
    let ny = y(t);
    let distance = sqrt(abs(pow(nx - lx, 2)) + abs(pow(ny - ly, 2)))
    if (distance > minimumDistanceFactor) {
      res.push([nx, ny]);
    } else {
      t -= 1/100 // half speed increment
    }
  }

  res.push([x3, y3])

  return res;
};

// bidirectional minimum squared distance from interpolated samples
// probably some kind of caching that can be done here, because this is going to be called a /lot/
//   could bake a map of per-pixel nearest distances to the feehand point and do a lookup,
//     which is a lot faster than iterating through the entire freehand sample and calculating distances
// might be a way to do it bi-directionally, where the first process marks which freehand points the
//  test points are closest to, which reduces the search space by quite a bit, especially if the curves are close
//   the way to do this might be to construct an array or map for each distance
const curveDistance = (c1, c2) => {
  let distance = 0
  c1.forEach(([x0, y0]) => {
    let lowest = Number.MAX_VALUE
    c2.forEach(([x1, y1]) => {
      let value = abs(pow(x1 - x0, 2)) + abs(pow(y1 - y0, 2))
      lowest = value < lowest ? value : lowest
    })
    distance += lowest
  })
  c2.forEach(([x0, y0]) => {
    let lowest = Number.MAX_VALUE
    c1.forEach(([x1, y1]) => {
      let value = abs(pow(x1 - x0, 2)) + abs(pow(y1 - y0, 2))
      lowest = value < lowest ? value : lowest
    })
    distance += lowest
  })
  return distance
}

const optimizedCurveDistance = (freehand, sample) => {
  let {distanceMap} = freehand
  let pointMap = new Map()
  let distance = 0

  // sample-to-curve point-per-distance
  for (let point of sample) {
    let [x0, y0] = point
    let ix = getBucketIndex(x0)
    let iy = getBucketIndex(y0)
    if (distanceMap.has(ix) && distanceMap.get(ix).has(iy)) {
      // fast method
      let distanceEntry = distanceMap.get(ix).get(iy)
      distance += distanceEntry.distance * distanceEntry.distance
      if (pointMap.has(distanceEntry.point)) {
        // already there, append
        let entry = pointMap.get(distanceEntry.point)
        entry.push(point)
      } else {
        // new entry
        pointMap.set(distanceEntry.point, [point])
      }
    } else {
      // slow method
      let lowest = Number.MAX_VALUE
      freehand.sample.forEach(([x1, y1]) => {
        let value = abs(pow(x1 - x0, 2)) + abs(pow(y1 - y0, 2))
        lowest = value < lowest ? value : lowest
      })
      distance += lowest
    }
  }

  for (let point of freehand.sample) {
    let [x0, y0] = point
    let searchArray = sample
    if (pointMap.has(point)) {
      searchArray = pointMap.get(point)
    }
    let lowest = Number.MAX_VALUE
    searchArray.forEach(([x1, y1]) => {
      let value = abs(pow(x1 - x0, 2)) + abs(pow(y1 - y0, 2))
      lowest = value < lowest ? value : lowest
    })
    distance += lowest
  }

  return distance
}

// for the freehand data
const minimumDistanceSample = (c) => {
  let ps = [c[0]]
  c.slice(0).forEach(p => {
    let [x1, y1] = p
    let [x2, y2] = ps[ps.length - 1]
    if (distance(x1, y1, x2, y2) > minimumDistanceFactor) {
      ps.push(p)
    }
  })
  let lastPoint = c[c.length - 1]
  let lastSample = ps[ps.length - 1]
  if (!(lastPoint[0] === lastSample[0] && lastPoint[1] === lastPoint[1])) {
    ps.push(lastPoint)
  }
  return ps
}

const bucketSize = 3 //px
const pointRadius = 12 //px

const getBucketIndex = (n) => {
  return round(n / bucketSize)
}

const getBucketCenter = (x, y) => {
  return [(x * bucketSize) + (bucketSize / 2), (y * bucketSize) + (bucketSize / 2)]
}

// buckets are indexed by number, then multipled by the bucket size
// entries include the point (reference) and the distance (unsquared)
const makeDistanceMap = (curve) => {
  let distanceMap = new Map()

  const addEntry = (x, y, point) => {
    let ix = getBucketIndex(x)
    let iy = getBucketIndex(y)
    let [cx, cy] = getBucketCenter(ix, iy)
    let currentDistance = distance(cx, cy, point[0], point[1])
    if (!distanceMap.has(ix)) {
      distanceMap.set(ix, new Map())
    }
    let innerMap = distanceMap.get(ix)
    if (innerMap.has(iy)) {
      let entry = innerMap.get(iy)
      let lastDistance = entry.distance
      if (currentDistance < lastDistance) {
        entry.point = point
        entry.distance = currentDistance
      }
    } else {
      innerMap.set(iy, {point, distance: currentDistance})
    }
  }

  curve.forEach(point => {
    let [cx, cy] = point
    let [x1, y1] = [cx - pointRadius, cy - pointRadius]
    let [x2, y2] = [cx + pointRadius, cy + pointRadius]
    for (let x = x1; x < x2; x += bucketSize) {
      for (let y = y1; y < y2; y += bucketSize) {
        addEntry(x, y, point)
      }
    }
  })

  return distanceMap
}

// change beteen two angles in radiens
//   positive for incrasing angle (clockwise)
//   ranges from 0 to PI
//   both need to be normalized
const angularDelta = (a1, a2) => {
  let positiveDistance = abs(a2 - a1)
  if (positiveDistance > PI) {
    return PI - abs(PI - positiveDistance)
  } else {
    return positiveDistance
  }
}

const angularDistance = (a1, a2) => abs(angularDelta(a1, a2))

const averageAngles = (a1, a2) => {
  let positiveDistance = abs(a2 - a1)
  let smaller = a1 < a2 ? a1 : a2
  let larger = a1  > a2 ? a1 : a2
  let delta = angularDistance(a1, a2) / 2
  if (positiveDistance > PI) {
    // negative distance
    return normalizeAngle(larger + delta)
  } else {
    // positive distance
    return normalizeAngle(smaller + delta)
  }
}

// normalize an angle to [0, 2PI] (radiens)
const normalizeAngle = (a) => {
  if (a === -0) {
    return 0
  }
  // account for angles over 2PI and below -2PI
  let angle = a % (2*PI)
  // account for negative angles
  if (angle < 0) {
    angle = (2*PI) + angle
  }
  return angle
}
