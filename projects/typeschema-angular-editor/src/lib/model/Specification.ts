import {Type} from "./Type";
import {Include} from "./Include";
import {Operation} from "./Operation";
import {Security} from "./Security";

export interface Specification {
  imports: Array<Include>
  operations: Array<Operation>
  types: Array<Type>
  root?: number
  baseUrl?: string
  security?: Security
}

