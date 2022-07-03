import {Type} from "./Type";
import {Include} from "./Include";

export interface Specification {
  imports: Array<Include>
  types: Array<Type>
  root?: number
}

