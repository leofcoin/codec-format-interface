import { BasicInterface } from "../dist";

declare class FormatInterface extends BasicInterface {
  decode: () => Promise<object | string>
}
