import {Type} from "./Type";

export interface Include {
  alias: string;
  url: string;
  types?: Array<Type>;
}
