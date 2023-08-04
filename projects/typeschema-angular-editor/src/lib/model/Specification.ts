import {Type} from "./Type";
import {Include} from "./Include";
import {Operation} from "./Operation";

export interface Specification {
  imports: Array<Include>
  operations: Array<Operation>
  types: Array<Type>
  root?: number
}

