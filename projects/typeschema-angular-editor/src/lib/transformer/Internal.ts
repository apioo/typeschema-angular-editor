import {TransformerInterface} from "./TransformerInterface";
import {Specification} from "../model/Specification";

export class Internal implements TransformerInterface {

  async transform(schema: string): Promise<Specification> {
    return JSON.parse(schema);
  }

}
