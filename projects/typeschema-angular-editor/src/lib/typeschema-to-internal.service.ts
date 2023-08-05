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

@Injectable({
  providedIn: 'root'
})
export class TypeSchemaToInternalService {

  private transformer: Record<string, TransformerInterface> = {};

  constructor(typeHubService: TypeHubService) {
    this.transformer['internal'] = new Internal();
    this.transformer['typeapi'] = new TypeAPI(typeHubService);
    this.transformer['typeschema'] = new TypeSchema(typeHubService);
    this.transformer['openapi-json'] = new OpenAPIJson(typeHubService);
    this.transformer['openapi-yaml'] = new OpenAPIYaml(typeHubService);
    this.transformer['jsonschema-json'] = new JsonSchemaJson(typeHubService);
    this.transformer['jsonschema-yaml'] = new JsonSchemaYaml(typeHubService);
  }

  async transform(type: SchemaType, schema: string): Promise<Specification> {
    if (this.transformer[type]) {
      return this.transformer[type].transform(schema);
    } else {
      throw new Error('Provided an invalid type')
    }
  }

}

export type SchemaType = 'internal' | 'typeapi' | 'typeschema' | 'openapi-json' | 'openapi-yaml' | 'jsonschema-json' | 'jsonschema-yaml';
