import {Specification} from "../model/Specification";
import {JsonSchemaJson} from "./JsonSchemaJson";
import {Operation} from "../model/Operation";
import {pascalCase} from "pascal-case";
import {Throw} from "../model/Throw";
import {Argument} from "../model/Argument";

export class OpenAPIJson extends JsonSchemaJson {

  data: Record<string, any> = {};
  inlineObjects: Record<string, any> = {};

  override async transform(schema: string): Promise<Specification> {
    this.data = JSON.parse(schema) as Record<string, any>;
    const spec = await this.build(this.data);

    this.inlineObjects = {};

    if (this.isset(this.data['paths']) && typeof this.data['paths'] === 'object') {
      for (const [path, value] of Object.entries(this.data['paths'])) {
        if (value !== null && typeof value === 'object') {
          const operations = await this.transformPath(path, value);
          operations.forEach((operation) => {
            spec.operations.push(operation);
          });
        }
      }
    }

    for (const [key, value] of Object.entries(this.inlineObjects)) {
      try {
        spec.types.push(await this.transformType(key, value));
      } catch (error) {
      }
    }

    return spec;
  }

  private async transformPath(path: string, method: object): Promise<Array<Operation>> {
    const operations: Array<Operation> = [];

    for (const [methodName, value] of Object.entries(method)) {
      let name = '';
      if (this.isset(value.operationId) && typeof value.operationId === 'string') {
        name = value.operationId.replace('/', '.');
      } else {
        name = pascalCase(path.substring(1).replace('/', '.') + '.' + methodName);
      }

      let description = '';
      if (this.isset(value.summary) && typeof value.summary === 'string') {
        description = value.summary;
      } else if (this.isset(value.description) && typeof value.description === 'string') {
        description = value.description;
      }

      let args: Array<Argument> = [];
      if (this.isset(value.parameters) && Array.isArray(value.parameters)) {
        value.parameters.forEach((parameter: Record<string, any>) => {
          try {
            args.push(this.parseArgument(parameter));
          } catch (error) {
          }
        });
      }

      let payload: string|undefined = undefined;
      if (this.isset(value.requestBody) && typeof value.requestBody === 'object') {
        payload = await this.parsePayload(value.requestBody);
      }

      let httpCode = 200;
      let result = '';
      let throws: Array<Throw> = [];
      if (this.isset(value.responses) && typeof value.responses === 'object') {
        for (const [code, resp] of Object.entries(value.responses)) {
          if (resp === null || typeof resp !== 'object') {
            continue;
          }

          try {
            let responseCode = parseInt(code);
            if (responseCode >= 200 && responseCode < 300) {
              httpCode = responseCode;
              result = await this.parseResponseRef(resp);
            } else if (responseCode >= 400 && responseCode < 600) {
              throws.push({
                code: responseCode,
                type: await this.parseResponseRef(resp),
              })
            }
          } catch (error) {
          }
        }
      }

      let tags: Array<string> = [];
      if (this.isset(value.tags) && Array.isArray(value.tags)) {
        tags = value.tags;
      }

      operations.push({
        name: name,
        description: description,
        httpMethod: methodName.toUpperCase(),
        httpPath: path,
        httpCode: httpCode,
        arguments: args,
        payload: payload,
        payloadShape: undefined,
        throws: throws,
        return: result,
        returnShape: undefined,
        tags: tags
      });
    }

    return operations;
  }

  private async parsePayload(requestBody: object) {
    const payload = await this.parseResponseRef(requestBody);
    if (payload) {
      return payload;
    } else {
      return;
    }
  }

  private parseArgument(parameter: Record<string, any>): Argument {
    if (this.isset(parameter['$ref']) && typeof parameter['$ref'] === 'string') {
      const resolved = this.resolve(parameter['$ref']);
      if (!resolved) {
        throw new Error('Could not resolve ref');
      }
      parameter = resolved;
    }

    let type = '';
    if (this.isset(parameter['schema']) && typeof parameter['schema'] === 'object') {
      type = this.parseArgumentSchema(parameter['schema']);
    }

    if (type && (parameter['in'] === 'path' || parameter['in'] === 'query')) {
      return {
        name: parameter['name'],
        in: parameter['in'],
        type: type,
      };
    } else {
      throw new Error('Provided an invalid argument');
    }
  }

  private parseArgumentSchema(schema: Record<string, any>): string {
    if (this.isset(schema['$ref']) && typeof schema['$ref'] === 'string') {
      const resolved = this.resolve(schema['$ref']);
      if (this.isset(resolved['type']) && typeof resolved['type'] === 'string' && this.scalarTypes.includes(resolved['type'])) {
        return resolved['type'];
      }
    }

    if (this.isset(schema['$ref']) && typeof schema['$ref'] === 'string') {
      return this.normalizeRef(schema['$ref']);
    } else if (this.isset(schema['type']) && typeof schema['type'] === 'string') {
      return schema['type'];
    } else {
      return '';
    }
  }

  private async parseResponseRef(response: Record<string, any>): Promise<string> {
    if (this.isset(response['$ref']) && typeof response['$ref'] === 'string') {
      response = this.resolve(response['$ref']);
    }

    let schema = this.extractSchema(response);
    if (!schema) {
      return '';
    }

    let ref = schema['$ref'];
    if (typeof ref === 'string') {
      return this.normalizeRef(ref);
    } else {
      const hash = await this.namingService.hash(JSON.stringify(schema));
      const anonymousName = 'Object_' + hash;
      this.inlineObjects[anonymousName] = schema;

      return anonymousName;
    }
  }

  private extractSchema(response: Record<string, any>): Record<string, any>|undefined {
    if (this.isset(response['content']) && typeof response['content'] === 'object') {
      if (this.isset(response['content']['application/json']) && typeof response['content']['application/json'] === 'object') {
        if (this.isset(response['content']['application/json']['schema']) && typeof response['content']['application/json']['schema'] === 'object') {
          return response['content']['application/json']['schema'];
        }
      }
    }
    return;
  }

  private resolve(ref: string): Record<string, any> {
    if (!ref.startsWith('#/')) {
      throw new Error('Can only resolve local refs');
    }

    ref = ref.substring(2);

    let data = this.data;
    ref.split('/').forEach((name) => {
      if (this.isset(data[name])) {
        data = data[name];
      } else {
        throw new Error('Could not resolve ' + name);
      }
    })

    return data;
  }

  protected override normalizeRef(ref: string): string {
    return ref
      .replace('#/components/schemas/', '');
  }

}
