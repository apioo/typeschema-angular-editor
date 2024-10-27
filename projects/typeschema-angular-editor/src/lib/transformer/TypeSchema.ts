import {Specification} from "../model/Specification";
import {TypeHubService} from "../typehub.service";
import {Include} from "../model/Include";
import {Type} from "../model/Type";
import {Property} from "../model/Property";
import {pascalCase} from "pascal-case";
import {TransformerInterface} from "./TransformerInterface";

export class TypeSchema implements TransformerInterface {

  anonymousObjects: Record<string, any> = {};

  protected scalarTypes = ['string', 'integer', 'number', 'boolean', 'any'];

  constructor(protected typeHubService: TypeHubService) {
  }

  async transform(schema: string): Promise<Specification> {
    return this.build(JSON.parse(schema));
  }

  protected async build(data: Record<string, any>) {
    this.anonymousObjects = {};

    const typeNames: Array<string> = [];
    const spec: Specification = {
      imports: [],
      operations: [],
      types: []
    };

    if (this.isset(data['$import']) && typeof data['$import'] === 'object') {
      for (const [key, value] of Object.entries(data['$import'])) {
        const include = await this.transformImport(key, value);
        if (include) {
          spec.imports.push(include);
        }
      }
    }

    if (this.isset(data['$defs']) && typeof data['$defs'] === 'object') {
      for (const [key, value] of Object.entries(data['$defs'])) {
        try {
          spec.types.push(await this.transformType(key, value as Record<string, any>));
          typeNames.push(key);
        } catch (error) {
        }
      }
    }

    if (this.isset(data['components']) && this.isset(data['components']['schemas']) && typeof data['components']['schemas'] === 'object') {
      for (const [key, value] of Object.entries(data['components']['schemas'])) {
        try {
          spec.types.push(await this.transformType(key, value as Record<string, any>));
          typeNames.push(key);
        } catch (error) {
        }
      }
    }

    if (this.isset(data['definitions']) && typeof data['definitions'] === 'object') {
      for (const [key, value] of Object.entries(data['definitions'])) {
        try {
          spec.types.push(await this.transformType(key, value as Record<string, any>));
          typeNames.push(key);
        } catch (error) {
        }
      }
    }

    for (const [key, value] of Object.entries(this.anonymousObjects)) {
      try {
        spec.types.push(await this.transformType(key, value));
        typeNames.push(key);
      } catch (error) {
      }
    }

    if (this.isset(data['properties']) && typeof data['properties'] === 'object') {
      // it looks like we have a root data we try to convert
      let key = 'Root';
      if (this.isset(data['title']) && typeof data['title'] === 'string') {
        key = pascalCase(data['title']);
      }

      spec.types.push(await this.transformType(key, {
        description: data['description'],
        type: 'object',
        properties: data['properties'],
      }));
      typeNames.push(key);
      spec.root = spec.types.length - 1;
    }

    if (this.isset(data['$ref']) && typeof data['$ref'] === 'string') {
      const index = typeNames.indexOf(data['$ref']);
      if (index !== -1) {
        spec.root = index;
      }
    }

    return spec;
  }

  private async transformImport(alias: string, data: any): Promise<Include|undefined> {
    if (typeof data !== 'string') {
      return;
    }

    if (!data.startsWith('typehub://')) {
      return;
    }

    const source = data.substring(10);
    const parts = source.split(':');
    const nameAndVersion = parts[1] || '';
    const nv = nameAndVersion.split('@')
    const user = parts[0] || '';
    const name = nv[0] || '';
    const version = nv[1] || '';

    const doc = await this.typeHubService.findDocument(user, name);
    if (!doc) {
      return;
    }

    const typeSchema = await this.typeHubService.export(user, name, version);
    if (!typeSchema) {
      return;
    }

    const spec = await this.transform(typeSchema);
    if (!spec) {
      return;
    }

    return {
      alias: alias,
      version: version,
      document: doc,
      types: spec.types ?? [],
    };
  }

  protected async transformType(name: string, data: Record<string, any>): Promise<Type> {
    let type: Type;
    if (this.isset(data['$ref'])) {
      type = {
        type: 'reference',
        name: name,
        description: data['description'] && typeof data['description'] === 'string' ? data['description'] : '',
        //reference: data['$ref']
      };

      if (this.isset(data['$template'])) {
        type.template = data['$template'];
      }
    } else if (this.isset(data['additionalProperties'])) {
      type = {
        type: 'map',
        name: name,
        description: data['description'] && typeof data['description'] === 'string' ? data['description'] : '',
      };

      const refs = this.parseRef(data['additionalProperties']);
      if (refs.length > 0) {
        //type.reference = refs[0];
      }
    } else {
      if (this.isset(data['type']) && typeof data['type'] === 'string' && this.scalarTypes.includes(data['type'])) {
        throw new Error('Can not create scalar object');
      }

      type = {
        type: 'object',
        name: name,
        description: data['description'] && typeof data['description'] === 'string' ? data['description'] : '',
      };

      if (this.isset(data['$extends']) && typeof data['$extends'] === 'string') {
        type.parent = data['$extends'];
      }

      if (this.isset(data['properties']) && typeof data['properties'] === 'object') {
        type.properties = [];
        for (const [key, value] of Object.entries(data['properties'])) {
          try {
            type.properties.push(await this.transformProperty(key, value as Record<string, any>));
          } catch (error) {
          }
        }
      }
    }

    return type;
  }

  private async transformProperty(name: string, data: Record<string, any>): Promise<Property> {
    let refs: Array<string> = [];
    let type;
    let format, pattern, minLength, maxLength, minimum, maximum;
    let i;
    if (this.isset(data['properties'])) {
      // in this case we have a nested object which is not supported at TypeAPI we automatically create an anonymous
      // object and use a reference
      const hash = await this.hash(JSON.stringify(data));
      const anonymousName = 'Object' + hash.substring(0, 8);
      this.anonymousObjects[anonymousName] = data;

      type = 'object';
      refs = refs.concat([anonymousName]);
    } else if (this.isset(data['additionalProperties'])) {
      type = 'map';
      refs = refs.concat(this.parseRef(data['additionalProperties']));
    } else if (this.isset(data['items'])) {
      type = 'array';
      refs = refs.concat(this.parseRef(data['items']));
    } else if (this.isset(data['oneOf']) && Array.isArray(data['oneOf'])) {
      type = 'union';
      for (i = 0; i < data['oneOf'].length; i++) {
        refs = refs.concat(this.parseRef(data['oneOf'][i]));
      }
    } else if (this.isset(data['allOf']) && Array.isArray(data['allOf'])) {
      type = 'intersection';
      for (i = 0; i < data['allOf'].length; i++) {
        refs = refs.concat(this.parseRef(data['allOf'][i]));
      }
    } else if (this.isset(data['$ref'])) {
      type = 'object';
      refs = refs.concat(this.parseRef(data));
    } else if (data['type'] === 'string') {
      type = 'string';
      if (this.isset(data['format'])) {
        format = data['format'];
      }
      if (this.isset(data['pattern'])) {
        pattern = data['pattern'];
      }
      if (this.isset(data['minLength'])) {
        minLength = data['minLength'];
      }
      if (this.isset(data['maxLength'])) {
        maxLength = data['maxLength'];
      }
    } else if (data['type'] === 'integer') {
      type = 'integer';
      if (this.isset(data['minimum'])) {
        minimum = data['minimum'];
      }
      if (this.isset(data['maximum'])) {
        maximum = data['maximum'];
      }
    } else if (data['type'] === 'number') {
      type = 'number';
      if (this.isset(data['minimum'])) {
        minimum = data['minimum'];
      }
      if (this.isset(data['maximum'])) {
        maximum = data['maximum'];
      }
    } else if (data['type'] === 'boolean') {
      type = 'boolean';
    } else if (data['type'] === 'any') {
      type = 'any';
    } else {
      throw new Error('Could not resolve type: ' + JSON.stringify(data));
    }

    const property: Property = {
      name: name,
      description: data['description'] && typeof data['description'] === 'string' ? data['description'] : '',
      type: type,
    };

    if (this.isset(data['deprecated']) && typeof data['deprecated'] === 'boolean') {
      property.deprecated = data['deprecated'];
    }

    if (this.isset(format) && typeof format === 'string') {
      property.format = format;
    }

    if (refs.length > 0) {
      property.reference = refs[0];
    }

    return property;
  }

  protected parseRef(data: any): Array<string> {
    if (this.isset(data.$ref) && typeof data.$ref === 'string') {
      return [this.normalizeRef(data.$ref)];
    } else if (this.isset(data.$generic)) {
      return ['T'];
    } else if (this.isset(data.oneOf) && Array.isArray(data.oneOf)) {
      let result = new Array<string>();
      for (let i = 0; i < data.oneOf.length; i++) {
        result = result.concat(this.parseRef(data.oneOf[i]));
      }
      return result;
    } else if (this.scalarTypes.includes(data.type)) {
      return [data.type];
    } else if (data.type === 'array') {
      // at the moment we can not handle array inside maps but we simply return the array type
      return this.parseRef(data.items);
    } else {
      throw new Error('Could not resolve ref: ' + JSON.stringify(data));
    }
  }

  protected isset(value: any): boolean {
    return typeof value !== 'undefined' && value !== null;
  }

  protected normalizeRef(ref: string): string {
    return ref
      .replace('#/definitions/', '')
      .replace('#/$defs/', '');
  }

  protected async hash(data: string): Promise<string> {
    const buffer = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(data));
    return Array.from(new Uint8Array(buffer))
      .map((bytes) => bytes.toString(16).padStart(2, '0'))
      .join('');
  }

}
