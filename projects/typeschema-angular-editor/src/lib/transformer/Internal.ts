import {TransformerInterface} from "./TransformerInterface";
import {Specification} from "../model/Specification";
import {BCLayerService} from "../bclayer.service";

export class Internal implements TransformerInterface {

  public constructor(private bcLayerService: BCLayerService) {
  }

  async transform(schema: string): Promise<Specification> {
    let spec = JSON.parse(schema) as Specification;

    spec = this.bcLayerService.transform(spec);

    return spec;
  }

}
