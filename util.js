const range = (start, end) => Array.from({ length: end - start + 1 }, (_, i) => i)

const random = (min, max) => Math.random() * (max - min) + min

const spread = (center, limit) => random(center - limit, center + limit)

const lerp = (x, y, t) => x*t + y*(1 - t)

const {pow, abs, sqrt, sin, cos, tan, PI, round, floor, ceil} = Math
