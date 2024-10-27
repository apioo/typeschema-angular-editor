import {Injectable} from '@angular/core';
import {Specification} from "./model/Specification";
import {Type} from "./model/Type";
import {Property} from "./model/Property";
import {Operation} from "./model/Operation";

@Injectable({
  providedIn: 'root'
})
export class ExportService {

  constructor() { }

  transform(spec: Specification): object {
    const schema: any = {};

    if (spec.baseUrl !== undefined) {
      schema.baseUrl = spec.baseUrl;
    }

    if (spec.security !== undefined) {
      schema.security = spec.security;
    }

    if (spec.imports && Array.isArray(spec.imports) && spec.imports.length > 0) {
      const imports: Record<string, string> = {};
      spec.imports.forEach((include) => {
        const alias = include.alias;
        const user = include.document?.user?.name;
        const document = include.document?.name;
        const version = include.version;

        if (alias && user && document && version) {
          imports[alias] = 'typehub://' + user + ':' + document + '@' + version;
        }
      });

      schema['import'] = imports;
    }

    if (spec.operations && Array.isArray(spec.operations) && spec.operations.length > 0) {
      const operations: any = {};
      spec.operations.forEach((operation) => {
        operations[operation.name] = this.transformOperation(operation);
      });

      schema.operations = operations;
    }

    if (spec.types && Array.isArray(spec.types) && spec.types.length > 0) {
      const definitions: any = {};
      spec.types.forEach((type) => {
        if (type.type === 'map') {
          definitions[type.name] = this.transformMap(type);
        } else {
          definitions[type.name] = this.transformStruct(type);
        }
      });

      schema.definitions = definitions;
    }

    if (spec.root !== undefined && spec.types[spec.root]) {
      schema['root'] = spec.types[spec.root].name;
    }

    return schema;
  }

  private transformOperation(operation: Operation): object {
    const result: any = {};

    if (this.isset(operation.description)) {
      result.description = operation.description;
    }

    if (this.isset(operation.httpMethod)) {
      result.method = operation.httpMethod;
    }

    if (this.isset(operation.httpPath)) {
      result.path = operation.httpPath;
    }

    const args: Record<string, any> = {};
    if (this.isset(operation.arguments) && Array.isArray(operation.arguments)) {
      operation.arguments.forEach((argument) => {
        if (argument.in === 'path') {
          args[argument.name] = {
            in: 'path',
            schema: this.resolveType(argument.type),
          };
        }
      });
    }

    if (this.isset(operation.payload) && operation.payload) {
      const payload: any = {
        in: 'body',
      };

      if (operation.payloadShape === 'mime') {
        payload.contentType = operation.payload;
      } else {
        payload.schema = this.getSchemaForShape(operation.payload, operation.payloadShape);
      }

      args['payload'] = payload;
    }

    if (this.isset(operation.arguments) && Array.isArray(operation.arguments)) {
      operation.arguments.forEach((argument) => {
        if (argument.in === 'query' || argument.in === 'header') {
          args[argument.name] = {
            in: argument.in,
            schema: this.resolveType(argument.type),
          };
        }
      });
    }

    if (Object.entries(args).length > 0) {
      result.arguments = args;
    }

    if (this.isset(operation.throws) && Array.isArray(operation.throws)) {
      const throws: Array<any> = [];
      operation.throws.forEach((throw_) => {
        const ret: any = {
          code: throw_.code,
        };

        if (throw_.typeShape === 'mime') {
          ret.contentType = throw_.type;
        } else {
          ret.schema = this.getSchemaForShape(throw_.type, throw_.typeShape);
        }

        throws.push(ret);
      });
      result.throws = throws;
    }

    let httpCode = 200;
    if (this.isset(operation.httpCode)) {
      httpCode = operation.httpCode;
    }

    if (this.isset(operation.return) && httpCode !== 204) {
      const ret: any = {};
      ret.code = httpCode;
      if (operation.returnShape === 'mime') {
        ret.contentType = operation.return;
      } else {
        ret.schema = this.getSchemaForShape(operation.return, operation.returnShape);
      }
      result.return = ret;
    }

    return result;
  }

  private getSchemaForShape(type: string, shape?: string)
  {
    if (shape === 'map') {
      return {
        type: 'map',
        schema: {
          type: 'reference',
          target: type
        }
      };
    } else if (shape === 'array') {
      return {
        type: 'array',
        schema: {
          type: 'reference',
          target: type
        }
      };
    } else {
      return {
        type: 'reference',
        target: type
      };
    }
  }

  private transformStruct(type: Type): object {
    const result: Record<string, any> = {};

    if (this.isset(type.description)) {
      result['description'] = type.description;
    }

    if (this.isset(type.deprecated)) {
      result['deprecated'] = type.deprecated;
    }

    result['type'] = 'struct';

    if (this.isset(type.parent)) {
      const parent: Record<string, any> = {};
      parent['type'] = 'reference';
      parent['target'] = type.parent;

      if (this.isset(type.template) && type.template && Object.keys(type.template).length > 0) {
        parent['template'] = type.template;
      }

      result['parent'] = parent;
    }

    if (this.isset(type.base)) {
      result['base'] = type.base;
    }

    if (type.properties && type.properties.length > 0) {
      const props: any = {};
      type.properties.forEach((property) => {
        props[property.name] = this.generateProperty(property);
      })
      result['properties'] = props;
    }

    if (this.isset(type.discriminator)) {
      result['discriminator'] = type.discriminator;
    }

    if (this.isset(type.mapping) && type.mapping && Object.keys(type.mapping).length > 0) {
      result['mapping'] = type.mapping;
    }

    return result;
  }

  private transformMap(type: Type): object {
    const result: Record<string, any> = {};

    if (this.isset(type.description)) {
      result['description'] = type.description;
    }

    if (this.isset(type.deprecated)) {
      result['deprecated'] = type.deprecated;
    }

    result['type'] = 'map';

    if (this.isset(type.reference)) {
      result['schema'] = this.resolveType(type.reference);
    }

    return result;
  }

  private generateProperty(property: Property): object {
    const result: Record<string, any> = {};

    if (this.isset(property.description)) {
      result['description'] = property.description;
    }

    if (this.isset(property.deprecated)) {
      result['deprecated'] = property.deprecated;
    }

    const reference = property.reference;
    const generic = property.generic;
    if (property.type === 'reference') {
      result['type'] = 'reference';
      result['target'] = property.reference;

      if (this.isset(property.template) && property.template && Object.keys(property.template).length > 0) {
        result['template'] = property.template;
      }
    } else if (property.type === 'map') {
      result['type'] = 'map';
      result['schema'] = this.resolveType(reference, generic);
    } else if (property.type === 'array') {
      result['type'] = 'array';
      result['schema'] = this.resolveType(reference, generic);
    } else if (property.type === 'string') {
      result['type'] = 'string';
      if (this.isset(property.format)) {
        result['format'] = property.format;
      }
    } else if (property.type === 'integer') {
      result['type'] = 'integer';
    } else if (property.type === 'number') {
      result['type'] = 'number';
    } else if (property.type === 'boolean') {
      result['type'] = 'boolean';
    } else if (property.type === 'any') {
      result['type'] = 'any';
    } else if (property.type === 'generic') {
      result['type'] = 'generic';
      result['name'] = property.generic;
    }

    return result;
  }

  private resolveType(reference?: string, generic?: string): object {
    if (!reference) {
      throw new Error('Type must contain a reference');
    }

    if (['string', 'integer', 'number', 'boolean', 'any'].includes(reference)) {
      return {
        type: reference
      };
    } else if (reference === 'generic') {
      return {
        type: 'generic',
        name: generic
      };
    } else {
      return {
        type: 'reference',
        target: reference
      };
    }
  }

  private isset(value: any): boolean {
    return typeof value !== 'undefined' && value !== null;
  }
}
