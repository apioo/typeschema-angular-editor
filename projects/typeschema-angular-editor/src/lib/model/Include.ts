import {Document} from "../typehub/Document";
import {Type} from "./Type";

export interface Include {
  alias: string;
  version: string;
  document: Document|undefined;
  types: Array<Type>|undefined;
}
