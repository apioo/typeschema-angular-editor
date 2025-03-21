import {Specification} from "../model/Specification";
import {TypeSchema} from "./TypeSchema";
import {Operation} from "../model/Operation";
import {Argument} from "../model/Argument";
import {Throw} from "../model/Throw";
import {TypeHubService} from "../typehub.service";
import {TypeAPI as TypeAPISpec} from "typeapi-model";
import {Operation as TypeAPIOperation} from "typeapi-model";
import {ResolverService} from "../resolver.service";

export class TypeAPI extends TypeSchema {

  constructor(typeHubService: TypeHubService, resolverService: ResolverService) {
    super(typeHubService, resolverService);
  }

  override async transform(schema: string): Promise<Specification> {
    const data = JSON.parse(schema) as TypeAPISpec;
    const spec = await this.build(data);

    if (this.isset(data.operations) && typeof data.operations === 'object') {
      for (const [key, value] of Object.entries(data.operations)) {
        spec.operations.push(this.transformOperation(key, value));
      }
    }

    return spec;
  }

  private transformOperation(name: string, data: TypeAPIOperation): Operation {
    let operation: Operation = {
      name: name,
      description: data.description && typeof data.description === 'string' ? data.description : '',
      httpMethod: data.method && typeof data.method === 'string' ? data.method.toUpperCase() : 'GET',
      httpPath: data.path && typeof data.path === 'string' ? data.path : '/',
      httpCode: data.return && data.return.code && typeof data.return.code === 'number' ? data.return.code : 200,
      arguments: [],
      payload: '',
      payloadShape: undefined,
      throws: [],
      return: '',
      returnShape: undefined,
    };

    if (data.arguments) {
      for (const [key, value] of Object.entries(data.arguments)) {
        if (value.in === 'body') {
          if (value.contentType) {
            operation.payload = value.contentType;
            operation.payloadShape = 'mime';
          } else if (value.schema) {
            operation.payload = this.parseRef(value.schema);
            operation.payloadShape = this.parseShape(value.schema);
          }
        } else {
          operation.arguments.push(this.transformArgument(key, value));
        }
      }
    }

    if (data.throws) {
      for (const [key, value] of Object.entries(data.throws)) {
        operation.throws.push(this.transformThrow(key, value));
      }
    }

    if (data.return) {
      if (data.return.contentType) {
        operation.return = data.return.contentType;
        operation.returnShape = 'mime';
      } else if (data.return.schema) {
        operation.return = this.parseRef(data.return.schema);
        operation.returnShape = this.parseShape(data.return.schema);
      }
    }

    if (data.stability && typeof data.stability === 'number') {
      if (data.stability === 0 || data.stability === 1 || data.stability === 2 || data.stability === 3) {
        operation.stability = data.stability;
      }
    }

    if (data.security && Array.isArray(data.security)) {
      operation.security = data.security;
    }

    if (data.authorization && typeof data.authorization === 'boolean') {
      operation.authorization = data.authorization;
    }

    return operation;
  }

  private transformArgument(name: string, data: any): Argument {
    return {
      name: name,
      in: data.in && typeof data.in === 'string' ? data.in : 'query',
      type: this.parseRef(data.schema),
    };
  }

  private transformThrow(name: string, data: any): Throw {
    return {
      code: data.code && typeof data.code === 'number' ? data.code : 500,
      type: this.parseRef(data.schema),
    };
  }

  private parseShape(data: any): string|undefined {
    const typeName = data.type;
    if (this.isset(data.type) && (typeName === 'map' || (data.type === 'object' && this.isset(data.additionalProperties)))) {
      return 'map';
    } else if (this.isset(data.type) && (typeName === 'array' || (data.type === 'array' && this.isset(data.items)))) {
      return 'array';
    } else {
      return;
    }
  }

}
