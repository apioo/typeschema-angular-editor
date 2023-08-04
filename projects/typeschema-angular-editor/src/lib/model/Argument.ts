
export interface Argument {
  name: string;
  in: 'path' | 'query' | 'header' | 'body';
  type: string;
}
