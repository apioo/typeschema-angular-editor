
export interface Property {
  name: string;
  description: string;
  deprecated?: boolean;
  nullable?: boolean;
  type?: string;
  format?: string;
  default?: string;
  reference?: string;
  generic?: string;
  template?: Record<string, string>;
  metadata?: Record<string, string>;
}
