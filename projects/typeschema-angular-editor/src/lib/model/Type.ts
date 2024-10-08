import {Property} from "./Property";

export interface Type {
  type: string;
  name: string;
  description: string;
  deprecated?: boolean;
  parent?: string;
  base?: boolean;
  properties?: Array<Property>;
  discriminator?: string;
  mapping?: Record<string, string>;
  template?: Record<string, string>;
  reference?: string;
  generic?: string;
}
