
type DecodeResult = Promise<string | object>;

declare interface basicInterface {
  encoded: Uint8Array;
  decoded: object | string;
  name: string;
  protoDecode: (encoded: Uint8Array) => Promise<string>;
  /**
   * @return Promise(resolve: Uint8Array)
   */
  encode: (decoded?: object | string) => Promise<Uint8Array>;
  /**
   * @return {Promise(resolve: object|string)}
   */
  decode: () => Promise<object | string>;
  toString: (encoding: string) => Promise<string>;
  keys: string[];
  toArray: () => Promise<number[]>;

  /**
   * @param {Uint8Array} source
   */
  fromEncoded: (source: Uint8Array) => Promise<object | string>;

  /**
   * @param {String} encoded
   */
  fromHex: (source: string) => Promise<object | string>;


  isHex(string): boolean;
  isBase32(string): boolean;
  /**
   *
   * @param {base58} string
   */
  isBase58(string: base58): boolean;
  /**
   * @param {base58} encoded
   */
  fromBs32(encoded: base58): Promise<string | object>;

  /**
   * @param {base58} encoded
   */
   fromBs58(encoded: base58): Promise<string | object>;
}
