
function getCharLength(theByte) {
  // 4 bytes encoded char (mask 11110000)
  if (0xF0 == (theByte & 0xF0)) {
    return 4;
    // 3 bytes encoded char (mask 11100000)
  } else if (0xE0 == (theByte & 0xE0)) {
    return 3;
    // 2 bytes encoded char (mask 11000000)
  } else if (0xC0 == (theByte & 0xC0)) {
    return 2;
    // 1 bytes encoded char
  } else if (theByte == (theByte & 0x7F)) {
    return 1;
  }
  return 0;
};

function getCharCode(bytes, byteOffset, charLength) {
  let charCode = 0,
  mask = '';
  byteOffset = byteOffset || 0;
  // validate that the array has at least one byte in it
  if (bytes.length - byteOffset <= 0) {
    throw new Error('No more characters remaining in array.');
  }
  // Retrieve charLength if not given
  charLength = charLength || getCharLength(bytes[byteOffset]);
  if (charLength == 0) {
    throw new Error(bytes[byteOffset].toString(2) + ' is not a significative' +
      ' byte (offset:' + byteOffset + ').');
  }
  // Return byte value if charlength is 1
  if (1 === charLength) {
    return bytes[byteOffset];
  }
  // validate that the array has enough bytes to make up this character
  if (bytes.length - byteOffset < charLength) {
    throw new Error('Expected at least ' + charLength + ' bytes remaining in array.');
  }
  // Test UTF8 integrity
  mask = '00000000'.slice(0, charLength) + 1 + '00000000'.slice(charLength + 1);
  if (bytes[byteOffset] & (parseInt(mask, 2))) {
    throw Error('Index ' + byteOffset + ': A ' + charLength + ' bytes' +
      ' encoded char' + ' cannot encode the ' + (charLength + 1) + 'th rank bit to 1.');
  }
  // Reading the first byte
  mask = '0000'.slice(0, charLength + 1) + '11111111'.slice(charLength + 1);
  charCode += (bytes[byteOffset] & parseInt(mask, 2)) << ((--charLength) * 6);
  // Reading the next bytes
  while (charLength) {
    if (0x80 !== (bytes[byteOffset + 1] & 0x80)
       || 0x40 === (bytes[byteOffset + 1] & 0x40)) {
      throw Error('Index ' + (byteOffset + 1) + ': Next bytes of encoded char'
         + ' must begin with a "10" bit sequence.');
    }
    charCode += ((bytes[++byteOffset] & 0x3F) << ((--charLength) * 6));
  }
  return charCode;
};
export function decodeUTF8(bytes, byteOffset, byteLength, strict) {
  let charLength,
  chars = [];
  byteOffset = byteOffset | 0;
  byteLength = ('number' === typeof byteLength ?
    byteLength :
    bytes.byteLength || bytes.length);
  for (; byteOffset < byteLength; byteOffset++) {
    charLength = getCharLength(bytes[byteOffset]);
    if (byteOffset + charLength > byteLength) {
      if (strict) {
        throw Error('Index ' + byteOffset + ': Found a ' + charLength +
          ' bytes encoded char declaration but only ' +
          (byteLength - byteOffset) + ' bytes are available.');
      }
    } else {
      chars.push(String.fromCodePoint(
          getCharCode(bytes, byteOffset, charLength, strict)));
    }
    byteOffset += charLength - 1;
  }
  return chars.join('');
}