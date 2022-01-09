const binaryRegex = /^(0|1)+$/;

export class BitDescriptor {
  value: number;
  bits: number;

  constructor(value: number, bits: number) {
    if (!(value > -1 && Number.isInteger(value))) {
      throw new Error('value must be an integer > -1');
    }

    if (!(bits > 0 && Number.isInteger(bits))) {
      throw new Error('bits must be an integer > 0');
    }

    this.value = value;
    this.bits = bits;
  }

  static fromString(value: string) {
    if (!binaryRegex.test(value)) {
      throw new Error('value must be a binary string');
    }
    return new BitDescriptor(parseInt(value, 2), value.length);
  }
}

type UnpackFn<T> = (pattern: string) => T;
export class BitPacker {
  static pack(bitDescriptors: Array<BitDescriptor>): Uint8Array {
    let size = 0;
    for (const bitDesc of bitDescriptors) {
      size += bitDesc.bits;
    }
    size = (size + 7) >>> 3;

    const buffer = new Uint8Array(size);
    BitPacker.packIntoBuffer(bitDescriptors, buffer);
    return buffer;
  }

  static packIntoBuffer(bitDescriptors: Array<BitDescriptor>, buffer: Uint8Array): void {
    let index = 0;
    let bitIndex = 7;

    for (const bitDesc of bitDescriptors) {
      const value = bitDesc.value;
      let vLength = bitDesc.bits;

      while (vLength > 0) {
        if (index >= buffer.byteLength) return;
        const bitsToPack = bitIndex + 1;

        if (vLength <= bitsToPack) {
          const mask = ((1 << vLength) - 1);
          buffer[index] |= (value & mask) << (bitsToPack - vLength);

          bitIndex -= vLength;
          if (bitIndex === -1) {
            bitIndex = 7;
            index++;
          }

          vLength = 0;
        } else {
          const mask = ((1 << bitsToPack) - 1) << (vLength - bitsToPack);
          buffer[index] |= (value & mask) >>> (vLength - bitsToPack);

          bitIndex = 7;
          index++;
          vLength -= bitsToPack;
        }
      }
    }
  }

  static createUnpackIterator = function* <T>(buffer: Uint8Array, unpackFn: UnpackFn<T>) {
    let index = 0;
    let bitIndex = 7;

    let pattern = '';

    while (index < buffer.byteLength) {
      pattern += (buffer[index] & (1 << bitIndex)) >>> bitIndex;
      bitIndex--;

      const transformedPatternValue = unpackFn(pattern);
      if (transformedPatternValue !== null) {
        yield transformedPatternValue;
        pattern = '';
      }

      if (bitIndex === -1) {
        index++;
        bitIndex = 7;
      }
    }
  }
}

const packed = BitPacker.pack([
  BitDescriptor.fromString('101'),
  BitDescriptor.fromString('00001000'),
  BitDescriptor.fromString('1111111111'),
  BitDescriptor.fromString('0'),
  BitDescriptor.fromString('111'),
]);
