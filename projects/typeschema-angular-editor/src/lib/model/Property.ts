
export interface Property {
  name: string;
  description: string;
  type?: string;
  format?: string;
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  deprecated?: boolean;
  nullable?: boolean;
  readonly?: boolean;
  refs?: Array<string>;
}
