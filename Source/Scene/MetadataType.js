import FeatureDetection from "../Core/FeatureDetection.js";

/**
 * An enum of metadata types.
 *
 * @exports MetadataType
 *
 * @private
 */
var MetadataType = {
  INT8: "INT8",
  UINT8: "UINT8",
  INT16: "INT16",
  UINT16: "UINT16",
  INT32: "INT32",
  UINT32: "UINT32",
  INT64: "INT64",
  UINT64: "UINT64",
  FLOAT32: "FLOAT32",
  FLOAT64: "FLOAT64",
  BOOLEAN: "BOOLEAN",
  STRING: "STRING",
  ENUM: "ENUM",
  ARRAY: "ARRAY",
};

MetadataType.getMin = function (type) {
  switch (type) {
    case MetadataType.INT8:
      return -128;
    case MetadataType.UINT8:
      return 0;
    case MetadataType.INT16:
      return -32768;
    case MetadataType.UINT16:
      return 0;
    case MetadataType.INT32:
      return -2147483648;
    case MetadataType.UINT32:
      return 0;
    case MetadataType.INT64:
      if (FeatureDetection.supportsBigInt()) {
        return BigInt("-9223372036854775808"); // eslint-disable-line
      }
      return -Math.pow(2, 63);
    case MetadataType.UINT64:
      return 0;
    case MetadataType.FLOAT32:
      return -340282346638528859811704183484516925440.0;
  }
};

MetadataType.getMax = function (type) {
  switch (type) {
    case MetadataType.INT8:
      return 127;
    case MetadataType.UINT8:
      return 255;
    case MetadataType.INT16:
      return 32767;
    case MetadataType.UINT16:
      return 65535;
    case MetadataType.INT32:
      return 2147483647;
    case MetadataType.UINT32:
      return 4294967295;
    case MetadataType.INT64:
      if (FeatureDetection.supportsBigInt()) {
        // Need to initialize with a string otherwise the BigInt
        // becomes 9223372036854775808
        return BigInt("9223372036854775807"); // eslint-disable-line
      }
      return Math.pow(2, 63) - 1;
    case MetadataType.UINT64:
      if (FeatureDetection.supportsBigInt()) {
        // Need to initialize with a string otherwise the BigInt
        // becomes 18446744073709551616
        return BigInt("18446744073709551615"); // eslint-disable-line
      }
      return Math.pow(2, 64) - 1;
    case MetadataType.FLOAT32:
      return 340282346638528859811704183484516925440.0;
  }
};

MetadataType.isInteger = function (type) {
  switch (type) {
    case MetadataType.INT8:
    case MetadataType.UINT8:
    case MetadataType.INT16:
    case MetadataType.UINT16:
    case MetadataType.INT32:
    case MetadataType.UINT32:
    case MetadataType.INT64:
    case MetadataType.UINT64:
      return true;
    default:
      return false;
  }
};

MetadataType.isUnsignedInteger = function (type) {
  switch (type) {
    case MetadataType.UINT8:
    case MetadataType.UINT16:
    case MetadataType.UINT32:
    case MetadataType.UINT64:
      return true;
    default:
      return false;
  }
};

MetadataType.normalize = function (value, type) {
  if (value >= 0) {
    return value / MetadataType.getMax(type);
  }

  return -value / MetadataType.getMin(type);
};

MetadataType.unnormalize = function (value, type) {
  if (value >= 0) {
    return value * MetadataType.getMax(type);
  }

  return -value * MetadataType.getMin(type);
};

export default Object.freeze(MetadataType);
