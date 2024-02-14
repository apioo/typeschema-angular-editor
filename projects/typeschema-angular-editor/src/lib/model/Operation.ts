import {Argument} from "./Argument";
import {Throw} from "./Throw";

export interface Operation {
  name: string;
  description?: string;
  httpMethod: string;
  httpPath: string;
  httpCode: number;
  arguments: Array<Argument>
  throws: Array<Throw>
  return: string,
  returnShape?: string,
  stability?: 0 | 1 | 2 | 3,
  security?: Array<string>,
  authorization?: boolean,
  tags?: Array<string>,
}
