import {Specification} from "../model/Specification";
import {TransformerInterface} from "./TransformerInterface";
import {OpenAPIJson} from "./OpenAPIJson";
import {parse} from "yaml";

export class OpenAPIYaml extends OpenAPIJson {

  override async transform(schema: string): Promise<Specification> {
    return super.transform(JSON.stringify(parse(schema)));
  }

}
