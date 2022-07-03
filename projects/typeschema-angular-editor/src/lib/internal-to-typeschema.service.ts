import {Injectable} from '@angular/core';
import {Specification} from "./model/Specification";
import {Type} from "./model/Type";
import {Property} from "./model/Property";

@Injectable({
  providedIn: 'root'
})
export class InternalToTypeSchemaService {

  constructor() { }

  transform(spec: Specification): object {
    const schema: any = {};

    const definitions: any = {};
    spec.types.forEach((type) => {
      definitions[type.name] = this.transformType(type);
    });

    schema.definitions = definitions;

    if (typeof spec.root === 'number' && spec.types[spec.root]) {
      schema['$ref'] = spec.types[spec.root].name;
    }

    return schema;
  }

  private transformType(type: Type): object {
    const result: any = {};

    if (this.isset(type.description)) {
      result.description = type.description;
    }

    if (type.type === 'reference') {
      result['$ref'] = type.ref;

      if (this.isset(type.template)) {
        result['$template'] = {
          T: type.template
        };
      }
    } else if (type.type === 'map') {
      result.type = 'object';
      result.additionalProperties = {};

      if (type.ref) {
        const props = this.resolveType([type.ref]);
        for (const [key, value] of Object.entries(props)) {
          result.additionalProperties[key] = value;
        }
      } else {
        throw new Error('Type must contain a reference');
      }
    } else {
      result.type = 'object';

      if (this.isset(type.parent)) {
        result['$extends'] = type.parent;
      }

      if (type.properties && type.properties.length > 0) {
        const props: any = {};
        type.properties.forEach((property) => {
          props[property.name] = this.generateProperty(property);
        })
        result.properties = props;
      }
    }

    return result;
  }

  private generateProperty(property: Property): object {
    const result: any = {};

    if (this.isset(property.description)) {
      result.description = property.description;
    }
    if (this.isset(property.nullable)) {
      result.nullable = property.nullable;
    }
    if (this.isset(property.deprecated)) {
      result.deprecated = property.deprecated;
    }
    if (this.isset(property.readonly)) {
      result.readonly = property.readonly;
    }

    const refs = property.refs;
    if (property.type === 'object') {
      const props = this.resolveType(refs);
      for (const [key, value] of Object.entries(props)) {
        result[key] = value;
      }
    } else if (property.type === 'map') {
      result.type = 'object';
      result.additionalProperties = this.resolveType(refs);
    } else if (property.type === 'array') {
      result.type = 'array';
      result.items = this.resolveType(refs);
    } else if (property.type === 'string') {
      result.type = 'string';
      if (this.isset(property.format)) {
        result.format = property.format;
      }
      if (this.isset(property.pattern)) {
        result.pattern = property.pattern;
      }
      if (this.isset(property.minLength)) {
        result.minLength = property.minLength;
      }
      if (this.isset(property.maxLength)) {
        result.maxLength = property.maxLength;
      }
    } else if (property.type === 'integer') {
      result.type = 'integer';
      if (this.isset(property.minimum)) {
        result.minimum = property.minimum;
      }
      if (this.isset(property.maximum)) {
        result.maximum = property.maximum;
      }
    } else if (property.type === 'number') {
      result.type = 'number';
      if (this.isset(property.minimum)) {
        result.minimum = property.minimum;
      }
      if (this.isset(property.maximum)) {
        result.maximum = property.maximum;
      }
    } else if (property.type === 'boolean') {
      result.type = 'boolean';
    } else if (property.type === 'any') {
      result.type = 'any';
    } else if (property.type === 'union') {
      result.oneOf = [];
      refs?.forEach((ref) => {
        result.oneOf.push(this.resolveType([ref]))
      });
    } else if (property.type === 'intersection') {
      result.allOf = [];
      refs?.forEach((ref) => {
        result.allOf.push(this.resolveType([ref]))
      });
    }

    return result;
  }

  private resolveType(refs?: Array<string>): object {
    if (!refs || refs.length === 0) {
      throw new Error('Type must contain a reference');
    }

    if (refs.length === 1) {
      const ref = refs[0];
      if (['string', 'integer', 'number', 'boolean', 'any'].includes(ref)) {
        return {
          type: ref
        };
      } else if (ref === 'T') {
        return {
          $generic: 'T'
        };
      } else {
        return {
          $ref: ref
        };
      }
    } else if (refs.length > 1) {
      const types: Array<object> = [];
      refs.forEach((type) => {
        types.push(this.resolveType([type]));
      });

      return {
        oneOf: types
      };
    } else {
      throw new Error('Type must contain a reference');
    }
  }

  private isset(value: any): boolean {
    return typeof value !== 'undefined' && value !== null;
  }
}
