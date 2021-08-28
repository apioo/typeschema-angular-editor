import {Injectable} from '@angular/core';
import {Document} from './model/Document';

@Injectable({
  providedIn: 'root'
})
export class SchemaTransformerService {

  constructor() { }

  transform(definitions: any): Array<Type> {
    const result: Array<Type> = [];

    for (const key in definitions) {
      if (!definitions.hasOwnProperty(key)) {
        continue;
      }
      result.push(this.transformType(key, definitions[key]));
    }

    return result;
  }

  private transformType(name: string, data: any): Type {
    let type: Type;
    if (data.$ref) {
      type = {
        type: 'reference',
        name: name,
        description: data.description && typeof data.description === 'string' ? data.description : '',
        ref: data.$ref
      };

      if (data.$template) {
        type.template = data.$template.T;
      }
    } else if (data.additionalProperties) {
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

      if (data.$extends) {
        type.parent = data.$extends;
      }

      if (data.properties) {
        type.properties = [];
        for (const key in data.properties) {
          if (!data.properties.hasOwnProperty(key)) {
            continue;
          }
          type.properties.push(this.transformProperty(key, data.properties[key]));
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
    if (data.additionalProperties) {
      type = 'map';
      refs = refs.concat(this.parseRef(data.additionalProperties));
    } else if (data.items) {
      type = 'array';
      refs = refs.concat(this.parseRef(data.items));
    } else if (data.oneOf) {
      type = 'union';
      for (i = 0; i < data.oneOf.length; i++) {
        refs = refs.concat(this.parseRef(data.oneOf[i]));
      }
    } else if (data.allOf) {
      type = 'intersection';
      for (i = 0; i < data.allOf.length; i++) {
        refs = refs.concat(this.parseRef(data.allOf[i]));
      }
    } else if (data.$ref) {
      type = 'object';
      refs = refs.concat(this.parseRef(data));
    } else if (data.type === 'string') {
      type = 'string';
      if (data.format) {
        format = data.format;
      }
      if (data.pattern) {
        pattern = data.pattern;
      }
      if (data.minLength) {
        minLength = data.minLength;
      }
      if (data.maxLength) {
        maxLength = data.maxLength;
      }
    } else if (data.type === 'integer') {
      type = 'integer';
      if (data.minimum) {
        minimum = data.minimum;
      }
      if (data.maximum) {
        maximum = data.maximum;
      }
    } else if (data.type === 'number') {
      type = 'number';
      if (data.minimum) {
        minimum = data.minimum;
      }
      if (data.maximum) {
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

    if (data.deprecated) {
      property.deprecated = data.deprecated;
    }

    if (data.nullable) {
      property.nullable = data.nullable;
    }

    if (data.readonly) {
      property.readonly = data.readonly;
    }

    if (format) {
      property.format = format;
    }

    if (pattern) {
      property.pattern = pattern;
    }

    if (minLength) {
      property.minLength = minLength;
    }

    if (maxLength) {
      property.maxLength = maxLength;
    }

    if (minimum) {
      property.minimum = minimum;
    }

    if (maximum) {
      property.maximum = maximum;
    }

    if (refs.length > 0) {
      property.refs = refs;
    }

    return property;
  }

  private parseRef(data: any): Array<string> {
    if (data.$ref) {
      return [data.$ref];
    } else if (data.$generic) {
      return ['T'];
    } else if (data.oneOf) {
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
}

export interface Property {
  name: string;
  description: string;
  type?: string;
  format?: string;
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  deprecated?: boolean;
  nullable?: boolean;
  readonly?: boolean;
  refs?: Array<string>;
}

export interface Type {
  type: string;
  name: string;
  description: string;
  parent?: string;
  properties?: Array<Property>;
  ref?: string;
  template?: string;
}

export interface Include {
  alias: string;
  version: string;
  document: Document|undefined;
  types: Array<Type>|undefined;
}
