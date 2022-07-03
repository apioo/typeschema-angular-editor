import {Injectable} from '@angular/core';
import {Type} from "./model/Type";
import {Property} from "./model/Property";
import {Specification} from "./model/Specification";
import {pascalCase} from "pascal-case";

@Injectable({
  providedIn: 'root'
})
export class TypeSchemaToInternalService {

  constructor() { }

  transform(schema: any): Specification {
    const spec: Specification = {
      imports: [],
      types: []
    };
    const typeNames: Array<string> = [];

    if (this.isset(schema.definitions) && typeof schema.definitions === 'object') {
      for (const [key, value] of Object.entries(schema.definitions)) {
        spec.types.push(this.transformType(key, value));
        typeNames.push(key);
      }
    }

    if (this.isset(schema.properties) && typeof schema.properties === 'object') {
      // it looks like we have a root schema we try to convert
      let key = 'Root';
      if (this.isset(schema.title) && typeof schema.title === 'string') {
        key = this.normalizeTitle(schema.title);
      }

      spec.types.push(this.transformType(key, {
        description: schema.description,
        type: 'object',
        properties: schema.properties,
      }));
      typeNames.push(key);
      spec.root = spec.types.length - 1;
    }

    if (this.isset(schema.$ref) && typeof schema.$ref === 'string') {
      const index = typeNames.indexOf(schema.$ref);
      if (index !== -1) {
        spec.root = index;
      }
    }

    return spec;
  }

  private transformType(name: string, data: any): Type {
    let type: Type;
    if (this.isset(data.$ref)) {
      type = {
        type: 'reference',
        name: name,
        description: data.description && typeof data.description === 'string' ? data.description : '',
        ref: data.$ref
      };

      if (this.isset(data.$template) && this.isset(data.$template.T) && typeof data.$template.T === 'string') {
        type.template = data.$template.T;
      }
    } else if (this.isset(data.additionalProperties)) {
      type = {
        type: 'map',
        name: name,
        description: data.description && typeof data.description === 'string' ? data.description : '',
      };

      const refs = this.parseRef(data.additionalProperties);
      if (refs.length > 0) {
        type.ref = refs[0];
      }
    } else {
      type = {
        type: 'object',
        name: name,
        description: data.description && typeof data.description === 'string' ? data.description : '',
      };

      if (this.isset(data.$extends) && typeof data.$extends === 'string') {
        type.parent = data.$extends;
      }

      if (this.isset(data.properties) && typeof data.properties === 'object') {
        type.properties = [];
        for (const [key, value] of Object.entries(data.properties)) {
          type.properties.push(this.transformProperty(key, value));
        }
      }
    }

    return type;
  }

  private transformProperty(name: string, data: any): Property {
    let refs: Array<string> = [];
    let type;
    let format, pattern, minLength, maxLength, minimum, maximum;
    let i;
    if (this.isset(data.additionalProperties)) {
      type = 'map';
      refs = refs.concat(this.parseRef(data.additionalProperties));
    } else if (this.isset(data.items)) {
      type = 'array';
      refs = refs.concat(this.parseRef(data.items));
    } else if (this.isset(data.oneOf) && Array.isArray(data.oneOf)) {
      type = 'union';
      for (i = 0; i < data.oneOf.length; i++) {
        refs = refs.concat(this.parseRef(data.oneOf[i]));
      }
    } else if (this.isset(data.allOf) && Array.isArray(data.allOf)) {
      type = 'intersection';
      for (i = 0; i < data.allOf.length; i++) {
        refs = refs.concat(this.parseRef(data.allOf[i]));
      }
    } else if (this.isset(data.$ref)) {
      type = 'object';
      refs = refs.concat(this.parseRef(data));
    } else if (data.type === 'string') {
      type = 'string';
      if (this.isset(data.format)) {
        format = data.format;
      }
      if (this.isset(data.pattern)) {
        pattern = data.pattern;
      }
      if (this.isset(data.minLength)) {
        minLength = data.minLength;
      }
      if (this.isset(data.maxLength)) {
        maxLength = data.maxLength;
      }
    } else if (data.type === 'integer') {
      type = 'integer';
      if (this.isset(data.minimum)) {
        minimum = data.minimum;
      }
      if (this.isset(data.maximum)) {
        maximum = data.maximum;
      }
    } else if (data.type === 'number') {
      type = 'number';
      if (this.isset(data.minimum)) {
        minimum = data.minimum;
      }
      if (this.isset(data.maximum)) {
        maximum = data.maximum;
      }
    } else if (data.type === 'boolean') {
      type = 'boolean';
    } else if (data.type === 'any') {
      type = 'any';
    } else {
      throw new Error('Could not resolve type: ' + JSON.stringify(data));
    }

    const property: Property = {
      name: name,
      description: data.description && typeof data.description === 'string' ? data.description : '',
      type: type,
    };

    if (this.isset(data.deprecated) && typeof data.deprecated === 'boolean') {
      property.deprecated = data.deprecated;
    }

    if (this.isset(data.nullable) && typeof data.nullable === 'boolean') {
      property.nullable = data.nullable;
    }

    if (this.isset(data.readonly) && typeof data.readonly === 'boolean') {
      property.readonly = data.readonly;
    }

    if (this.isset(format) && typeof format === 'string') {
      property.format = format;
    }

    if (this.isset(pattern) && typeof pattern === 'string') {
      property.pattern = pattern;
    }

    if (this.isset(minLength) && typeof minLength === 'number') {
      property.minLength = minLength;
    }

    if (this.isset(maxLength) && typeof maxLength === 'number') {
      property.maxLength = maxLength;
    }

    if (this.isset(minimum) && typeof minimum === 'number') {
      property.minimum = minimum;
    }

    if (this.isset(maximum) && typeof maximum === 'number') {
      property.maximum = maximum;
    }

    if (refs.length > 0) {
      property.refs = refs;
    }

    return property;
  }

  private parseRef(data: any): Array<string> {
    if (this.isset(data.$ref) && typeof data.$ref === 'string') {
      return [data.$ref];
    } else if (this.isset(data.$generic)) {
      return ['T'];
    } else if (this.isset(data.oneOf) && Array.isArray(data.oneOf)) {
      let result = new Array<string>();
      for (let i = 0; i < data.oneOf.length; i++) {
        result = result.concat(this.parseRef(data.oneOf[i]));
      }
      return result;
    } else if (data.type === 'string' || data.type === 'integer' || data.type === 'number' || data.type === 'boolean' || data.type === 'any') {
      return [data.type];
    } else if (data.type === 'array') {
      // at the moment we can not handle array inside maps but we simply return the array type
      return this.parseRef(data.items);
    } else {
      throw new Error('Could not resolve ref: ' + JSON.stringify(data));
    }
  }

  private normalizeTitle(title: string): string {
    return pascalCase(title);
  }

  private isset(value: any): boolean {
    return typeof value !== 'undefined' && value !== null;
  }
}
