import {Specification} from "../model/Specification";
import {JsonSchemaJson} from "./JsonSchemaJson";
import {parse} from 'yaml'

export class JsonSchemaYaml extends JsonSchemaJson {

  override async transform(schema: string): Promise<Specification> {
    return super.transform(JSON.stringify(parse(schema)));
  }

}
