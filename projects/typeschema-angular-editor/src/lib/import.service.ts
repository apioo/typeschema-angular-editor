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
import {BCLayerService} from "./bclayer.service";
import {ResolverService} from "./resolver.service";
import {NamingService} from "./naming.service";

@Injectable({
  providedIn: 'root'
})
export class ImportService {

  private transformer: Record<string, TransformerInterface> = {};

  constructor(typeHubService: TypeHubService, bcLayerService: BCLayerService, resolverService: ResolverService, namingService: NamingService) {
    this.transformer['internal'] = new Internal(bcLayerService);
    this.transformer['typeapi'] = new TypeAPI(typeHubService, resolverService, namingService);
    this.transformer['typeschema'] = new TypeSchema(typeHubService, resolverService, namingService);
    this.transformer['openapi-json'] = new OpenAPIJson(typeHubService, resolverService, namingService);
    this.transformer['openapi-yaml'] = new OpenAPIYaml(typeHubService, resolverService, namingService);
    this.transformer['jsonschema-json'] = new JsonSchemaJson(typeHubService, resolverService, namingService);
    this.transformer['jsonschema-yaml'] = new JsonSchemaYaml(typeHubService, resolverService, namingService);
    this.transformer['raw-json'] = new RawJson(typeHubService, namingService);
    this.transformer['raw-yaml'] = new RawYaml(typeHubService, namingService);
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
