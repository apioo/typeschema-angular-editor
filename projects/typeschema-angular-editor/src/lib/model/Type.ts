import {Property} from "./Property";

export interface Type {
  type: string;
  name: string;
  description: string;
  parent?: string;
  properties?: Array<Property>;
  ref?: string;
  template?: string;
}
