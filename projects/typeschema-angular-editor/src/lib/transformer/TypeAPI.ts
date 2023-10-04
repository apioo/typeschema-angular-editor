import {Specification} from "../model/Specification";
import {TypeSchema} from "./TypeSchema";
import {Operation} from "../model/Operation";
import {Argument} from "../model/Argument";
import {Throw} from "../model/Throw";
import {TypeHubService} from "../typehub.service";

export class TypeAPI extends TypeSchema {

  constructor(typeHubService: TypeHubService) {
    super(typeHubService);
  }

  override async transform(schema: string): Promise<Specification> {
    const data = JSON.parse(schema) as Record<string, any>;
    const spec = await this.build(data);

    if (this.isset(data['operations']) && typeof data['operations'] === 'object') {
      for (const [key, value] of Object.entries(data['operations'])) {
        spec.operations.push(this.transformOperation(key, value));
      }
    }

    return spec;
  }

  private transformOperation(name: string, data: any): Operation {
    let operation: Operation = {
      name: name,
      description: data.description && typeof data.description === 'string' ? data.description : '',
      httpMethod: data.method && typeof data.method === 'string' ? data.method.toUpperCase() : 'GET',
      httpPath: data.path && typeof data.path === 'string' ? data.path : '/',
      httpCode: data.return && data.return.code && typeof data.return.code === 'number' ? data.return.code : 200,
      arguments: [],
      throws: [],
      return: '',
    };

    if (data.arguments) {
      for (const [key, value] of Object.entries(data.arguments)) {
        operation.arguments.push(this.transformArgument(key, value));
      }
    }

    if (data.throws) {
      for (const [key, value] of Object.entries(data.throws)) {
        operation.throws.push(this.transformThrow(key, value));
      }
    }

    if (data.return && data.return.schema) {
      operation.return = this.parseRef(data.return.schema)[0];
    }

    if (data.stability && typeof data.stability === 'number') {
      operation.stability = data.stability;
    }

    if (data.security && Array.isArray(data.security)) {
      operation.security = data.security;
    }

    if (data.authorization && typeof data.authorization === 'boolean') {
      operation.authorization = data.authorization;
    }

    if (data.tags && Array.isArray(data.tags)) {
      operation.tags = data.tags;
    }

    return operation;
  }

  private transformArgument(name: string, data: any): Argument {
    return {
      name: name,
      in: data.in && typeof data.in === 'string' ? data.in : 'query',
      type: this.parseRef(data.schema)[0],
    };
  }

  private transformThrow(name: string, data: any): Throw {
    return {
      code: data.code && typeof data.code === 'number' ? data.code : 500,
      type: this.parseRef(data.schema)[0],
    };
  }

}
