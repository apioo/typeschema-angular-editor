import {Property} from "./Property";

export interface Type {
  type: string;
  name: string;
  description: string;
  abstract?: boolean;
  parent?: string;
  properties?: Array<Property>;
  reference?: string;
  template?: Record<string, string>;
  discriminator?: string;
  mapping?: Record<string, string>;
}
