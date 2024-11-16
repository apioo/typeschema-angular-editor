import {Document} from "typehub-javascript-sdk/dist/src/Document";
import {Type} from "./Type";

export interface Include {
  alias: string;
  url: string;
  types?: Array<Type>;
}
