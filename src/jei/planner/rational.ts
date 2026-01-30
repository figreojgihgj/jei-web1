/**
 * Rational number arithmetic for precise calculations
 * Based on FactorioLab's rational implementation
 */

export class Rational {
  constructor(
    public readonly n: bigint,  // numerator
    public readonly d: bigint   // denominator
  ) {
    if (d === 0n) throw new Error('Denominator cannot be zero');
    if (d < 0n) {
      this.n = -n;
      this.d = -d;
    }
  }

  static get zero() { return new Rational(0n, 1n); }
  static get one() { return new Rational(1n, 1n); }
  static get two() { return new Rational(2n, 1n); }
  static get half() { return new Rational(1n, 2n); }

  static from(n: number | bigint | string): Rational {
    if (typeof n === 'bigint') return new Rational(n, 1n);
    if (typeof n === 'number') return Rational.fromNumber(n);
    return Rational.parse(n);
  }

  private static fromNumber(n: number): Rational {
    if (!Number.isFinite(n)) return Rational.zero;
    const s = n.toString();
    const dot = s.indexOf('.');
    if (dot === -1) return new Rational(BigInt(Math.round(n)), 1n);
    const d = BigInt(10 ** (s.length - dot - 1));
    const nValue = BigInt(s.replace('.', ''));
    return new Rational(nValue, d);
  }

  private static parse(s: string): Rational {
    s = s.trim();
    const slash = s.indexOf('/');
    if (slash !== -1) {
      const n = BigInt(s.substring(0, slash).trim());
      const d = BigInt(s.substring(slash + 1).trim());
      return new Rational(n, d);
    }
    const dot = s.indexOf('.');
    if (dot !== -1) {
      const intPart = s.substring(0, dot);
      const decPart = s.substring(dot + 1);
      const d = BigInt(10 ** decPart.length);
      const n = BigInt(intPart + decPart);
      return new Rational(n, d);
    }
    return new Rational(BigInt(s), 1n);
  }

  add(other: Rational): Rational {
    return new Rational(
      this.n * other.d + other.n * this.d,
      this.d * other.d
    ).simplify();
  }

  sub(other: Rational): Rational {
    return new Rational(
      this.n * other.d - other.n * this.d,
      this.d * other.d
    ).simplify();
  }

  mul(other: Rational): Rational {
    return new Rational(this.n * other.n, this.d * other.d).simplify();
  }

  div(other: Rational): Rational {
    if (other.n === 0n) throw new Error('Division by zero');
    return new Rational(this.n * other.d, this.d * other.n).simplify();
  }

  neg(): Rational {
    return new Rational(-this.n, this.d);
  }

  abs(): Rational {
    return this.n < 0n ? this.neg() : this;
  }

  sign(): number {
    if (this.n === 0n) return 0;
    return this.n < 0n ? -1 : 1;
  }

  eq(other: Rational): boolean {
    return this.n === other.n && this.d === other.d;
  }

  ne(other: Rational): boolean {
    return !this.eq(other);
  }

  lt(other: Rational): boolean {
    return this.cmp(other) < 0;
  }

  le(other: Rational): boolean {
    return this.cmp(other) <= 0;
  }

  gt(other: Rational): boolean {
    return this.cmp(other) > 0;
  }

  ge(other: Rational): boolean {
    return this.cmp(other) >= 0;
  }

  private cmp(other: Rational): number {
    const a = this.n * other.d;
    const b = other.n * this.d;
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  }

  isZero(): boolean {
    return this.n === 0n;
  }

  isNegative(): boolean {
    return this.n < 0n;
  }

  nonzero(): boolean {
    return this.n !== 0n;
  }

  simplify(): Rational {
    const g = gcd(this.n < 0n ? -this.n : this.n, this.d);
    if (g === 0n) return new Rational(0n, 1n);
    return new Rational(this.n / g, this.d / g);
  }

  toNumber(): number {
    return Number(this.n) / Number(this.d);
  }

  toString(): string {
    const s = this.simplify();
    if (s.d === 1n) return s.n.toString();
    return `${s.n}/${s.d}`;
  }

  toFixed(decimals: number): string {
    const factor = BigInt(10 ** decimals);
    const value = this.simplify().n * factor / this.simplify().d;
    const intPart = value / factor;
    const decPart = (value % factor).toString().padStart(decimals, '0');
    return `${intPart}.${decPart}`;
  }

  ceil(): Rational {
    if (this.d === 1n) return this;
    const q = this.n / this.d;
    const r = this.n % this.d;
    if (r === 0n) return new Rational(q, 1n);
    return new Rational(this.n >= 0n ? q + 1n : q, 1n);
  }

  floor(): Rational {
    if (this.d === 1n) return this;
    return new Rational(this.n / this.d, 1n);
  }

  round(): Rational {
    if (this.d === 1n) return this;
    const halfD = this.d / 2n;
    if (this.n >= 0n) {
      return this.n % this.d >= halfD ? this.ceil() : this.floor();
    }
    return (-this.n) % this.d >= halfD ? this.floor() : this.ceil();
  }

  max(other: Rational): Rational {
    return this.ge(other) ? this : other;
  }

  min(other: Rational): Rational {
    return this.le(other) ? this : other;
  }
}

function gcd(a: bigint, b: bigint): bigint {
  while (b !== 0n) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a;
}

// Utility functions
export function rational(n: number | bigint | string): Rational {
  return Rational.from(n);
}

export const R_ZERO = Rational.zero;
export const R_ONE = Rational.one;
export const R_TWO = Rational.two;
export const R_HALF = Rational.half;
