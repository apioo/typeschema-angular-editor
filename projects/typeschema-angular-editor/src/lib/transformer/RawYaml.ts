import {RawJson} from "./RawJson";
import {Specification} from "../model/Specification";
import {parse} from "yaml";

export class RawYaml extends RawJson {

  override async transform(schema: string): Promise<Specification> {
    return super.transform(JSON.stringify(parse(schema)));
  }

}
