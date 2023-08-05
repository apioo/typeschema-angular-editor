import {Specification} from "../model/Specification";
import {JsonSchemaJson} from "./JsonSchemaJson";
import {Operation} from "../model/Operation";
import {pascalCase} from "pascal-case";
import {Throw} from "../model/Throw";
import {Argument} from "../model/Argument";

export class OpenAPIJson extends JsonSchemaJson {

  override async transform(schema: string): Promise<Specification> {
    const data = JSON.parse(schema) as Record<string, any>;
    const spec = await this.build(data);

    if (this.isset(data['paths']) && typeof data['paths'] === 'object') {
      for (const [path, value] of Object.entries(data['paths'])) {
        if (value !== null && typeof value === 'object') {
          const operations = this.transformPath(path, value);
          operations.forEach((operation) => {
            spec.operations.push(operation);
          });
        }
      }
    }

    return spec;
  }

  private transformPath(path: string, method: object): Array<Operation> {
    const operations: Array<Operation> = [];

    for (const [methodName, value] of Object.entries(method)) {
      let name = '';
      if (this.isset(value.operationId) && typeof value.operationId === 'string') {
        name = value.operationId;
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
          args.push(this.parseArgument(parameter));
        });
      }

      let httpCode = 200;
      let ret = '';
      let throws: Array<Throw> = [];
      if (this.isset(value.responses) && typeof value.responses === 'object') {
        for (const [code, resp] of Object.entries(value.responses)) {
          if (resp !== null && typeof resp === 'object') {
            let responseCode = parseInt(code);
            if (responseCode >= 200 && responseCode < 300) {
              httpCode = responseCode;
              ret = this.parseResponseRef(resp);
            } else if (responseCode >= 400 && responseCode < 600) {
              throws.push({
                code: responseCode,
                type: this.parseResponseRef(resp),
              })
            }
          }
        }
      }

      operations.push({
        name: name,
        description: description,
        httpMethod: methodName.toUpperCase(),
        httpPath: path,
        httpCode: httpCode,
        arguments: args,
        throws: throws,
        return: ret
      });
    }

    return operations;
  }

  private parseArgument(parameter: Record<string, any>): Argument {
    let type = '';
    if (this.isset(parameter['schema']) && typeof parameter['schema'] === 'object') {
      type = this.parseArgumentSchema(parameter['schema']);
    }

    return {
      name: parameter['name'],
      in: parameter['in'],
      type: type,
    };
  }

  private parseArgumentSchema(schema: Record<string, any>): string {
    if (this.isset(schema['$ref']) && typeof schema['$ref'] === 'string') {
      return this.normalizeRef(schema['$ref']);
    } else if (this.isset(schema['type']) && typeof schema['type'] === 'string') {
      return schema['type'];
    } else {
      return '';
    }
  }

  private parseResponseRef(response: Record<string, any>): string {
    let schema = this.extractSchema(response);
    if (!schema) {
      return '';
    }

    let ref = schema['$ref'];
    if (typeof ref === 'string') {
      ref = this.normalizeRef(ref);
    }

    if (!ref) {
      ref = '';
    }

    return ref;
  }

  private extractSchema(response: Record<string, any>): Record<string, any>|undefined {
    if (this.isset(response['content']) && typeof response['content'] === 'object') {
      if (this.isset(response['application/json']) && typeof response['application/json'] === 'object') {
        if (this.isset(response['schema']) && typeof response['schema'] === 'object') {
          return response['schema'];
        }
      }
    }
    return;
  }

  private normalizeRef(ref: string): string {
    return ref.replace('#/components/schemas/', '');
  }

}
