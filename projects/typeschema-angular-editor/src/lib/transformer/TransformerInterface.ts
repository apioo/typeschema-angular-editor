import {Specification} from "../model/Specification";

export interface TransformerInterface {

  transform(schema: string): Promise<Specification>;

}
