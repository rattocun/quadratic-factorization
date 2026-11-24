function gcd(a, b) {
  while (b !== 0n) {
    [a, b] = [b, a % b];
  }
  return a < 0n ? -a : a;
}

function randomBelow(limit) {
  if (limit === 1n) return 0n;

  const bits = (limit - 1n).toString(2).length;
  const bytes = new Uint8Array(Math.ceil(bits / 8));
  const firstByteMask = 255 >> (bytes.length * 8 - bits);

  while (true) {
    crypto.getRandomValues(bytes);
    bytes[0] &= firstByteMask;
    let value = 0n;
    for (const byte of bytes) {
      value = (value << 8n) | BigInt(byte);
    }
    if (value < limit) return value;
  }
}

export async function drawFactor([linearMin, linearMax], [constantMin, constantMax], label) {
  if (linearMin === 0n && linearMax === 0n) {
    throw new Error(`Allow a nonzero leading coefficient for ${label}.`);
  }

  // With a zero constant, only ±1 can give a coprime pair.
  if (constantMin === 0n && constantMax === 0n) {
    const choices = [-1n, 1n].filter(value => linearMin <= value && value <= linearMax);
    if (choices.length) return [choices[Number(randomBelow(BigInt(choices.length)))], 0n];
    throw new Error(`No coprime pair is available for ${label} in those ranges.`);
  }

  const includesZero = linearMin <= 0n && 0n <= linearMax;
  const linearCount = linearMax - linearMin + (includesZero ? 0n : 1n);
  const constantCount = constantMax - constantMin + 1n;
  for (let attempt = 0; attempt < 32; attempt += 1) {
    let linear = linearMin + randomBelow(linearCount);
    if (includesZero && linear >= 0n) linear += 1n;
    const constant = constantMin + randomBelow(constantCount);
    if (gcd(linear, constant) === 1n) return [linear, constant];
  }

  // Check rare or impossible settings without storing every valid pair.
  let selected = null;
  let validCount = 0n;
  let pendingChecks = 0;
  for (let linear = linearMin; linear <= linearMax; linear += 1n) {
    if (linear === 0n) continue;
    for (let constant = constantMin; constant <= constantMax; constant += 1n) {
      if (gcd(linear, constant) === 1n) {
        validCount += 1n;
        if (randomBelow(validCount) === 0n) selected = [linear, constant];
      }
      pendingChecks += 1;
      if (pendingChecks === 4096) {
        await new Promise(resolve => setTimeout(resolve, 0));
        pendingChecks = 0;
      }
    }
  }

  if (selected) return selected;
  throw new Error(`No coprime pair is available for ${label} in those ranges.`);
}

export function expand(a, b, c, d) {
  return [a * c, a * d + b * c, b * d];
}

export function formatPolynomial(...terms) {
  let result = "";
  for (const [coefficient, variable] of terms) {
    if (coefficient === 0n) continue;
    const magnitude = coefficient < 0n ? -coefficient : coefficient;
    const term = variable && magnitude === 1n ? variable : `${magnitude}${variable}`;
    const sign = coefficient < 0n ? "−" : "+";
    if (result) {
      result += ` ${sign} ${term}`;
    } else {
      result = coefficient < 0n ? `${sign}${term}` : term;
    }
  }
  return result || "0";
}

function parseFactor(factor) {
  let linear, constant;
  const linearFirst = factor.match(/^([+-]?\d*)x([+-]\d+)?$/);
  if (linearFirst) {
    [, linear, constant] = linearFirst;
  } else {
    const constantFirst = factor.match(/^([+-]?\d+)([+-]\d*)x$/);
    if (!constantFirst) throw new Error("Use two linear factors with integer coefficients.");
    [, constant, linear] = constantFirst;
  }

  if (linear === "" || linear === "+" || linear === "-") linear += "1";
  return [BigInt(linear), BigInt(constant ?? "0")];
}

export function parseAnswer(answer) {
  const normalized = answer.toLowerCase().replace(/\s+/g, "").replace(/−/g, "-");
  const match = normalized.match(/^(-?)\(([^()]+)\)[*×]?\(([^()]+)\)$/);
  if (!match) throw new Error("Enter two factors, for example (2x+3)(x-1).");

  const [, sign, first, second] = match;
  let [a, b] = parseFactor(first);
  const [c, d] = parseFactor(second);
  if (sign === "-") [a, b] = [-a, -b];
  return [a, b, c, d];
}
