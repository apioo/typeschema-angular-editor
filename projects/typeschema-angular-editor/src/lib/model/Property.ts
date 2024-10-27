
export interface Property {
  name: string;
  description: string;
  type?: string;
  format?: string;
  deprecated?: boolean;
  reference?: string;
  generic?: string;
  template?: Record<string, string>;
}
