import {Injectable} from '@angular/core';
import {Specification} from "./model/Specification";
import {TypeHubService} from "./typehub.service";
import {TransformerInterface} from "./transformer/TransformerInterface";
import {Internal} from "./transformer/Internal";
import {JsonSchemaJson} from "./transformer/JsonSchemaJson";
import {OpenAPIJson} from "./transformer/OpenAPIJson";
import {TypeSchema} from "./transformer/TypeSchema";
import {TypeAPI} from "./transformer/TypeAPI";
import {OpenAPIYaml} from "./transformer/OpenAPIYaml";
import {JsonSchemaYaml} from "./transformer/JsonSchemaYaml";
import {RawJson} from "./transformer/RawJson";
import {RawYaml} from "./transformer/RawYaml";

@Injectable({
  providedIn: 'root'
})
export class BCLayerService {

  transform(specification: Specification): Specification {
    // extract body argument to payload
    specification.operations.forEach((operation, operationIndex) => {
      if (operation.payload) {
        return;
      }

      operation.arguments.forEach((argument, argumentIndex) => {
        if (argument.in === 'body') {
          operation.payload = argument.type;
          operation.payloadShape = undefined;

          specification.operations[operationIndex].arguments?.splice(argumentIndex, 1);
        }
      });
    });

    return specification;
  }

}
